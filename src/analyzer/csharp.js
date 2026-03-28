import analysisParser from "../parser/analysis-parser.js";

export default async function analyzeCSharp(sourceCode, fileExtension) {
  const tree = await analysisParser(sourceCode, fileExtension);
  const result = analyzeTree(tree, sourceCode);
  return result;
}

const analyzeTree = (tree, sourceCode) => {
  const functions = [];
  const variables = [];
  const comments = [];
  const issues = [];

  const declarationNodeKeys = new Set();
  const identifierUsageCount = new Map();
  const variableNameDeclarationCount = new Map();
  const variableNameDeclarationMeta = new Map();
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

    if (
      node.type === "method_declaration" ||
      node.type === "local_function_statement"
    ) {
      const nameNode = node.childForFieldName("name");
      const name = nameNode ? getNodeText(nameNode, sourceCode) : "(anonymous)";

      if (nameNode) {
        declarationNodeKeys.add(getNodeKey(nameNode));
        functionDeclarationNames.push({
          name,
          line: getLine(nameNode),
          isEntryPoint: isEntryPointMethod(node, sourceCode),
          code: getNodeText(node, sourceCode),
        });
      }

      const parametersNode = node.childForFieldName("parameters");
      for (const idNode of extractIdentifiersFromPattern(parametersNode)) {
        declarationNodeKeys.add(getNodeKey(idNode));
      }

      functions.push(buildFunctionData(node, name, sourceCode));
      return;
    }

    if (node.type === "lambda_expression") {
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
      const nameNode = node.childForFieldName("name");
      const valueNode = node.childForFieldName("value");
      const kind = inferVariableKind(parent);
      const dataType = inferVariableDataType(valueNode, sourceCode);

      for (const idNode of extractIdentifiersFromPattern(nameNode)) {
        const variableName = getNodeText(idNode, sourceCode);
        const scopeKey = getDeclarationScopeKey(idNode, kind);
        const declarationKey = `${scopeKey}::${variableName}`;

        declarationNodeKeys.add(getNodeKey(idNode));
        variables.push({
          name: variableName,
          kind,
          dataType,
          line: getLine(idNode),
          skipUnusedCheck: false,
          code: getNodeText(node.parent || node, sourceCode),
        });

        variableNameDeclarationCount.set(
          declarationKey,
          (variableNameDeclarationCount.get(declarationKey) || 0) + 1,
        );
        if (!variableNameDeclarationMeta.has(declarationKey)) {
          variableNameDeclarationMeta.set(declarationKey, {
            name: variableName,
            line: getLine(idNode),
            code: getNodeText(node.parent || node, sourceCode),
          });
        }
      }

      return;
    }

    if (node.type === "parameter") {
      const nameNode = node.childForFieldName("name");
      if (!nameNode) {
        return;
      }

      const variableName = getNodeText(nameNode, sourceCode);
      const scopeKey = getDeclarationScopeKey(nameNode, "parameter");
      const declarationKey = `${scopeKey}::${variableName}`;
      declarationNodeKeys.add(getNodeKey(nameNode));
      variables.push({
        name: variableName,
        kind: "parameter",
        dataType: "unknown",
        line: getLine(nameNode),
        skipUnusedCheck: shouldIgnoreUnusedParameter(node, sourceCode),
        code: getNodeText(node, sourceCode),
      });

      variableNameDeclarationCount.set(
        declarationKey,
        (variableNameDeclarationCount.get(declarationKey) || 0) + 1,
      );
      if (!variableNameDeclarationMeta.has(declarationKey)) {
        variableNameDeclarationMeta.set(declarationKey, {
          name: variableName,
          line: getLine(nameNode),
          code: getNodeText(node, sourceCode),
        });
      }
      return;
    }

    if (node.type === "identifier") {
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

    if (usageCount === 0 && !variable.skipUnusedCheck) {
      issues.push({
        title: "Unused Variable",
        type: "warning",
        line: variable.line,
        message: `\`${variable.name}\` might be declared but never used.`,
        suggestion: "Delete it if unnecessary, or use it where needed.",
        why: "Unused variables create noise and make code harder to read.",
        code: variable.code,
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
        code: variable.code,
      });
    }

    if (!isCSharpVariableName(variable.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: variable.line,
        message: `Variable name \`${variable.name}\` should use camelCase.`,
        suggestion:
          "Rename it to camelCase (for example, `totalScore`, `isValidUser`).",
        why: "Consistent naming improves readability in C# codebases.",
        code: variable.code,
      });
    }
  }

  for (const fn of functionDeclarationNames) {
    const usageCount = identifierUsageCount.get(fn.name) || 0;

    if (usageCount === 0 && !fn.isEntryPoint) {
      issues.push({
        title: "Unused Function",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` might be declared but never used.`,
        suggestion: "Remove it or invoke it where required.",
        why: "Dead code increases maintenance cost.",
        code: fn.code,
      });
    }

    if (!isPascalCaseName(fn.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: fn.line,
        message: `Function name \`${fn.name}\` should use PascalCase.`,
        suggestion:
          "Rename it to PascalCase (for example, `ParseScores`, `AnalyzeResults`).",
        why: "Consistent PascalCase naming makes C# APIs easier to scan and use.",
        code: fn.code,
      });
    }
  }

  for (const [
    declarationKey,
    count,
  ] of variableNameDeclarationCount.entries()) {
    if (count > 1) {
      const declarationMeta = variableNameDeclarationMeta.get(declarationKey);
      issues.push({
        title: "Name Reuse",
        type: "improvement",
        line: declarationMeta ? declarationMeta.line : 1,
        message: `Variable name \`${declarationMeta ? declarationMeta.name : "value"}\` is reused ${count} times in the same scope.`,
        suggestion: "Use more specific names to avoid shadowing/confusion.",
        why: "Repeated names can hide bugs and make debugging harder.",
        code: declarationMeta ? declarationMeta.code : "",
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
        suggestion: "Split it into smaller functions.",
        why: "Shorter functions are easier to test, debug, and reuse.",
        code: fn.code,
      });
    }

    if (fn.parameterCount > 4) {
      issues.push({
        title: "Too Many Parameters",
        type: "improvement",
        line: fn.line,
        message: `Function \`${fn.name}\` has many parameters (${fn.parameterCount}).`,
        suggestion: "Consider grouping parameters into a configuration object.",
        why: "Too many parameters increase the chance of passing wrong values.",
        code: fn.code,
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
        code: fn.code,
      });
    }

    if (fn.maxNesting > 3) {
      issues.push({
        title: "Deep Nesting",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` has deep nesting (level ${fn.maxNesting}).`,
        suggestion: "Use guard clauses or early returns to simplify logic.",
        why: "Deep nesting makes control flow difficult to follow.",
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
        message: "Found TODO/FIXME/HACK comment.",
        suggestion: "Resolve unfinished tasks.",
        why: "Pending TODOs can become hidden bugs when ignored.",
        code: comment.code,
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

  return {
    name,
    line: getLine(node),
    lines: node.endPosition.row - node.startPosition.row + 1,
    parameterCount: countParameterIdentifiers(parametersNode),
    complexity: estimateCyclomaticComplexity(node),
    maxNesting: estimateMaxNesting(node),
    code: getNodeText(node, sourceCode),
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

  return node.childForFieldName("name");
};

const isEntryPointMethod = (methodNode, sourceCode) => {
  if (!methodNode || methodNode.type !== "method_declaration") {
    return false;
  }

  const nameNode = methodNode.childForFieldName("name");
  if (!nameNode) {
    return false;
  }

  return getNodeText(nameNode, sourceCode) === "Main";
};

const shouldIgnoreUnusedParameter = (parameterNode, sourceCode) => {
  let current = parameterNode;

  while (current) {
    if (current.type === "method_declaration") {
      return isEntryPointMethod(current, sourceCode);
    }

    current = current.parent;
  }

  return false;
};

const getDeclarationScopeKey = (node, kind = "unknown") => {
  const scopeNode = findDeclarationScopeNode(node, kind);
  return `${scopeNode.type}:${scopeNode.startIndex}:${scopeNode.endIndex}`;
};

const findDeclarationScopeNode = (node, kind) => {
  const memberScopeTypes = new Set([
    "class_declaration",
    "struct_declaration",
    "record_declaration",
  ]);

  const functionScopeTypes = new Set([
    "method_declaration",
    "local_function_statement",
    "lambda_expression",
    "anonymous_method_expression",
    "constructor_declaration",
    "operator_declaration",
    "conversion_operator_declaration",
    "accessor_declaration",
  ]);

  const localScopeTypes = new Set([
    "statement_block",
    "for_statement",
    "for_each_statement",
    "using_statement",
    "switch_section",
    "catch_clause",
    ...functionScopeTypes,
  ]);

  const preferredScopeTypes =
    kind === "field"
      ? memberScopeTypes
      : kind === "parameter"
        ? functionScopeTypes
        : localScopeTypes;

  let current = node;
  while (current) {
    if (preferredScopeTypes.has(current.type)) {
      return current;
    }

    current = current.parent;
  }

  return node;
};

const inferVariableKind = (parent) => {
  if (!parent) {
    return "unknown";
  }

  if (parent.type === "variable_declaration") {
    const scopeNode = parent.parent;

    if (scopeNode && scopeNode.type === "field_declaration") {
      return "field";
    }

    if (scopeNode && scopeNode.type === "local_declaration_statement") {
      return "local";
    }

    return "declaration";
  }

  return "unknown";
};

const inferVariableDataType = (valueNode, sourceCode) => {
  if (!valueNode) {
    return "unknown";
  }

  if (
    valueNode.type === "integer_literal" ||
    valueNode.type === "real_literal"
  ) {
    return "number";
  }

  if (
    valueNode.type === "string_literal" ||
    valueNode.type === "interpolated_string_expression"
  ) {
    return "string";
  }

  if (
    valueNode.type === "true" ||
    valueNode.type === "false" ||
    valueNode.type === "boolean_literal"
  ) {
    return "boolean";
  }

  if (valueNode.type === "null_literal") {
    return "null";
  }

  if (
    valueNode.type === "array_creation_expression" ||
    valueNode.type === "implicit_array_creation_expression"
  ) {
    return "array";
  }

  if (valueNode.type === "object_creation_expression") {
    return "instance";
  }

  if (valueNode.type === "lambda_expression") {
    return "function";
  }

  if (valueNode.type === "identifier") {
    const text = getNodeText(valueNode, sourceCode);
    if (text === "null") {
      return "null";
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
    "for_each_statement",
    "while_statement",
    "do_statement",
    "switch_section",
    "catch_clause",
    "conditional_expression",
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
    "for_each_statement",
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

const isCSharpVariableName = (name) => {
  return /^_?[a-z][A-Za-z0-9]*$/.test(name);
};

const isPascalCaseName = (name) => {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
};

const looksLikeCommentedCode = (commentText) => {
  const normalized = commentText
    .replace(/^\s*\/+[/*]?\s?/, "")
    .replace(/\*\/\s*$/, "")
    .trim();

  if (normalized.length === 0) {
    return false;
  }

  return /(class\s+|void\s+|if\s*\(|for\s*\(|while\s*\(|return\s+|=>|;|\{\s*\})/.test(
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
