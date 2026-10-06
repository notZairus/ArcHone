import { duplicateFingerprint } from "../detection-support.js";

export default function analyzeOopPy(tree, sourceCode) {
  const issues = [];
  const functions = [];
  const variables = [];
  const comments = [];

  const classes = [];

  traverseTree(tree.rootNode, (node) => {
    if (node.type === "comment") {
      comments.push({
        line: getLine(node),
        text: getNodeText(node, sourceCode).trim(),
        code: getNodeText(node, sourceCode),
      });
      return;
    }

    if (node.type === "class_definition") {
      classes.push(analyzeClass(node, sourceCode));
    }
  });

  for (const clazz of classes) {
    functions.push(...clazz.methods);
    variables.push(...clazz.fields);
    issues.push(...clazz.issues);
  }

  return {
    functions,
    variables,
    comments,
    issues,
  };
}

const OOP_LIMITS = {
  maxMethodLines: 60,
  maxParameters: 4,
  maxDependencies: 8,
  maxHardcodedLiteralsInClass: 10,
  largeClassMethodCount: 20,
  largeClassFieldCount: 15,
  largeClassLines: 300,
  minMethodsForPublicRatio: 5,
  publicMethodRatioThreshold: 0.7,
  responsibilityMinMethods: 6,
  responsibilityMinClusterSize: 2,
  responsibilityClustersThreshold: 3,
};

const PY_BUILTIN_TYPES = new Set([
  "int",
  "str",
  "float",
  "bool",
  "list",
  "dict",
  "set",
  "tuple",
  "object",
]);

