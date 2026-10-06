import { duplicateFingerprint } from "../detection-support.js";

export default function analyzeOopJS(tree, sourceCode) {
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

    if (node.type === "class_declaration") {
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

const JS_BUILTIN_TYPES = new Set([
  "Array",
  "Object",
  "String",
  "Number",
  "Boolean",
  "Map",
  "Set",
  "Date",
  "Promise",
  "Error",
  "RegExp",
  "Math",
  "JSON",
  "console",
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
  const members = bodyNode ? bodyNode.namedChildren : [];

  const methods = [];
  const fields = [];
  const issues = [];

  const constructorMethods = [];
  let instanceMethods = 0;
  let instanceFields = 0;

  const dependencies = new Set();
  const hardcodedLiterals = [];

  for (const member of members) {
    if (member.type === "method_definition") {
      const method = buildJsMethodData(member, sourceCode, className);
      methods.push(method);

      if (method.name === "constructor") {
        constructorMethods.push(method);
      }

      if (!method.isStatic && method.name !== "constructor") {
        instanceMethods += 1;
      }

      if (
        method.lines > OOP_LIMITS.maxMethodLines &&
        method.name !== "constructor"
      ) {
        issues.push({
          title: "Method Too Long",
          type: "improvement",
          line: method.line,
          functionName: method.name,
          functionLines: method.lines,
          message: `Method \`${method.name}\` is very long (${method.lines} lines).`,
          suggestion:
            "Split this method into smaller helper methods with clear names.",
          why: "Long methods are harder to understand, test, and maintain because they often mix multiple responsibilities.",
          code: method.code,
        });
      }

      if (
        method.parameterCount > OOP_LIMITS.maxParameters &&
        method.name !== "constructor"
      ) {
        issues.push({
          title: "Too Many Parameters",
          type: "improvement",
          line: method.line,
          message: `Method \`${method.name}\` has many parameters (${method.parameterCount}).`,
          suggestion:
            "Group related parameters into one object (or a small DTO) to simplify the signature.",
          why: "Too many parameters are easy to mix up and make method calls harder to read.",
          code: method.code,
        });
      }

      for (const dep of findJsDependenciesInNode(
        member,
        sourceCode,
        className,
      )) {
        dependencies.add(dep);
      }

      hardcodedLiterals.push(
        ...findJsHardcodedLiteralsInMethod(member, sourceCode),
      );
    }

    if (member.type === "field_definition") {
      const field = buildJsFieldData(member, sourceCode, className);
      fields.push(field);
      if (!field.isStatic) {
        instanceFields += 1;
      }
    }
  }

  const hasConstructor = constructorMethods.length > 0;
  const hasAnyInstanceMembers = instanceMethods + instanceFields > 0;
  const hasAnyMembers = methods.length + fields.length > 0;

  // 1) No Constructor but not every member is static
  if (!hasConstructor && hasAnyMembers && hasAnyInstanceMembers) {
    issues.push({
      title: "No Constructor",
      type: "improvement",
      line: classLine,
      message: `Class \`${className}\` has no constructor, but it has non-static members.`,
      suggestion:
        "If this class needs instance state, add a `constructor(...)` to initialize required properties. If it's a utility class, make members static.",
      why: "Constructors make initialization explicit. Without one, instance state is often initialized inconsistently across methods.",
      code: classCode,
    });
  }

  // 2) Too Many Dependencies
  const dependencyCount = dependencies.size;
  if (dependencyCount > OOP_LIMITS.maxDependencies) {
    issues.push({
      title: "Too Many Dependencies",
      type: "warning",
      line: classLine,
      message: `Class \`${className}\` depends on many other types (${dependencyCount}).`,
      suggestion:
        "Consider extracting responsibilities into smaller classes, or inject dependencies instead of creating them inside methods.",
      why: "Classes with many dependencies are harder to test and change because they are tightly coupled to many collaborators.",
      code: classCode,
    });
  }

  // 5) Hardcoded Values
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
      why: "Magic numbers/strings hide intent and make updates risky because the meaning isn't documented in code.",
      code: classCode,
    });
  }

  // 7) Too Many Public Methods (public_method_ratio > 0.7)
  const nonCtorMethods = methods.filter((m) => m.name !== "constructor");
  const totalMethods = nonCtorMethods.length;
  const publicMethods = nonCtorMethods.filter((m) => m.isPublic).length;

  if (totalMethods >= OOP_LIMITS.minMethodsForPublicRatio) {
    const ratio = totalMethods ? publicMethods / totalMethods : 0;
    if (ratio > OOP_LIMITS.publicMethodRatioThreshold) {
      issues.push({
        title: "Too Many Public Methods",
        type: "improvement",
        line: classLine,
        message: `Class \`${className}\` exposes many public methods (public ratio ${(ratio * 100).toFixed(0)}%).`,
        suggestion:
          "Hide internal helpers by making them private (use `#method` or prefix with `_`) and keep the public API small.",
        why: "A large public surface area makes a class harder to use and more fragile to change.",
        code: classCode,
      });
    }
  }

  // 8) Duplicate Methods
  const duplicateGroups = findDuplicateMethodGroups(nonCtorMethods);
  if (duplicateGroups.length) {
    const group = duplicateGroups[0];
    const names = group.map((m) => m.name).join(", ");
    issues.push({
      title: "Duplicate Methods",
      type: "improvement",
      line: group[0].line || classLine,
      message: `Class \`${className}\` contains duplicate method implementations (${names}).`,
      suggestion:
        "Extract the shared logic into one private helper method and reuse it instead of duplicating bodies.",
      why: "Duplicate logic increases bugs because a fix must be applied in multiple places.",
      code: group[0].code,
    });
  }

  // 4) Large Class / God Class
  if (
    classLines > OOP_LIMITS.largeClassLines ||
    totalMethods > OOP_LIMITS.largeClassMethodCount ||
    fields.length > OOP_LIMITS.largeClassFieldCount ||
    dependencyCount > OOP_LIMITS.maxDependencies + 4
  ) {
    issues.push({
      title: "Large Class / God Class",
      type: "warning",
      line: classLine,
      message: `Class \`${className}\` is large (lines: ${classLines}, methods: ${totalMethods}, fields: ${fields.length}).`,
      suggestion:
        "Extract cohesive groups of methods/fields into smaller classes and keep each class focused.",
      why: "Large classes are harder to test and change because many responsibilities are tightly coupled.",
      code: classCode,
    });
  }

  return {
    className,
    classLine,
    methods,
    fields,
    issues,
  };
};

