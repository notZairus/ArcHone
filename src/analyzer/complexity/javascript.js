export default function analyzeComplexityJS(tree, sourceCode) {
  const functions = [];
  const issues = [];
  const comments = [];

  traverseTree(tree.rootNode, (node, parent) => {
    if (node.type === "comment") {
      comments.push({
        line: getLine(node),
        text: getNodeText(node, sourceCode).trim(),
        code: getNodeText(node, sourceCode),
      });
      return;
    }

    if (
      node.type === "function_declaration" ||
      node.type === "function_expression" ||
      node.type === "arrow_function"
    ) {
      const nameNode = node.childForFieldName && node.childForFieldName("name");
      const inferredName = nameNode
        ? getNodeText(nameNode, sourceCode)
        : inferFunctionName(node, parent, sourceCode) || "(anonymous)";
      const fn = analyzeFunctionNode(node, inferredName, sourceCode);
      functions.push(fn);
      return;
    }
  });

  // Build a summary
  const fileSummary = buildFileSummary(functions);

  // Optionally push high-cost issues
  for (const fn of functions) {
    if (fn.time.class === "polynomial" && fn.time.exponent >= 3) {
      issues.push({
        title: "High Time Complexity",
        type: "warning",
        line: fn.line,
        message: `Estimated time complexity ${fn.time.estimate}`,
        suggestion:
          "Consider reducing nesting or using a more efficient algorithm.",
        code: fn.code,
        penalty: 2.0,
      });
    }
    if (fn.time.class === "exponential") {
      issues.push({
        title: "Exponential Time Complexity",
        type: "warning",
        line: fn.line,
        message: `Estimated time complexity ${fn.time.estimate}`,
        suggestion:
          "Consider memoization, dynamic programming, or an iterative approach.",
        code: fn.code,
        penalty: 3.0,
      });
    }
    if (fn.space && fn.space.class === "polynomial" && fn.space.exponent >= 2) {
      issues.push({
        title: "High Space Complexity",
        type: "warning",
        line: fn.line,
        message: `Estimated space complexity ${fn.space.estimate}`,
        suggestion: "Avoid creating large temporary structures inside loops.",
        code: fn.code,
        penalty: 1.5,
      });
    }
  }

  return {
    functions,
    variables: [],
    comments,
    issues,
    complexitySummary: {
      functions,
      fileSummary,
    },
  };
}

