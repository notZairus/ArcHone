import jsParser from "../parser/javascript.js";

export default function analyzeJavaScript(sourceCode) {
  const tree = jsParser(sourceCode);
  const result = analyzeTree(tree, sourceCode);
  return result;
}

// --- helpers --- //

const analyzeTree = (tree, sourceCode) => {
  const functions = [];
  const variables = [];
  const comments = [];
  const issues = [];

  const declarationNodeKeys = new Set();
  const identifierUsageCount = new Map();
  const variableNameDeclarationCount = new Map();
  const functionDeclarationNames = [];

  traverseTree(tree.rootNode, (node, parent) => {
    if (node.type === "comment") {
      comments.push({
        line: getLine(node),
        text: getNodeText(node, sourceCode).trim(),
      });
      return;
    }

    if (node.type === "function_declaration") {
      const nameNode = node.childForFieldName("name");
      const name = nameNode ? getNodeText(nameNode, sourceCode) : "(anonymous)";

      if (nameNode) {
        declarationNodeKeys.add(getNodeKey(nameNode));
        functionDeclarationNames.push({ name, line: getLine(nameNode) });
      }

      functions.push(buildFunctionData(node, name));
      return;
    }

    if (node.type === "function_expression" || node.type === "arrow_function") {
      const inferredNameNode = inferFunctionNameNode(node, parent);
      const inferredName = inferredNameNode
        ? getNodeText(inferredNameNode, sourceCode)
        : "(anonymous)";

      if (inferredNameNode) {
        declarationNodeKeys.add(getNodeKey(inferredNameNode));
      }

      functions.push(buildFunctionData(node, inferredName));
      return;
    }

    if (node.type === "variable_declarator") {
      const nameField = node.childForFieldName("name");
      const valueField = node.childForFieldName("value");
      const kind = inferVariableKind(parent);
      const dataType = inferVariableDataType(valueField, sourceCode);

      for (const idNode of extractIdentifiersFromPattern(nameField)) {
        const variableName = getNodeText(idNode, sourceCode);

        declarationNodeKeys.add(getNodeKey(idNode));
        variables.push({
          name: variableName,
          kind,
          dataType,
          line: getLine(idNode),
        });

        variableNameDeclarationCount.set(
          variableName,
          (variableNameDeclarationCount.get(variableName) || 0) + 1,
        );
      }

      return;
    }

    if (
      node.type === "identifier" ||
      node.type === "shorthand_property_identifier"
    ) {
      const key = getNodeKey(node);
      if (declarationNodeKeys.has(key)) {
        return;
      }

      const identifierName = getNodeText(node, sourceCode);
      identifierUsageCount.set(
        identifierName,
        (identifierUsageCount.get(identifierName) || 0) + 1,
      );
    }
  });

  for (const variable of variables) {
    const usageCount = identifierUsageCount.get(variable.name) || 0;

    if (usageCount === 0) {
      issues.push({
        title: "Unused Variable",
        type: "warning",
        line: variable.line,
        message: `\`${variable.name}\` might bewww declared but never used.`,
        suggestion: "Delete it if unnecessary, or use it where needed.",
        why: "Unused variables create noise and make code harder to read.",
      });
    }

    if (variable.kind === "var") {
      issues.push({
        title: "Use of var",
        type: "improvement",
        line: variable.line,
        message: `\`${variable.name}\` uses \`var\`, which can cause confusing scope behavior.`,
        suggestion:
          "Use `const` by default, and `let` when reassignment is needed.",
        why: "Block-scoped variables (`let`/`const`) are safer in modern JavaScript.",
      });
    }

    if (isPoorVariableName(variable.name)) {
      issues.push({
        title: "Poor Variable Naming",
        type: "improvement",
        line: variable.line,
        message: `Variable name \`${variable.name}\` is unclear.`,
        suggestion:
          "Use a descriptive name like `userCount`, `isValid`, or `totalPrice`.",
        why: "Clear names help new contributors understand code faster.",
      });
    }

    if (!isCamelCaseName(variable.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: variable.line,
        message: `Variable name \`${variable.name}\` should use camelCase.`,
        suggestion:
          "Rename it to camelCase (for example, `totalScore`, `isValidUser`).",
        why: "Consistent camelCase naming improves readability in JavaScript codebases.",
      });
    }
  }

  for (const fn of functionDeclarationNames) {
    const usageCount = identifierUsageCount.get(fn.name) || 0;

    if (usageCount === 0) {
      issues.push({
        title: "Unused Function",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` might be declared but never used.`,
        suggestion: "Remove it, export it, or invoke it where required.",
        why: "Dead code increases maintenance cost.",
      });
    }

    if (!isCamelCaseName(fn.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: fn.line,
        message: `Function name \`${fn.name}\` should use camelCase.`,
        suggestion:
          "Rename it to camelCase (for example, `parseScores`, `analyzeResults`).",
        why: "Consistent camelCase naming makes JavaScript APIs easier to scan and use.",
      });
    }
  }

  for (const [name, count] of variableNameDeclarationCount.entries()) {
    if (count > 1) {
      const firstDecl = variables.find((v) => v.name === name);
      issues.push({
        title: "Name Reuse",
        type: "improvement",
        line: firstDecl ? firstDecl.line : 1,
        message: `Variable name \`${name}\` is reused ${count} times.`,
        suggestion: "Use more specific names to avoid shadowing/confusion.",
        why: "Repeated names can hide bugs and make debugging harder.",
      });
    }
  }

  for (const fn of functions) {
    if (fn.lines > 80) {
      issues.push({
        title: "Function Too Long",
        type: "improvement",
        line: fn.line,
        functionName: fn.name,
        functionLines: fn.lines,
        message: `Function \`${fn.name}\` is long (${fn.lines} lines).`,
        suggestion: "Split into smaller functions.",
        why: "Shorter functions are easier to test, debug, and reuse.",
      });
    }

    if (fn.parameterCount > 4) {
      issues.push({
        title: "Too Many Parameters",
        type: "improvement",
        line: fn.line,
        message: `Function \`${fn.name}\` has many parameters (${fn.parameterCount}).`,
        suggestion: "Consider grouping parameters into an options object.",
        why: "Too many parameters increase the chance of passing values in the wrong order.",
      });
    }

    if (fn.complexity > 8) {
      issues.push({
        title: "High Complexity",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` has high branching complexity (${fn.complexity}).`,
        suggestion: "Reduce branching and extract condition blocks.",
        why: "Complex branches are harder for beginners to understand and validate.",
      });
    }

    if (fn.maxNesting > 3) {
      issues.push({
        title: "Deep Nesting",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` has deep nesting (level ${fn.maxNesting}).`,
        suggestion: "Use early return to simplify logic.",
        why: "Deep nesting makes control flow difficult to follow.",
      });
    }
  }

  for (const comment of comments) {
    if (/TODO|FIXME|HACK/i.test(comment.text)) {
      issues.push({
        title: "TODO Comment",
        type: "info",
        line: comment.line,
        message: "Found TODO/FIXME/HACK comment.",
        suggestion: "Resolve unfinished tasks.",
        why: "Pending TODOs can become hidden bugs when ignored.",
      });
    }

    if (looksLikeCommentedCode(comment.text)) {
      issues.push({
        title: "Commented-out Code",
        type: "improvement",
        line: comment.line,
        message: "Comment appears to contain disabled code.",
        suggestion:
          "Prefer deleting dead code and using git history for recovery.",
        why: "Commented-out code adds clutter and is often outdated.",
      });
    }
  }

  return {
    functions,
    variables,
    comments,
    issues,
  };
};