const buildJsMethodData = (methodNode, sourceCode, className) => {
  const nameNode = methodNode.childForFieldName("name");
  const name = nameNode ? getNodeText(nameNode, sourceCode) : "(anonymous)";
  const paramsNode = methodNode.childForFieldName("parameters");
  const bodyNode = methodNode.childForFieldName("body");

  const isStatic = hasChildToken(methodNode, "static");
  const isPrivate = nameNode && nameNode.type === "private_property_identifier";
  const isPublic = !isPrivate && !String(name || "").startsWith("_");

  return {
    name,
    className,
    lines: countLines(methodNode),
    parameterCount: countJsParameters(paramsNode),
    complexity: 0,
    maxNesting: 0,
    line: getLine(nameNode || methodNode),
    isStatic,
    isPublic,
    code: getNodeText(methodNode, sourceCode),
    bodyFingerprint: duplicateFingerprint(methodNode),
    bodyCode: bodyNode ? getNodeText(bodyNode, sourceCode) : "",
  };
};

const buildJsFieldData = (fieldNode, sourceCode, className) => {
  const nameNode = fieldNode.childForFieldName("name");
  const name = nameNode ? getNodeText(nameNode, sourceCode) : "(field)";
  const isStatic = getNodeText(fieldNode, sourceCode)
    .trim()
    .startsWith("static ");
  const isPublic =
    !String(name || "").startsWith("#") && !String(name || "").startsWith("_");
  return {
    name,
    className,
    kind: "field",
    dataType: "unknown",
    line: getLine(nameNode || fieldNode),
    scopeKey: className,
    isExported: false,
    isStatic,
    isPublic,
    code: getNodeText(fieldNode, sourceCode),
  };
};

const findJsDependenciesInNode = (classMemberNode, sourceCode, className) => {
  const deps = new Set();

  traverseTree(classMemberNode, (node) => {
    if (node.type === "new_expression") {
      const ctorNode = node.childForFieldName("constructor");
      const ctorText = ctorNode ? getNodeText(ctorNode, sourceCode) : "";
      const dep = extractDependencyName(ctorText);
      if (dep && dep !== className && !JS_BUILTIN_TYPES.has(dep)) {
        deps.add(dep);
      }
      return;
    }

    if (node.type === "member_expression") {
      const objNode = node.childForFieldName("object");
      if (!objNode || objNode.type !== "identifier") {
        return;
      }
      const objName = getNodeText(objNode, sourceCode);
      if (
        looksLikeTypeName(objName) &&
        objName !== className &&
        !JS_BUILTIN_TYPES.has(objName)
      ) {
        deps.add(objName);
      }
    }
  });

  return deps;
};

const findJsHardcodedLiteralsInMethod = (methodNode, sourceCode) => {
  const bodyNode = methodNode.childForFieldName("body");
  if (!bodyNode) {
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
        parent.type === "variable_declarator" ||
        parent.type === "assignment_expression" ||
        parent.type === "assignment_pattern"
      ) {
        return true;
      }

      current = parent;
    }

    return false;
  };

  const literals = [];
  const parentByNode = new Map();

  traverseTree(bodyNode, (node, parent) => {
    parentByNode.set(node, parent);

    if (node.type === "number") {
      if (isWithinAssignmentInitializer(node, parentByNode)) {
        return;
      }

      const text = getNodeText(node, sourceCode);
      const value = Number(text);
      if (Number.isFinite(value) && ![0, 1, -1].includes(value)) {
        literals.push({
          kind: "number",
          text,
          line: getLine(node),
        });
      }
      return;
    }

    if (node.type === "string") {
      if (isWithinAssignmentInitializer(node, parentByNode)) {
        return;
      }

      const text = getNodeText(node, sourceCode);
      const unquoted = text.replace(/^['"`]/, "").replace(/['"`]$/, "");
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

const hasChildToken = (node, tokenType) => {
  for (let i = 0; i < node.childCount; i += 1) {
    const child = node.child(i);
    if (child && child.type === tokenType) {
      return true;
    }
  }
  return false;
};

const countJsParameters = (parametersNode) => {
  if (!parametersNode) {
    return 0;
  }

  let count = 0;
  for (const child of parametersNode.namedChildren || []) {
    if (
      child.type === "identifier" ||
      child.type === "assignment_pattern" ||
      child.type === "rest_pattern" ||
      child.type === "object_pattern" ||
      child.type === "array_pattern"
    ) {
      count += 1;
    }
  }
  return count;
};

const looksLikeTypeName = (name) => {
  if (!name || typeof name !== "string") {
    return false;
  }
  return /^[A-Z][A-Za-z0-9_]*$/.test(name);
};

const extractDependencyName = (text) => {
  if (!text || typeof text !== "string") {
    return "";
  }
  const cleaned = text.split("(")[0].trim();
  const first = cleaned.split(".")[0].trim();
  return first;
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
    .replace(/^#+/, "")
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
