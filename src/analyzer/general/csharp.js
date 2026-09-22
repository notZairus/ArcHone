export default function analyzeGeneralCS(tree, sourceCode) {
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
        message: `You created \`${variable.name}\`, but your code never uses it.`,
        suggestion:
          "Delete this variable if you do not need it, or use it where it should be used.",
        why: "Unused variables add clutter and make code harder to understand.",
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
          "Rename it to something clearer, like `userCount`, `isValid`, or `totalPrice`.",
        why: "Clear names make code easier to read and maintain.",
        code: variable.code,
      });
    }

    if (!isCSharpVariableName(variable.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: variable.line,
        message: `Variable name \`${variable.name}\` is not written in camelCase.`,
        suggestion:
          "Rename it to camelCase, for example `totalScore` or `isValidUser`.",
        why: "Using one naming style keeps code clean and easier to scan.",
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
        message: `Function \`${fn.name}\` is never called in your code.`,
        suggestion:
          "Remove the function if you do not need it, or call it where it should run.",
        why: "Unused functions can confuse readers about what really happens.",
        code: fn.code,
      });
    }

    if (!isPascalCaseName(fn.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: fn.line,
        message: `Function name \`${fn.name}\` is not written in PascalCase.`,
        suggestion:
          "Rename it to PascalCase, for example `ParseScores` or `AnalyzeResults`.",
        why: "Consistent naming helps other developers read your code faster.",
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
        suggestion:
          "Use different names for different values so each one has a clear purpose.",
        why: "Reusing names can cause confusion and mistakes.",
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
        message: `Function \`${fn.name}\` is very long (${fn.lines} lines).`,
        suggestion: "Split this function into smaller helper methods.",
        why: "Smaller methods are easier to read, test, and update.",
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
          "Group related parameters into one object to make calls simpler.",
        why: "Too many parameters are easy to mix up.",
        code: fn.code,
      });
    }

    // if (fn.complexity > 8) {
    //   issues.push({
    //     title: "High Complexity",
    //     type: "warning",
    //     line: fn.line,
    //     message: `Function \`${fn.name}\` has complex logic with many branches (${fn.complexity}).`,
    //     suggestion:
    //       "Simplify conditions and move parts of the logic into helper methods.",
    //     why: "Complex code is harder to test and easier to break.",
    //     code: fn.code,
    //   });
    // }

    if (fn.maxNesting > 3) {
      issues.push({
        title: "Deep Nesting",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` has deep nesting (level ${fn.maxNesting}).`,
        suggestion: "Use early returns and helper methods to reduce nesting.",
        why: "Deep nesting is hard to read because you must track many levels.",
        code: fn.code,
      });
    }
  }

  for (const group of findDuplicateFunctionGroups(functions)) {
    for (const fn of group) {
      const duplicatedWith = group
        .filter((peer) => peer !== fn)
        .map((peer) => `\`${peer.name}\` (line ${peer.line})`)
        .join(", ");

      issues.push({
        title: "Duplicate Code Blocks",
        type: "improvement",
        line: fn.line,
        message: `Function \`${fn.name}\` repeats the same code block as ${duplicatedWith}.`,
        suggestion:
          "Extract the shared logic into one helper method and reuse it from each call site.",
        why: "Duplicated logic is harder to maintain because bug fixes must be repeated in multiple places.",
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
        why: "Old TODO comments are easy to forget and may become bugs later.",
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
        why: "Old code in comments makes real code harder to read.",
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
}

const buildFunctionData = (node, name, sourceCode) => {
  const parametersNode = node.childForFieldName("parameters");
  const bodyNode = node.childForFieldName("body");

  return {
    name,
    line: getLine(node),
    lines: node.endPosition.row - node.startPosition.row + 1,
    parameterCount: countParameterIdentifiers(parametersNode),
    complexity: estimateCyclomaticComplexity(node),
    maxNesting: estimateMaxNesting(node),
    bodyCode: bodyNode
      ? getNodeText(bodyNode, sourceCode)
      : getNodeText(node, sourceCode),
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

const findDuplicateFunctionGroups = (functions) => {
  const groupsByFingerprint = new Map();

  for (const fn of functions) {
    if (!fn || fn.name === "(anonymous)") {
      continue;
    }

    const fingerprint = normalizeCodeForDuplicateCheck(fn.bodyCode || fn.code);
    if (!fingerprint) {
      continue;
    }

    if (!groupsByFingerprint.has(fingerprint)) {
      groupsByFingerprint.set(fingerprint, []);
    }

    groupsByFingerprint.get(fingerprint).push(fn);
  }

  return Array.from(groupsByFingerprint.values()).filter(
    (group) => group.length > 1,
  );
};

const normalizeCodeForDuplicateCheck = (code) => {
  if (!code || typeof code !== "string") {
    return "";
  }

  const withoutBlockComments = code.replace(/\/\*[\s\S]*?\*\//g, " ");
  const withoutLineComments = withoutBlockComments.replace(/\/\/.*$/gm, " ");
  const normalizedLines = withoutLineComments
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "{" && line !== "}");

  if (normalizedLines.length < 3) {
    return "";
  }

  return normalizedLines.join(" ").replace(/\s+/g, " ");
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

  return /(\bclass\s+[A-Za-z_]\w*\s*\{|\b(?:void|int|string|bool|double|float|decimal|var)\s+[A-Za-z_]\w*\s*(?:\(|=|;)|\b(?:if|for|while)\s*\(|\breturn\b[^\n;]*;|=>|\{\s*\})/.test(
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