const buildFunctionData = (node, name) => {
  const parametersNode = node.childForFieldName("parameters");
  const parameterCount = countParameterIdentifiers(parametersNode);
  const complexity = estimateCyclomaticComplexity(node);
  const maxNesting = estimateMaxNesting(node);

  return {
    name,
    line: getLine(node),
    lines: node.endPosition.row - node.startPosition.row + 1,
    parameterCount,
    complexity,
    maxNesting,
  };
};

const inferFunctionNameNode = (node, parent) => {
  if (!parent) {
    return null;
  }

  if (parent.type === "variable_declarator") {
    return parent.childForFieldName("name");
  }

  if (parent.type === "assignment_expression") {
    return parent.childForFieldName("left");
  }

  if (parent.type === "pair") {
    return parent.childForFieldName("key");
  }

  return node.childForFieldName("name");
};

const inferVariableKind = (parent) => {
  if (!parent) {
    return "unknown";
  }

  if (
    parent.type === "variable_declaration" ||
    parent.type === "lexical_declaration"
  ) {
    const kindNode = parent.firstChild;
    return kindNode ? kindNode.type : "unknown";
  }

  if (
    parent.parent &&
    (parent.parent.type === "variable_declaration" ||
      parent.parent.type === "lexical_declaration")
  ) {
    const kindNode = parent.parent.firstChild;
    return kindNode ? kindNode.type : "unknown";
  }

  return "unknown";
};

