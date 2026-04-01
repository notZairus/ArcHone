import analysisParser from "../parser/analysis-parser.js";

export default async function analyzePython(sourceCode, fileExtension) {
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
  const identifierUsageCountByName = new Map();
  const variableNameDeclarationCount = new Map();
  const variableNameDeclarationMeta = new Map();
  const functionDeclarationNames = [];
  const seenVariableNamesByScope = new Map();

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
      const name = nameNode ? getNodeText(nameNode, sourceCode) : "(anonymous)";

      if (nameNode) {
        declarationNodeKeys.add(getNodeKey(nameNode));
        functionDeclarationNames.push({
          name,
          line: getLine(nameNode),
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

    if (node.type === "assignment" || node.type === "augmented_assignment") {
      const leftNode = node.childForFieldName("left");
      const rightNode = node.childForFieldName("right");
      const kind =
        node.type === "augmented_assignment" ? "reassignment" : "assignment";
      const dataType = inferVariableDataType(rightNode, sourceCode);

      for (const idNode of extractIdentifiersFromPattern(leftNode)) {
        const variableName = getNodeText(idNode, sourceCode);
        const scopeKey = getDeclarationScopeKey(idNode);
        const declarationKey = `${scopeKey}::${variableName}`;
        declarationNodeKeys.add(getNodeKey(idNode));

        if (
          hasSeenVariableInScope(
            seenVariableNamesByScope,
            scopeKey,
            variableName,
          )
        ) {
          continue;
        }

        markVariableSeenInScope(
          seenVariableNamesByScope,
          scopeKey,
          variableName,
        );

        variables.push({
          name: variableName,
          kind,
          dataType,
          line: getLine(idNode),
          scopeKey,
          code: getNodeText(node, sourceCode),
        });

        variableNameDeclarationCount.set(
          declarationKey,
          (variableNameDeclarationCount.get(declarationKey) || 0) + 1,
        );
        if (!variableNameDeclarationMeta.has(declarationKey)) {
          variableNameDeclarationMeta.set(declarationKey, {
            name: variableName,
            line: getLine(idNode),
            code: getNodeText(node, sourceCode),
          });
        }
      }

      return;
    }

    if (node.type === "for_statement") {
      const leftNode = node.childForFieldName("left");

      for (const idNode of extractIdentifiersFromPattern(leftNode)) {
        const variableName = getNodeText(idNode, sourceCode);
        const scopeKey = getDeclarationScopeKey(idNode);
        const declarationKey = `${scopeKey}::${variableName}`;
        declarationNodeKeys.add(getNodeKey(idNode));

        if (
          hasSeenVariableInScope(
            seenVariableNamesByScope,
            scopeKey,
            variableName,
          )
        ) {
          continue;
        }

        markVariableSeenInScope(
          seenVariableNamesByScope,
          scopeKey,
          variableName,
        );

        variables.push({
          name: variableName,
          kind: "loop",
          dataType: "unknown",
          line: getLine(idNode),
          scopeKey,
          code: getNodeText(node, sourceCode),
        });

        variableNameDeclarationCount.set(
          declarationKey,
          (variableNameDeclarationCount.get(declarationKey) || 0) + 1,
        );
        if (!variableNameDeclarationMeta.has(declarationKey)) {
          variableNameDeclarationMeta.set(declarationKey, {
            name: variableName,
            line: getLine(idNode),
            code: getNodeText(node, sourceCode),
          });
        }
      }

      return;
    }

    if (node.type === "identifier") {
      const key = getNodeKey(node);
      if (declarationNodeKeys.has(key)) {
        return;
      }

      const identifierName = getNodeText(node, sourceCode);
      const scopeKey = getDeclarationScopeKey(node);
      const usageKey = `${scopeKey}::${identifierName}`;
      identifierUsageCount.set(
        usageKey,
        (identifierUsageCount.get(usageKey) || 0) + 1,
      );
      identifierUsageCountByName.set(
        identifierName,
        (identifierUsageCountByName.get(identifierName) || 0) + 1,
      );
    }
  });

  for (const variable of variables) {
    const usageKey = `${variable.scopeKey}::${variable.name}`;
    const usageCount = identifierUsageCount.get(usageKey) || 0;

    if (usageCount === 0) {
      issues.push({
        title: "Unused Variable",
        type: "warning",
        line: variable.line,
        message: `You assigned \`${variable.name}\`, but your code never uses it.`,
        suggestion:
          "Delete this variable if you do not need it, or use it where it should be used.",
        why: "Unused variables add clutter and make code harder to follow.",
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
          "Rename it to something clearer, like `user_count`, `is_valid`, or `total_price`.",
        why: "Clear names make code easier to understand.",
        code: variable.code,
      });
    }

    if (!isSnakeCaseName(variable.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: variable.line,
        message: `Variable name \`${variable.name}\` is not written in snake_case.`,
        suggestion:
          "Rename it to snake_case, for example `total_score` or `is_valid_user`.",
        why: "One naming style makes code cleaner and easier to scan.",
        code: variable.code,
      });
    }
  }

  for (const fn of functionDeclarationNames) {
    const usageCount = identifierUsageCountByName.get(fn.name) || 0;

    if (usageCount === 0) {
      issues.push({
        title: "Unused Function",
        type: "warning",
        line: fn.line,
        message: `Function \`${fn.name}\` is never called in your code.`,
        suggestion:
          "Remove the function if you do not need it, or call it where it should run.",
        why: "Unused functions can confuse readers about what the program actually does.",
        code: fn.code,
      });
    }

    if (!isSnakeCaseName(fn.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: fn.line,
        message: `Function name \`${fn.name}\` is not written in snake_case.`,
        suggestion:
          "Rename it to snake_case, for example `parse_scores` or `analyze_results`.",
        why: "Consistent naming makes functions easier to find and read.",
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
        why: "Reusing names can cause confusion and bugs.",
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
        suggestion: "Split this function into smaller helper functions.",
        why: "Smaller functions are easier to read, test, and fix.",
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
          "Group related values into one object (like a config or dataclass).",
        why: "Too many parameters are hard to remember and easy to mix up.",
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
        why: "Complex code is harder to test and easier to break.",
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
        why: "Deep nesting is hard to read because there are too many levels to track.",
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
    "while_statement",
    "try_statement",
    "except_clause",
    "conditional_expression",
    "boolean_operator",
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
    "while_statement",
    "try_statement",
    "except_clause",
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

const inferVariableDataType = (valueNode, sourceCode) => {
  if (!valueNode) {
    return "unknown";
  }

  if (valueNode.type === "integer" || valueNode.type === "float") {
    return "number";
  }

  if (valueNode.type === "string") {
    return "string";
  }

  if (valueNode.type === "true" || valueNode.type === "false") {
    return "boolean";
  }

  if (valueNode.type === "none") {
    return "none";
  }

  if (valueNode.type === "list") {
    return "list";
  }

  if (valueNode.type === "dictionary") {
    return "dict";
  }

  if (valueNode.type === "lambda") {
    return "function";
  }

  if (valueNode.type === "identifier") {
    const text = getNodeText(valueNode, sourceCode);
    if (text === "None") {
      return "none";
    }
  }

  return "unknown";
};

const getDeclarationScopeKey = (node) => {
  let current = node;

  while (current) {
    if (
      current.type === "function_definition" ||
      current.type === "lambda" ||
      current.type === "module"
    ) {
      return `${current.type}:${current.startIndex}:${current.endIndex}`;
    }

    current = current.parent;
  }

  return "global";
};

const hasSeenVariableInScope = (seenMap, scopeKey, variableName) => {
  const scopedNames = seenMap.get(scopeKey);
  if (!scopedNames) {
    return false;
  }

  return scopedNames.has(variableName);
};

const markVariableSeenInScope = (seenMap, scopeKey, variableName) => {
  if (!seenMap.has(scopeKey)) {
    seenMap.set(scopeKey, new Set());
  }

  seenMap.get(scopeKey).add(variableName);
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

const isSnakeCaseName = (name) => {
  return /^[a-z_][a-z0-9_]*$/.test(name);
};

const looksLikeCommentedCode = (commentText) => {
  const normalized = commentText.replace(/^\s*#+\s?/, "").trim();

  if (normalized.length === 0) {
    return false;
  }

  return /(def\s+|class\s+|if\s+|for\s+|while\s+|return\s+|=\s*|:\s*$|\{\s*\})/.test(
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