// --- Function analysis ---
const analyzeFunctionNode = (node, name, sourceCode) => {
  const line = getLine(node);
  const code = getNodeText(node, sourceCode);
  const body = node.childForFieldName ? node.childForFieldName("body") : null;

  // detect loops and helpers
  const loops = [];
  const builtinIterationCallDepths = [];
  const builtinMethodCalls = new Set();
  const allocations = [];
  let hasSort = false;
  let recursionCalls = 0;

  traverseTree(body || node, (n, parent) => {
    if (isLoopNode(n)) {
      loops.push({ node: n, iter: detectIteratedIdentifier(n) });
    }

    if (n.type === "call_expression") {
      const callee = n.child(0);
      const calleeText = callee ? getNodeText(callee, sourceCode) : "";
      // treat built-in array helpers as O(1) helpers for time complexity
      if (callee && callee.type === "member_expression") {
        const prop =
          callee.childForFieldName && callee.childForFieldName("property");
        const propText = prop ? getNodeText(prop, sourceCode) : "";
        if (
          [
            "forEach",
            "map",
            "filter",
            "reduce",
            "some",
            "every",
            "flatMap",
            "sort",
            "split",
            "push",
            "unshift",
            "concat",
            "splice",
          ].includes(propText)
        ) {
          builtinMethodCalls.add(propText);
          if (
            [
              "forEach",
              "map",
              "filter",
              "reduce",
              "some",
              "every",
              "flatMap",
            ].includes(propText)
          ) {
            builtinIterationCallDepths.push(computeAncestorLoopDepth(n));
          }
        }
        if (propText === "sort") {
          hasSort = true;
        }
        if (propText === "split") {
          allocations.push({ kind: propText, node: n });
        }
        if (["push", "unshift", "concat", "splice"].includes(propText)) {
          allocations.push({ kind: propText, node: n });
        }
      }

      // recursion detection
      const calleeName = getCalleeText(n, sourceCode);
      if (calleeName && calleeName === name) {
        recursionCalls += 1;
      }
    }
  });

  // compute exponent from loops and array-iterating built-ins
  const nestingExponents = loops.map((l) => computeLoopNestingDepth(l.node));
  const maxNesting = nestingExponents.length
    ? Math.max(...nestingExponents)
    : 0;
  const loopExponent = nestingExponents.reduce((a, b) => Math.max(a, b), 0);
  const builtinExponent = builtinIterationCallDepths.length
    ? Math.max(...builtinIterationCallDepths)
    : 0;
  let exponent = Math.max(loopExponent, builtinExponent);

  // recursion heuristics
  let recursionNote = null;
  let recursionOverride = null; // { estimate, class, confidence } — set for multi-recursion cases

  if (recursionCalls > 0) {
    if (recursionCalls === 1 && exponent === 0) {
      // naive: single recursive call, no other loop work -> treat as O(n)
      exponent = Math.max(exponent, 1);
      recursionNote = { type: "linear-recursion", confidence: "medium" };
    } else if (recursionCalls >= 2) {
      // Two or more recursive calls: either divide-and-conquer (merge sort,
      // quicksort-ish) or naive exponential branching (fibonacci, etc).
      // Heuristic: if there's linear work outside the recursion itself
      // (a loop or an array built-in like a merge loop), assume the
      // classic T(n) = 2T(n/2) + O(n) shape -> O(n log n).
      // Otherwise assume unchecked branching -> exponential.
      const hasLinearWorkOutsideRecursion =
        loops.length > 0 || builtinMethodCalls.size > 0;

      if (hasLinearWorkOutsideRecursion) {
        recursionNote = { type: "divide-and-conquer", confidence: "low" };
        recursionOverride = {
          estimate: "O(n log n)",
          class: "linearithmic",
          confidence: "low",
        };
      } else {
        recursionNote = { type: "multi-recursion", confidence: "low" };
        recursionOverride = {
          estimate: "O(2^n)",
          class: "exponential",
          confidence: "low",
        };
      }
    } else {
      recursionNote = { type: "multi-recursion", confidence: "low" };
    }
  }

  // estimate time
  let time =
    exponent === 0
      ? { estimate: "O(1)", class: "constant", confidence: "high" }
      : exponent === 1 && hasSort
        ? { estimate: "O(n log n)", class: "linearithmic", confidence: "high" }
        : {
            estimate: exponent === 1 ? "O(n)" : `O(n^${exponent})`,
            class: exponent === 1 ? "linear" : "polynomial",
            exponent,
            confidence: exponent === 1 ? "high" : "medium",
          };

  if (hasSort && exponent <= 1) {
    // prefer n log n when sort detected and no nesting
    time = {
      estimate: "O(n log n)",
      class: "linearithmic",
      confidence: "high",
    };
  }

  // recursion-based override takes priority over the loop-based guess,
  // but never overrides an explicit .sort() detection (higher confidence)
  if (recursionOverride && !hasSort) {
    time = recursionOverride;
  }

  // estimate space
  let space = { estimate: "O(1)", class: "constant", confidence: "high" };
  if (allocations.length > 0) {
    // if allocation inside loop, assume O(n)
    space = {
      estimate: exponent >= 2 ? `O(n^${exponent})` : "O(n)",
      class: exponent >= 2 ? "polynomial" : "linear",
      exponent: exponent >= 2 ? exponent : 1,
      confidence: "medium",
    };
  }
  if (recursionOverride && recursionOverride.class === "linearithmic") {
    // divide-and-conquer typically also implies O(log n) or O(n) call-stack /
    // temp-array space; nudge space estimate up if it was still O(1)
    if (space.class === "constant") {
      space = {
        estimate: "O(n)",
        class: "linear",
        exponent: 1,
        confidence: "low",
      };
    }
  }

  const reasoning = [];
  if (loops.length)
    reasoning.push(
      `${loops.length} loop(s) detected, max nesting ${maxNesting}`,
    );
  if (builtinMethodCalls.size)
    reasoning.push(
      `Built-in array methods treated as O(n): ${Array.from(builtinMethodCalls).join(", ")}`,
    );
  if (hasSort) reasoning.push("Sort detected — treated as O(n log n)");
  if (allocations.length)
    reasoning.push("Allocations detected — space may grow with input");
  if (recursionNote)
    reasoning.push(
      `Recursion detected (${recursionNote.type}) with confidence ${recursionNote.confidence}`,
    );

  return {
    name,
    line,
    code,
    time,
    space,
    reasoning,
  };
};