const inferVariableDataType = (valueNode, sourceCode) => {
  if (!valueNode) {
    return "unknown";
  }

  if (valueNode.type === "parenthesized_expression") {
    const expressionNode = valueNode.childForFieldName("expression");
    return inferVariableDataType(expressionNode, sourceCode);
  }

  if (valueNode.type === "string" || valueNode.type === "template_string") {
    return "string";
  }

  if (valueNode.type === "number") {
    return "number";
  }

  if (valueNode.type === "true" || valueNode.type === "false") {
    return "boolean";
  }

  if (valueNode.type === "null") {
    return "null";
  }

  if (valueNode.type === "array") {
    return "array";
  }

  if (valueNode.type === "object") {
    return "object";
  }

  if (
    valueNode.type === "function" ||
    valueNode.type === "function_expression" ||
    valueNode.type === "arrow_function"
  ) {
    return "function";
  }

  if (valueNode.type === "new_expression") {
    return "instance";
  }

  if (valueNode.type === "regex") {
    return "regexp";
  }

  if (valueNode.type === "identifier") {
    const text = getNodeText(valueNode, sourceCode);

    if (text === "undefined") {
      return "undefined";
    }

    if (text === "NaN" || text === "Infinity") {
      return "number";
    }
  }

  return "unknown";
};

const countParameterIdentifiers = (parametersNode) => {
  if (!parametersNode) {
    return 0;
  }

  return extractIdentifiersFromPattern(parametersNode).length;
};

const estimateCyclomaticComplexity = (functionNode) => {
  const complexityNodes = new Set([
    "if_statement",
    "for_statement",
    "for_in_statement",
    "while_statement",
    "do_statement",
    "switch_case",
    "catch_clause",
    "ternary_expression",
  ]);

  let complexity = 1;

  traverseTree(functionNode, (node) => {
    if (complexityNodes.has(node.type)) {
      complexity += 1;
    }
  });

  return complexity;
};

const estimateMaxNesting = (functionNode) => {
  const nestingNodes = new Set([
    "if_statement",
    "for_statement",
    "for_in_statement",
    "for_of_statement",
    "while_statement",
    "do_statement",
    "switch_statement",
    "try_statement",
    "catch_clause",
  ]);

  const walk = (node, level) => {
    const shouldIncreaseLevel = nestingNodes.has(node.type);
    const nextLevel = shouldIncreaseLevel ? level + 1 : level;
    let maxLevel = nextLevel;

    for (let i = 0; i < node.childCount; i += 1) {
      maxLevel = Math.max(maxLevel, walk(node.child(i), nextLevel));
    }

    return maxLevel;
  };

  return walk(functionNode, 0);
};

const isPoorVariableName = (name) => {
  const genericNames = new Set([
    "a",
    "b",
    "c",
    "x",
    "y",
    "z",
    "foo",
    "bar",
    "baz",
    "tmp",
    "temp",
    "data",
    "obj",
    "arr",
    "item",
    "value",
    "val",
    "res",
    "result1",
    "data1",
  ]);

  if (["i", "j", "k"].includes(name)) {
    return false;
  }

  if (name.length <= 2) {
    return true;
  }

  if (genericNames.has(name.toLowerCase())) {
    return true;
  }

  return /^(tmp|temp|data|value|item|obj|arr)[0-9]+$/i.test(name);
};

const isCamelCaseName = (name) => {
  return /^[a-z][A-Za-z0-9]*$/.test(name);
};

const looksLikeCommentedCode = (commentText) => {
  const normalized = commentText.replace(/^\s*\/+\s?/, "").trim();
  if (normalized.length === 0) {
    return false;
  }

  return /(const|let|var|function|class|if\s*\(|for\s*\(|while\s*\(|return\s+|=>|;|\{\s*\})/.test(
    normalized,
  );
};

const getNodeText = (node, sourceCode) => {
  return sourceCode.slice(node.startIndex, node.endIndex);
};

const getNodeKey = (node) => {
  return `${node.startIndex}:${node.endIndex}:${node.type}`;
};

const getLine = (node) => {
  return node.startPosition.row + 1;
};

const traverseTree = (node, callback, parent = null) => {
  callback(node, parent);

  for (let i = 0; i < node.childCount; i += 1) {
    traverseTree(node.child(i), callback, node);
  }
};

const extractIdentifiersFromPattern = (node) => {
  if (!node) {
    return [];
  }

  if (node.type === "identifier") {
    return [node];
  }

  const identifiers = [];
  for (let i = 0; i < node.childCount; i += 1) {
    identifiers.push(...extractIdentifiersFromPattern(node.child(i)));
  }
  return identifiers;
};
