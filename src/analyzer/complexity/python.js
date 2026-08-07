export default function analyzeComplexityPy(tree, sourceCode) {
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

    if (node.type === "function_definition") {
      const nameNode = node.childForFieldName("name");
      const inferredName = nameNode
        ? getNodeText(nameNode, sourceCode)
        : inferFunctionName(node, parent, sourceCode) || "(anonymous)";
      functions.push(analyzeFunctionNode(node, inferredName, sourceCode));
    }
  });

  const fileSummary = buildFileSummary(functions);

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
    functions: [],
    variables: [],
    comments,
    issues,
    complexitySummary: {
      functions,
      fileSummary,
    },
  };
}

const analyzeFunctionNode = (node, name, sourceCode) => {
  const line = getLine(node);
  const code = getNodeText(node, sourceCode);
  const body = node.childForFieldName("body");

  const loops = [];
  const iterationCalls = [];
  const methodCalls = new Set();
  const allocations = [];
  let hasSort = false;
  let recursionCalls = 0;

  traverseTree(body || node, (n) => {
    if (isLoopNode(n)) {
      loops.push(n);
    }

    if (n.type === "call" || n.type === "call_expression") {
      const callee = n.child(0);
      const calleeText = callee ? getNodeText(callee, sourceCode) : "";

      if (calleeText) {
        const methodName = calleeText.split(".").pop();
        if (
          [
            "map",
            "filter",
            "sorted",
            "sum",
            "any",
            "all",
            "enumerate",
            "zip",
          ].includes(methodName)
        ) {
          methodCalls.add(methodName);
          iterationCalls.push(computeAncestorLoopDepth(n));
        }

        if (methodName === "sort" || methodName === "sorted") {
          hasSort = true;
          methodCalls.add(methodName);
          iterationCalls.push(computeAncestorLoopDepth(n));
        }

        if (methodName === "split" || methodName === "list") {
          allocations.push({ kind: methodName, node: n });
          methodCalls.add(methodName);
          iterationCalls.push(computeAncestorLoopDepth(n));
        }

        if (["append", "extend", "insert"].includes(methodName)) {
          allocations.push({ kind: methodName, node: n });
        }

        if (methodName === name) {
          recursionCalls += 1;
        }
      }
    }
  });

  const loopDepth = loops.length
    ? Math.max(...loops.map((loop) => computeLoopNestingDepth(loop)))
    : 0;
  const builtinDepth = iterationCalls.length ? Math.max(...iterationCalls) : 0;
  let exponent = Math.max(loopDepth, builtinDepth);

  let recursionNote = null;
  if (recursionCalls > 0) {
    if (recursionCalls === 1 && exponent === 0) {
      exponent = 1;
      recursionNote = { type: "linear-recursion", confidence: "medium" };
    } else {
      recursionNote = { type: "multi-recursion", confidence: "low" };
    }
  }

  const time =
    exponent === 0
      ? { estimate: "O(1)", class: "constant", confidence: "high" }
      : hasSort && exponent <= 1
        ? { estimate: "O(n log n)", class: "linearithmic", confidence: "high" }
        : {
            estimate: exponent === 1 ? "O(n)" : `O(n^${exponent})`,
            class: exponent === 1 ? "linear" : "polynomial",
            exponent,
            confidence: exponent === 1 ? "high" : "medium",
          };

  if (hasSort && exponent <= 1) {
    time.estimate = "O(n log n)";
    time.class = "linearithmic";
  }

  let space = { estimate: "O(1)", class: "constant", confidence: "high" };
  if (allocations.length > 0) {
    space = {
      estimate: exponent >= 2 ? `O(n^${exponent})` : "O(n)",
      class: exponent >= 2 ? "polynomial" : "linear",
      exponent: exponent >= 2 ? exponent : 1,
      confidence: "medium",
    };
  }

  const reasoning = [];
  if (loops.length) {
    reasoning.push(`${loops.length} loop(s) detected, max nesting ${loopDepth}`);
  }
  if (methodCalls.size) {
    reasoning.push(
      `Built-in iterable methods treated as O(n): ${Array.from(methodCalls).join(", ")}`,
    );
  }
  if (hasSort) {
    reasoning.push("Sort detected — treated as O(n log n)");
  }
  if (allocations.length) {
    reasoning.push("Allocations detected (split/list/append) — space may grow with input");
  }
  if (recursionNote) {
    reasoning.push(
      `Recursion detected (${recursionNote.type}) with confidence ${recursionNote.confidence}`,
    );
  }

  return {
    name,
    line,
    code,
    time,
    space,
    reasoning,
  };
};

const isLoopNode = (node) => {
  if (!node) return false;
  return ["for_statement", "while_statement"].includes(node.type);
};

const computeLoopNestingDepth = (loopNode) => {
  let depth = 1;
  let current = loopNode.parent;
  while (current) {
    if (isLoopNode(current)) {
      depth += 1;
    }
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

const inferFunctionName = (node, parent, sourceCode) => {
  if (!parent) return null;
  if (parent.type === "assignment") {
    const left = parent.childForFieldName("left");
    return left ? getNodeText(left, sourceCode) : null;
  }
  return null;
};

const buildFileSummary = (functions) => {
  if (!functions.length) return {};

  let worstTime = functions[0];
  let worstSpace = functions[0];

  for (const fn of functions) {
    if (rankTime(fn.time) > rankTime(worstTime.time)) {
      worstTime = fn;
    }
    if (rankSpace(fn.space) > rankSpace(worstSpace.space)) {
      worstSpace = fn;
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

const rankTime = (time) => {
  switch (time?.class) {
    case "constant":
      return 1;
    case "linear":
      return 2;
    case "linearithmic":
      return 3;
    case "polynomial":
      return 4;
    default:
      return 0;
  }
};

const rankSpace = (space) => {
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

const getNodeText = (node, sourceCode) => sourceCode.slice(node.startIndex, node.endIndex);
const getLine = (node) => node.startPosition.row + 1;
const traverseTree = (node, callback, parent = null) => {
  if (!node) return;
  callback(node, parent);
  for (let i = 0; i < node.childCount; i += 1) {
    traverseTree(node.child(i), callback, node);
  }
};