const analyzeClass = (classNode, sourceCode) => {
  const classNameNode = classNode.childForFieldName("name");
  const className = classNameNode
    ? getNodeText(classNameNode, sourceCode)
    : "(anonymous)";
  const classLine = getLine(classNameNode || classNode);
  const classCode = getNodeText(classNode, sourceCode);
  const classLines = countLines(classNode);

  const bodyNode = classNode.childForFieldName("body");
  const bodyChildren = bodyNode ? bodyNode.namedChildren : [];

  const methods = [];
  const fields = [];
  const issues = [];

  const dependencies = new Set();
  const hardcodedLiterals = [];
  let instanceFieldCount = 0;
  let instanceMethodCount = 0;
  let hasInit = false;

  // Base classes count as dependencies
  const baseList = classNode.childForFieldName("superclasses");
  if (baseList) {
    for (const child of baseList.namedChildren || []) {
      if (child.type === "identifier") {
        const baseName = getNodeText(child, sourceCode);
        if (baseName && baseName !== className) {
          dependencies.add(baseName);
        }
      }
    }
  } else {
    // tree-sitter-python uses argument_list for base classes
    const argList = classNode.namedChildren?.find(
      (n) => n.type === "argument_list",
    );
    if (argList) {
      for (const child of argList.namedChildren || []) {
        if (child.type === "identifier") {
          const baseName = getNodeText(child, sourceCode);
          if (baseName && baseName !== className) {
            dependencies.add(baseName);
          }
        }
      }
    }
  }

  // Class-level fields (static)
  for (const child of bodyChildren) {
    if (child.type === "expression_statement") {
      const inner = child.namedChild(0);
      if (inner && inner.type === "assignment") {
        const left = inner.childForFieldName("left");
        if (left && left.type === "identifier") {
          fields.push({
            name: getNodeText(left, sourceCode),
            className,
            kind: "class_field",
            dataType: "unknown",
            line: getLine(left),
            scopeKey: className,
            isExported: false,
            isStatic: true,
            isPublic: !String(getNodeText(left, sourceCode)).startsWith("_"),
            code: getNodeText(child, sourceCode),
          });
        }
      }
    }
  }

  for (const child of bodyChildren) {
    const methodInfo = extractPythonMethodNode(child);
    if (!methodInfo) {
      continue;
    }

    const { methodNode, decorators } = methodInfo;
    const nameNode = methodNode.childForFieldName("name");
    const name = nameNode ? getNodeText(nameNode, sourceCode) : "(anonymous)";
    const paramsNode = methodNode.childForFieldName("parameters");
    const isConstructor = name === "__init__";

    const isStaticLike = decorators.some(
      (d) => d === "staticmethod" || d === "classmethod",
    );
    const isPublic = isPublicPythonMethod(name);
    const lines = countLines(methodNode);
    const parameterCount = countPythonParameters(paramsNode, sourceCode);

    methods.push({
      name,
      className,
      lines,
      parameterCount,
      complexity: 0,
      maxNesting: 0,
      line: getLine(nameNode || methodNode),
      isStatic: isStaticLike,
      isPublic,
      code: getNodeText(methodNode, sourceCode),
      bodyFingerprint: duplicateFingerprint(methodNode),
      bodyCode: getNodeText(
        methodNode.childForFieldName("body") || methodNode,
        sourceCode,
      ),
    });

    if (isConstructor) {
      hasInit = true;
    }

    if (!isStaticLike && !isConstructor) {
      instanceMethodCount += 1;
    }

    // Method-level checks
    if (lines > OOP_LIMITS.maxMethodLines && !isConstructor) {
      issues.push({
        title: "Method Too Long",
        type: "improvement",
        line: getLine(nameNode || methodNode),
        functionName: name,
        functionLines: lines,
        message: `Method \`${name}\` is very long (${lines} lines).`,
        suggestion: "Split this method into smaller helper methods.",
        why: "Long methods are harder to understand and often contain multiple responsibilities.",
        code: getNodeText(methodNode, sourceCode),
      });
    }

    if (parameterCount > OOP_LIMITS.maxParameters && !isConstructor) {
      issues.push({
        title: "Too Many Parameters",
        type: "improvement",
        line: getLine(nameNode || methodNode),
        message: `Method \`${name}\` has many parameters (${parameterCount}).`,
        suggestion:
          "Group related parameters into a single object (or a small class/dict).",
        why: "Too many parameters make calls harder to read and easier to misuse.",
        code: getNodeText(methodNode, sourceCode),
      });
    }

    for (const dep of findPythonDependenciesInMethod(
      methodNode,
      sourceCode,
      className,
    )) {
      if (!PY_BUILTIN_TYPES.has(dep)) {
        dependencies.add(dep);
      }
    }

    hardcodedLiterals.push(
      ...findPythonHardcodedLiterals(methodNode, sourceCode),
    );
    instanceFieldCount += countPythonInstanceFieldAssignments(
      methodNode,
      sourceCode,
    );
  }

  // No Constructor but not every method/prop is static
  const hasAnyInstanceMembers = instanceMethodCount + instanceFieldCount > 0;
  const hasAnyMembers = methods.length + fields.length > 0;

  if (!hasInit && hasAnyMembers && hasAnyInstanceMembers) {
    issues.push({
      title: "No Constructor",
      type: "improvement",
      line: classLine,
      message: `Class \`${className}\` has no \`__init__\`, but it has instance members.`,
      suggestion:
        "Add an `__init__(self, ...)` to initialize required fields, or convert the class into a utility class using `@staticmethod`.",
      why: "Constructors make initialization explicit and consistent.",
      code: classCode,
    });
  }

  // Too Many Dependencies
  const dependencyCount = dependencies.size;
  if (dependencyCount > OOP_LIMITS.maxDependencies) {
    issues.push({
      title: "Too Many Dependencies",
      type: "warning",
      line: classLine,
      message: `Class \`${className}\` depends on many other types (${dependencyCount}).`,
      suggestion:
        "Split the class into smaller parts or inject collaborators instead of creating/using many different services inside one class.",
      why: "Many dependencies usually indicates tight coupling and makes testing harder.",
      code: classCode,
    });
  }

  // Hardcoded Values
  if (hardcodedLiterals.length) {
    const previewLimit = 8;
    const preview = hardcodedLiterals
      .slice(0, previewLimit)
      .map((literal) => `${literal.text} (line ${literal.line})`)
      .join(", ");
    const remaining =
      hardcodedLiterals.length -
      Math.min(previewLimit, hardcodedLiterals.length);
    const suffix = remaining > 0 ? `, ...and ${remaining} more` : "";

    issues.push({
      title: "Hardcoded Values",
      type: "improvement",
      line: hardcodedLiterals[0]?.line || classLine,
      message: `Class \`${className}\` uses hardcoded literal values: ${preview}${suffix}.`,
      suggestion: `Replace these magic values with named constants or configuration: ${preview}${suffix}.`,
      why: "Magic values hide intent and create brittle code when requirements change.",
      code: classCode,
    });
  }

  // Too Many Public Methods
  const nonDunderMethods = methods.filter((m) => !isDunder(m.name));
  const totalMethods = nonDunderMethods.filter(
    (m) => m.name !== "__init__",
  ).length;
  const publicMethods = nonDunderMethods.filter(
    (m) => m.name !== "__init__" && m.isPublic,
  ).length;
  if (totalMethods >= OOP_LIMITS.minMethodsForPublicRatio) {
    const ratio = totalMethods ? publicMethods / totalMethods : 0;
    if (ratio > OOP_LIMITS.publicMethodRatioThreshold) {
      issues.push({
        title: "Too Many Public Methods",
        type: "improvement",
        line: classLine,
        message: `Class \`${className}\` exposes many public methods (public ratio ${(ratio * 100).toFixed(0)}%).`,
        suggestion:
          "Prefix internal helpers with `_` and keep the public API small.",
        why: "A large public API makes classes harder to use and maintain.",
        code: classCode,
      });
    }
  }

  // Duplicate Methods
  const duplicateGroups = findDuplicateMethodGroups(
    methods.filter((m) => m.name !== "__init__" && !isDunder(m.name)),
  );
  if (duplicateGroups.length) {
    const group = duplicateGroups[0];
    const names = group.map((m) => m.name).join(", ");
    issues.push({
      title: "Duplicate Methods",
      type: "improvement",
      line: group[0].line || classLine,
      message: `Class \`${className}\` contains duplicate method implementations (${names}).`,
      suggestion:
        "Extract the shared logic into one helper method and reuse it.",
      why: "Duplicate logic increases bugs because fixes must be repeated.",
      code: group[0].code,
    });
  }

  // Large Class / God Class
  if (
    classLines > OOP_LIMITS.largeClassLines ||
    methods.filter((m) => m.name !== "__init__").length >
      OOP_LIMITS.largeClassMethodCount ||
    fields.length + instanceFieldCount > OOP_LIMITS.largeClassFieldCount ||
    dependencyCount > OOP_LIMITS.maxDependencies + 4
  ) {
    issues.push({
      title: "Large Class / God Class",
      type: "warning",
      line: classLine,
      message: `Class \`${className}\` is large (lines: ${classLines}, methods: ${methods.length}).`,
      suggestion:
        "Extract cohesive responsibilities into separate classes/modules.",
      why: "Large classes tend to become hard to change safely.",
      code: classCode,
    });
  }

  return { className, classLine, methods, fields, issues };
};

