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
          "Use a descriptive name like `user_count`, `is_valid`, or `total_price`.",
        why: "Clear names help new contributors understand code faster.",
        code: variable.code,
      });
    }

    if (!isSnakeCaseName(variable.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: variable.line,
        message: `Variable name \`${variable.name}\` should use snake_case.`,
        suggestion:
          "Rename it to snake_case (for example, `total_score`, `is_valid_user`).",
        why: "Consistent snake_case naming improves readability in Python codebases.",
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
        message: `Function \`${fn.name}\` might be declared but never used.`,
        suggestion: "Remove it or invoke it where required.",
        why: "Dead code increases maintenance cost.",
        code: fn.code,
      });
    }

    if (!isSnakeCaseName(fn.name)) {
      issues.push({
        title: "Naming Convention",
        type: "improvement",
        line: fn.line,
        message: `Function name \`${fn.name}\` should use snake_case.`,
        suggestion:
          "Rename it to snake_case (for example, `parse_scores`, `analyze_results`).",
        why: "Consistent snake_case naming makes Python APIs easier to scan and use.",
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
        suggestion: "Use more specific names to avoid confusion.",
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
        suggestion: "Consider grouping parameters into a single config object.",
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
