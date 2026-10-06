import { duplicateFingerprint } from "../detection-support.js";

export default function analyzeOopCS(tree, sourceCode) {
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

const CS_BUILTIN_TYPES = new Set([
  "bool",
  "byte",
  "char",
  "decimal",
  "double",
  "float",
  "int",
  "long",
  "object",
  "sbyte",
  "short",
  "string",
  "uint",
  "ulong",
  "ushort",
  "void",
  "Console",
  "DateTime",
]);

const analyzeClass = (classNode, sourceCode) => {
  const classNameNode = classNode.childForFieldName("name");
  const className = classNameNode
    ? getNodeText(classNameNode, sourceCode)
    : "(anonymous)";
  const classLine = getLine(classNameNode || classNode);
  const classCode = getNodeText(classNode, sourceCode);
  const classLines = countLines(classNode);

  const membersNode = classNode.namedChildren?.find(
    (n) => n.type === "declaration_list",
  );
  const members = membersNode ? membersNode.namedChildren : [];

  const methods = [];
  const fields = [];
  const issues = [];

  let constructorCount = 0;
  let instanceMethods = 0;
  let instanceFields = 0;

  const dependencies = new Set();
  const hardcodedLiterals = [];

  // Base classes/interfaces count as dependencies
  const baseList = classNode.namedChildren?.find((n) => n.type === "base_list");
  if (baseList) {
    for (const child of baseList.namedChildren || []) {
      if (child.type === "identifier" || child.type === "qualified_name") {
        const baseName = extractTypeName(child, sourceCode);
        if (
          baseName &&
          baseName !== className &&
          !CS_BUILTIN_TYPES.has(baseName)
        ) {
          dependencies.add(baseName);
        }
      }
    }
  }

  for (const member of members) {
    if (member.type === "constructor_declaration") {
      const ctor = buildCSharpMethodData(member, sourceCode, className, true);
      methods.push(ctor);
      constructorCount += 1;

      for (const dep of findCSharpDependenciesInNode(
        member,
        sourceCode,
        className,
      )) {
        if (!CS_BUILTIN_TYPES.has(dep)) {
          dependencies.add(dep);
        }
      }

      hardcodedLiterals.push(
        ...findCSharpHardcodedLiteralsInMember(member, sourceCode),
      );
      continue;
    }

    if (member.type === "method_declaration") {
      const method = buildCSharpMethodData(
        member,
        sourceCode,
        className,
        false,
      );
      methods.push(method);

      if (!method.isStatic) {
        instanceMethods += 1;
      }

      if (method.lines > OOP_LIMITS.maxMethodLines) {
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

      if (method.parameterCount > OOP_LIMITS.maxParameters) {
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

      for (const dep of findCSharpDependenciesInNode(
        member,
        sourceCode,
        className,
      )) {
        if (!CS_BUILTIN_TYPES.has(dep)) {
          dependencies.add(dep);
        }
      }

      hardcodedLiterals.push(
        ...findCSharpHardcodedLiteralsInMember(member, sourceCode),
      );
      continue;
    }

    if (member.type === "field_declaration") {
      const isStatic = hasModifier(member, sourceCode, "static");
      const isPublic = hasModifier(member, sourceCode, "public");

      const declarators = [];
      traverseTree(member, (node) => {
        if (node.type === "variable_declarator") {
          declarators.push(node);
        }
      });

      for (const decl of declarators) {
        const nameNode = decl.childForFieldName("name");
        const name = nameNode ? getNodeText(nameNode, sourceCode) : "(field)";

        fields.push({
          name,
          className,
          kind: "field",
          dataType: "unknown",
          line: getLine(nameNode || decl),
          scopeKey: className,
          isExported: false,
          isStatic,
          isPublic,
          code: getNodeText(member, sourceCode),
        });

        if (!isStatic) {
          instanceFields += 1;
        }
      }
    }
  }

  const hasConstructor = constructorCount > 0;
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
        "Add a constructor to initialize required fields, or convert the class into a utility class with only static members.",
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

  // 7) Too Many Public Methods
  const nonCtorMethods = methods.filter((m) => !m.isConstructor);
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
          "Hide internal helpers by making them private/internal and keep the public API small.",
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

const buildCSharpMethodData = (
  methodNode,
  sourceCode,
  className,
  isConstructor,
) => {
  const nameNode = methodNode.childForFieldName("name");
  const name = nameNode ? getNodeText(nameNode, sourceCode) : "(anonymous)";
  const parametersNode = methodNode.childForFieldName("parameters");
  const bodyNode = methodNode.childForFieldName("body");

  const isStatic = hasModifier(methodNode, sourceCode, "static");
  const isPublic = hasModifier(methodNode, sourceCode, "public");

  return {
    name,
    className,
    lines: countLines(methodNode),
    parameterCount: countCSharpParameters(parametersNode, sourceCode),
    complexity: 0,
    maxNesting: 0,
    line: getLine(nameNode || methodNode),
    isStatic,
    isPublic,
    isConstructor,
    code: getNodeText(methodNode, sourceCode),
    bodyFingerprint: duplicateFingerprint(methodNode),
    bodyCode: bodyNode ? getNodeText(bodyNode, sourceCode) : "",
  };
};

const hasModifier = (node, sourceCode, modifierText) => {
  if (!node) {
    return false;
  }

  const mods = (node.namedChildren || [])
    .filter((n) => n.type === "modifier")
    .map((n) => getNodeText(n, sourceCode));

  return mods.includes(modifierText);
};

const countCSharpParameters = (parametersNode, sourceCode) => {
  if (!parametersNode) {
    return 0;
  }

  let count = 0;
  for (const child of parametersNode.namedChildren || []) {
    if (child.type !== "parameter") {
      continue;
    }

    const nameNode = child.childForFieldName("name");
    if (nameNode && nameNode.type === "identifier") {
      count += 1;
      continue;
    }

    const identifiers = extractIdentifiersFromPattern(child);
    if (identifiers.length) {
      count += 1;
    }
  }

  return count;
};

const findCSharpDependenciesInNode = (
  classMemberNode,
  sourceCode,
  className,
) => {
  const deps = new Set();

  traverseTree(classMemberNode, (node) => {
    if (node.type === "object_creation_expression") {
      const typeNode = node.childForFieldName("type");
      const depName = typeNode ? extractTypeName(typeNode, sourceCode) : "";
      if (depName && depName !== className) {
        deps.add(depName);
      }
    }
  });

  return deps;
};

const extractTypeName = (typeNode, sourceCode) => {
  if (!typeNode) {
    return "";
  }

  const raw = getNodeText(typeNode, sourceCode).trim();
  if (!raw) {
    return "";
  }

  // Drop generic arguments `Type<T>` -> `Type`
  const withoutGenerics = raw.replace(/<.*?>/g, "");
  const lastSegment = withoutGenerics.split(".").pop() || withoutGenerics;
  return lastSegment.trim();
};

const findCSharpHardcodedLiteralsInMember = (memberNode, sourceCode) => {
  const bodyNode = memberNode.childForFieldName("body");
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

      if (
        parent.type === "variable_declarator" ||
        parent.type === "assignment_expression" ||
        parent.type === "equals_value_clause"
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

    if (node.type === "integer_literal" || node.type === "real_literal") {
      if (isWithinAssignmentInitializer(node, parentByNode)) {
        return;
      }

      const parentNode = parentByNode.get(node);
      const text =
        parentNode && parentNode.type === "prefix_unary_expression"
          ? getNodeText(parentNode, sourceCode)
          : getNodeText(node, sourceCode);

      const value = Number(String(text).replace(/_/g, ""));
      if (Number.isFinite(value) && ![0, 1, -1].includes(value)) {
        literals.push({
          kind: "number",
          text: String(text).trim(),
          line: getLine(
            parentNode && parentNode.type === "prefix_unary_expression"
              ? parentNode
              : node,
          ),
        });
      }
      return;
    }

    if (node.type === "string_literal") {
      if (isWithinAssignmentInitializer(node, parentByNode)) {
        return;
      }

      const text = getNodeText(node, sourceCode);
      const unquoted = text.replace(/^\$?@?\"/, "").replace(/\"$/, "");
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