const extractPythonMethodNode = (node) => {
  if (!node) {
    return null;
  }

  if (node.type === "function_definition") {
    return { methodNode: node, decorators: [] };
  }

  if (node.type === "decorated_definition") {
    const decorators = [];
    let methodNode = null;
    for (const child of node.namedChildren || []) {
      if (child.type === "decorator") {
        const id = child.namedChild(0);
        if (id && id.type === "identifier") {
          decorators.push(id.text || "");
        }
      } else if (child.type === "function_definition") {
        methodNode = child;
      }
    }
    if (methodNode) {
      return { methodNode, decorators };
    }
  }

  return null;
};

const isPublicPythonMethod = (name) => {
  if (!name || typeof name !== "string") {
    return false;
  }

  if (isDunder(name)) {
    return false;
  }

  return !name.startsWith("_");
};

const isDunder = (name) => {
  return /^__.*__$/.test(String(name || ""));
};

const countPythonParameters = (parametersNode, sourceCode) => {
  if (!parametersNode) {
    return 0;
  }

  const names = [];
  for (const child of parametersNode.namedChildren || []) {
    const paramName = extractPythonParameterName(child, sourceCode);
    if (!paramName) {
      continue;
    }
    names.push(paramName);
  }

  return names.filter((n) => n !== "self" && n !== "cls").length;
};

const extractPythonParameterName = (node, sourceCode) => {
  if (!node) {
    return "";
  }
  if (node.type === "identifier") {
    return node.text || getNodeText(node, sourceCode);
  }

  const nameNode = node.childForFieldName("name");
  if (nameNode && nameNode.type === "identifier") {
    return nameNode.text || getNodeText(nameNode, sourceCode);
  }

  // Fallback: find first identifier within this parameter node
  for (const c of node.namedChildren || []) {
    if (c.type === "identifier") {
      return c.text || getNodeText(c, sourceCode);
    }
  }

  return "";
};