// Helpers
const isLoopNode = (node) => {
  if (!node) return false;
  return [
    "for_statement",
    "for_of_statement",
    "for_in_statement",
    "while_statement",
    "do_statement",
  ].includes(node.type);
};

const detectIteratedIdentifier = (loopNode) => {
  try {
    if (loopNode.type === "for_statement") {
      // detect condition with .length
      const cond =
        loopNode.childForFieldName && loopNode.childForFieldName("condition");
      if (cond) {
        const text = getNodeText(cond, loopNode.tree?.source || "");
        if (/\.length/.test(text)) return "collection";
      }
    }
    if (
      loopNode.type === "for_of_statement" ||
      loopNode.type === "for_in_statement"
    ) {
      const right =
        loopNode.childForFieldName && loopNode.childForFieldName("right");
      if (right && right.type === "identifier")
        return getNodeText(right, loopNode.tree?.source || "");
    }
  } catch (e) {
    return null;
  }
  return null;
};

const computeLoopNestingDepth = (loopNode) => {
  let depth = 1;
  let current = loopNode.parent;
  while (current) {
    if (isLoopNode(current)) depth += 1;
    current = current.parent;
  }
  return depth;
};

const computeAncestorLoopDepth = (node) => {
  let depth = 0;
  let current = node;
  while (current) {
    if (isLoopNode(current)) {
      depth += 1;
    }
    current = current.parent;
  }

  return depth || 1;
};

const getCalleeText = (callNode, source) => {
  if (!callNode) return null;
  const callee = callNode.child(0);
  if (!callee) return null;
  return getNodeText(callee, source);
};

const inferFunctionName = (node, parent, source) => {
  if (!parent) return null;
  if (parent.type === "variable_declarator") {
    const name = parent.childForFieldName && parent.childForFieldName("name");
    return name ? getNodeText(name, source) : null;
  }
  if (parent.type === "assignment_expression") {
    const left = parent.childForFieldName && parent.childForFieldName("left");
    return left && left.type === "identifier"
      ? getNodeText(left, source)
      : null;
  }
  return null;
};

const buildFileSummary = (functions) => {
  if (!functions || !functions.length) return {};
  let worstTime = functions[0];
  let worstSpace = functions[0];

  for (const f of functions) {
    if (rankTimeClass(f.time) > rankTimeClass(worstTime.time)) {
      worstTime = f;
    }
    if (rankSpaceClass(f.space) > rankSpaceClass(worstSpace.space)) {
      worstSpace = f;
    }
  }

  return {
    worstTime: {
      estimate: worstTime.time.estimate,
      confidence: worstTime.time.confidence,
      functions: [worstTime.name],
    },
    worstSpace: {
      estimate: worstSpace.space.estimate,
      confidence: worstSpace.space.confidence,
      functions: [worstSpace.name],
    },
  };
};

const rankSpaceClass = (space) => {
  switch (space?.class) {
    case "constant":
      return 1;
    case "linear":
      return 2;
    case "polynomial":
      return 3;
    default:
      return 0;
  }
};

const rankTimeClass = (time) => {
  if (!time) return 0;
  const cls = time.class || "constant";
  switch (cls) {
    case "constant":
      return 1;
    case "linear":
      return 2;
    case "linearithmic":
      return 3;
    case "polynomial":
      return 4;
    case "exponential":
      return 5;
    default:
      return 0;
  }
};

// small tree helpers copied from other analyzers
const getNodeText = (node, source) => {
  if (!node || !source) return "";
  return source.slice(node.startIndex, node.endIndex);
};

const getLine = (node) => {
  if (!node || !node.startPosition) return 0;
  return node.startPosition.row + 1;
};

const traverseTree = (node, callback, parent = null) => {
  if (!node) return;
  callback(node, parent);
  for (let i = 0; i < node.childCount; i += 1) {
    traverseTree(node.child(i), callback, node);
  }
};
