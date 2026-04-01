import analysisParser from "../parser/analysis-parser.js";

export default async function analyzeJavaScript(sourceCode, fileExtenstion) {
  const tree = await analysisParser(sourceCode, fileExtenstion);
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
  const variableNameDeclarationByScope = new Map();
  const functionDeclarationNames = [];

  traverseTree(tree.rootNode, (node, parent) => {
    if (node.type === "comment") {
      comments.push({
        line: getLine(node),
        text: getNodeText(node, sourceCode).trim(),
        code: getNodeText(node, sourceCode),
      });
      return;
    }

    if (node.type === "function_declaration") {
      const nameNode = node.childForFieldName("name");
      const name = nameNode ? getNodeText(nameNode, sourceCode) : "(anonymous)";
      const isExported = isExportedDeclaration(node);

      if (nameNode) {
        declarationNodeKeys.add(getNodeKey(nameNode));
        functionDeclarationNames.push({
          name,
          line: getLine(nameNode),
          isExported,
          code: getNodeText(node, sourceCode),
        });
      }

      functions.push(buildFunctionData(node, name, sourceCode));
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

      functions.push(buildFunctionData(node, inferredName, sourceCode));
      return;
    }

    if (node.type === "variable_declarator") {
      const nameField = node.childForFieldName("name");
      const valueField = node.childForFieldName("value");
      const kind = inferVariableKind(parent);
      const dataType = inferVariableDataType(valueField, sourceCode);
      const isExported = isExportedDeclaration(node);

      for (const idNode of extractIdentifiersFromPattern(nameField)) {
        const variableName = getNodeText(idNode, sourceCode);
        const scopeKey = getDeclarationScopeKey(node, kind);
        const scopeNameKey = `${scopeKey}::${variableName}`;

        declarationNodeKeys.add(getNodeKey(idNode));
        variables.push({
          name: variableName,
          kind,
          dataType,
          line: getLine(idNode),
          scopeKey,
          isExported,
          code: getVariableDeclarationCode(node, sourceCode),
        });

        const existing = variableNameDeclarationByScope.get(scopeNameKey);
        if (!existing) {
          variableNameDeclarationByScope.set(scopeNameKey, {
            name: variableName,
            scopeKey,
            count: 1,
            firstLine: getLine(idNode),
            code: getVariableDeclarationCode(node, sourceCode),
          });
        } else {
          existing.count += 1;
        }
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

    if (usageCount === 0 && !variable.isExported) {
      issues.push({
        title: "Unused Variable",
        type: "warning",
        line: variable.line,
        message: `You created \`${variable.name}\`, but your code never uses it.`,
        suggestion:
          "Delete this variable if you do not need it, or use it in your code where it belongs.",
        why: "Extra unused variables make code harder to read because people waste time trying to understand them.",
        code: variable.code,
      });
    }

    if (variable.kind === "var") {
      issues.push({
        title: "Use of var",
        type: "improvement",
        line: variable.line,
        message: `\`${variable.name}\` uses \`var\`, which can be confusing in JavaScript.`,
        suggestion:
          "Use `const` by default. Use `let` only when the value needs to change.",
        why: "`let` and `const` are safer and easier for beginners to understand than `var`.",
        code: variable.code,
      });
    }

    if (isPoorVariableName(variable.name)) {
      issues.push({
        title: "Poor Variable Naming",
        type: "improvement",
        line: variable.line,
        message: `The variable name \`${variable.name}\` is not clear.`,
        suggestion:
          "Rename it to something more descriptive, like `userCount`, `isValid`, or `totalPrice`.",
        why: "Clear names help you and others understand the code faster.",
        code: variable.code,
      });
    }

    if (!isCamelCaseName(variable.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: variable.line,
        message: `Variable name \`${variable.name}\` is not written in camelCase.`,
        suggestion:
          "Rename it to camelCase, for example `totalScore` or `isValidUser`.",
        why: "Using one naming style keeps code neat and easier to scan.",
        code: variable.code,
      });
    }
  }

  for (const fn of functionDeclarationNames) {
    const usageCount = identifierUsageCount.get(fn.name) || 0;

    if (usageCount === 0 && !fn.isExported) {
      issues.push({
        title: "Unused Function",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` is never called in your code.`,
        suggestion:
          "Remove the function if you do not need it, or call it where it should be used.",
        why: "Unused functions add clutter and can confuse readers about what really runs.",
        code: fn.code,
      });
    }

    if (!isCamelCaseName(fn.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: fn.line,
        message: `Function name \`${fn.name}\` is not written in camelCase.`,
        suggestion:
          "Rename it to camelCase, for example `parseScores` or `analyzeResults`.",
        why: "Consistent function names make your code easier to read.",
        code: fn.code,
      });
    }
  }

  for (const declaration of variableNameDeclarationByScope.values()) {
    if (declaration.count > 1) {
      issues.push({
        title: "Name Reuse",
        type: "improvement",
        line: declaration.firstLine,
        message: `Variable name \`${declaration.name}\` appears ${declaration.count} times in the same scope.`,
        suggestion:
          "Use different names for different values so each one has a clear purpose.",
        why: "Reusing names can cause mistakes and makes debugging harder.",
        code: declaration.code,
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
        message: `Function \`${fn.name}\` is very long (${fn.lines} lines).`,
        suggestion:
          "Split this function into smaller helper functions with clear names.",
        why: "Shorter functions are easier to understand, test, and fix.",
        code: fn.code,
      });
    }

    if (fn.parameterCount > 4) {
      issues.push({
        title: "Too Many Parameters",
        type: "improvement",
        line: fn.line,
        message: `Function \`${fn.name}\` has many parameters (${fn.parameterCount}).`,
        suggestion:
          "Group related parameters into one object to make function calls simpler.",
        why: "Too many parameters are easy to mix up and hard to remember.",
        code: fn.code,
      });
    }

    if (fn.complexity > 8) {
      issues.push({
        title: "High Complexity",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` has complex logic with many branches (${fn.complexity}).`,
        suggestion:
          "Simplify conditions and move parts of the logic into smaller helper functions.",
        why: "Complex code is harder to test and easier to break by accident.",
        code: fn.code,
      });
    }

    if (fn.maxNesting > 3) {
      issues.push({
        title: "Deep Nesting",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` has deep nesting (level ${fn.maxNesting}).`,
        suggestion:
          "Use early returns and helper functions to flatten nested blocks.",
        why: "Deep nesting is hard to read because you must track many levels at once.",
        code: fn.code,
      });
    }
  }

  for (const comment of comments) {
    if (/TODO|FIXME|HACK/i.test(comment.text)) {
      issues.push({
        title: "TODO Comment",
        type: "info",
        line: comment.line,
        message:
          "Found a TODO/FIXME/HACK comment. This usually means the work is not finished.",
        suggestion:
          "Write a short note about what is missing, then finish or remove this TODO as soon as you can.",
        why: "Old TODO comments are easy to forget and may turn into bugs later.",
        code: comment.code,
      });
    }

    if (looksLikeCommentedCode(comment.text)) {
      issues.push({
        title: "Commented-out Code",
        type: "improvement",
        line: comment.line,
        message:
          "This comment looks like old disabled code, not an explanation.",
        suggestion:
          "Delete commented-out code. Keep comments for explanations only.",
        why: "Old code in comments makes the real code harder to read.",
        code: comment.code,
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

const buildFunctionData = (node, name, sourceCode) => {
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
    code: getNodeText(node, sourceCode),
  };
};

const getVariableDeclarationCode = (declaratorNode, sourceCode) => {
  if (!declaratorNode) {
    return "";
  }

  const declarationNode = declaratorNode.parent;
  if (
    declarationNode &&
    (declarationNode.type === "variable_declaration" ||
      declarationNode.type === "lexical_declaration")
  ) {
    return getNodeText(declarationNode, sourceCode);
  }

  return getNodeText(declaratorNode, sourceCode);
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

const isExportedDeclaration = (node) => {
  let current = node;

  while (current) {
    if (
      current.type === "export_statement" ||
      current.type === "export_clause" ||
      current.type === "export_specifier"
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
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

const getDeclarationScopeKey = (declaratorNode, variableKind) => {
  const scopeNode = findDeclarationScopeNode(declaratorNode, variableKind);
  return getNodeKey(scopeNode);
};

const findDeclarationScopeNode = (node, variableKind) => {
  const varScopeTypes = new Set([
    "program",
    "function_declaration",
    "function_expression",
    "arrow_function",
    "generator_function_declaration",
    "generator_function",
    "method_definition",
  ]);

  const lexicalScopeTypes = new Set([
    "program",
    "statement_block",
    "for_statement",
    "for_in_statement",
    "for_of_statement",
    "switch_statement",
    "catch_clause",
  ]);

  const scopeTypes = variableKind === "var" ? varScopeTypes : lexicalScopeTypes;

  let current = node;
  while (current) {
    if (scopeTypes.has(current.type)) {
      return current;
    }

    current = current.parent;
  }

  return node;
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
  if (/^[A-Z0-9_]+$/.test(name)) {
    return true;
  }
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