const findPythonDependenciesInMethod = (methodNode, sourceCode, className) => {
  const deps = new Set();
  const body = methodNode.childForFieldName("body");
  if (!body) {
    return deps;
  }

  traverseTree(body, (node) => {
    if (node.type !== "call") {
      return;
    }

    const fn = node.childForFieldName("function") || node.namedChild(0);
    if (!fn) {
      return;
    }

    if (fn.type === "identifier") {
      const name = getNodeText(fn, sourceCode);
      if (looksLikeTypeName(name) && name !== className) {
        deps.add(name);
      }
      return;
    }

    if (fn.type === "attribute") {
      const obj = fn.namedChild(0);
      if (obj && obj.type === "identifier") {
        const objName = getNodeText(obj, sourceCode);
        if (looksLikeTypeName(objName) && objName !== className) {
          deps.add(objName);
        }
      }
    }
  });

  return deps;
};

const findPythonHardcodedLiterals = (methodNode, sourceCode) => {
  const body = methodNode.childForFieldName("body");
  if (!body) {
    return [];
  }

  const isWithinAssignmentInitializer = (node, parentByNode) => {
    let current = node;

    while (current) {
      const parent = parentByNode.get(current);
      if (!parent) {
        return false;
      }

      // If the literal lives anywhere inside an initializer/assignment subtree,
      // treat it as a named value and do not flag it.
      if (
        parent.type === "assignment" ||
        parent.type === "augmented_assignment" ||
        parent.type === "default_parameter"
      ) {
        return true;
      }

      current = parent;
    }

    return false;
  };

  const literals = [];
  const parentByNode = new Map();

  traverseTree(body, (node, parent) => {
    parentByNode.set(node, parent);

    if (node.type === "integer" || node.type === "float") {
      const text = getNodeText(node, sourceCode);
      const value = Number(text);
      if (Number.isFinite(value) && ![0, 1, -1].includes(value)) {
        literals.push({
          kind: "number",
          text,
          line: getLine(node),
        });
      }
    }

    if (node.type === "string") {
      const text = getNodeText(node, sourceCode);
      const unquoted = text.replace(/^['"]/g, "").replace(/['"]$/g, "");
      if (unquoted && unquoted.length >= 3) {
        literals.push({
          kind: "string",
          text,
          line: getLine(node),
        });
      }
    }
  });

  return literals;
};

const countPythonInstanceFieldAssignments = (methodNode, sourceCode) => {
  const body = methodNode.childForFieldName("body");
  if (!body) {
    return 0;
  }

  const assigned = new Set();

  traverseTree(body, (node) => {
    if (node.type !== "assignment" && node.type !== "augmented_assignment") {
      return;
    }

    const left = node.childForFieldName("left");
    if (!left || left.type !== "attribute") {
      return;
    }

    const obj = left.namedChild(0);
    const prop = left.namedChild(1);
    if (!obj || !prop) {
      return;
    }

    const objName = getNodeText(obj, sourceCode);
    const propName = getNodeText(prop, sourceCode);
    if (objName === "self" && propName) {
      assigned.add(propName);
    }
  });

  return assigned.size;
};

const findDuplicateMethodGroups = (methods) => {
  const groupsByFingerprint = new Map();

  for (const method of methods) {
    const fingerprint = method.bodyFingerprint;
    if (!fingerprint) {
      continue;
    }

    if (!groupsByFingerprint.has(fingerprint)) {
      groupsByFingerprint.set(fingerprint, []);
    }

    groupsByFingerprint.get(fingerprint).push(method);
  }

  return Array.from(groupsByFingerprint.values()).filter((g) => g.length > 1);
};

const looksLikeTypeName = (name) => {
  if (!name || typeof name !== "string") {
    return false;
  }
  return /^[A-Z][A-Za-z0-9_]*$/.test(name);
};

const pickResponsibilityKeyword = (name) => {
  const tokens = splitIdentifierTokens(name);
  if (!tokens.length) {
    return "";
  }

  const stop = new Set([
    "get",
    "set",
    "add",
    "remove",
    "update",
    "create",
    "delete",
    "fetch",
    "load",
    "save",
    "build",
    "init",
    "handle",
    "process",
    "compute",
    "calc",
    "calculate",
    "make",
    "do",
    "run",
    "is",
    "has",
  ]);

  const first = tokens[0];
  if (!stop.has(first)) {
    return first;
  }

  return tokens.find((t) => !stop.has(t)) || first;
};

const splitIdentifierTokens = (name) => {
  const raw = String(name || "")
    .replace(/^_+/, "")
    .trim();
  if (!raw) {
    return [];
  }

  const spaced = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-\s]+/g, " ");

  return spaced
    .split(" ")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
};

const getNodeText = (node, sourceCode) => {
  return sourceCode.slice(node.startIndex, node.endIndex);
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

const countLines = (node) => {
  return node.endPosition.row - node.startPosition.row + 1;
};
