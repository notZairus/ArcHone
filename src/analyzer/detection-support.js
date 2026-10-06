const key = (node) => `${node.type}:${node.startIndex}:${node.endIndex}`;
const walk = (node, visit) => {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
};
const identifiers = (node) => {
  if (!node) return [];
  if (
    node.type === "identifier" ||
    node.type === "shorthand_property_identifier_pattern"
  )
    return [node];
  if (
    [
      "attribute",
      "member_expression",
      "member_access_expression",
      "subscript",
      "subscript_expression",
    ].includes(node.type)
  )
    return [];
  if (
    [
      "default_parameter",
      "typed_parameter",
      "typed_default_parameter",
      "parameter",
      "optional_parameter",
      "assignment_pattern",
    ].includes(node.type)
  ) {
    const name =
      node.childForFieldName("name") ||
      node.childForFieldName("left") ||
      node.namedChildren.find((c) => c.type === "identifier");
    return identifiers(name);
  }
  return node.namedChildren.flatMap(identifiers);
};
const same = (a, b) => a && b && key(a) === key(b);
const isMemberName = (node) => {
  const p = node.parent;
  return (
    p &&
    (same(p.childForFieldName("attribute"), node) ||
      same(p.childForFieldName("property"), node) ||
      (p.type === "member_access_expression" &&
        same(p.childForFieldName("name"), node)))
  );
};

// Compare AST tokens, renaming only bound parameters/locals. Preserve literals,
// operators, external calls and member names so unrelated algorithms stay distinct.
export function duplicateFingerprint(functionNode) {
  const body = functionNode.childForFieldName("body");
  if (
    !body ||
    body.namedChildren.filter((n) => n.type !== "comment").length < 2
  )
    return "";
  // Nested declarations require a richer binding model; avoid uncertain matches.
  let nested = false;
  walk(body, (n) => {
    if (
      [
        "function_definition",
        "function_declaration",
        "local_function_statement",
        "lambda_expression",
        "arrow_function",
        "class_definition",
        "class_declaration",
      ].includes(n.type)
    )
      nested = true;
  });
  if (nested) return "";
  const names = new Map();
  let next = 0;
  const bind = (n) => {
    if (!names.has(n.text)) names.set(n.text, `binding${next++}`);
  };
  identifiers(functionNode.childForFieldName("parameters")).forEach(bind);
  walk(body, (n) => {
    if (n.type === "variable_declarator")
      identifiers(n.childForFieldName("name")).forEach(bind);
    if (n.type === "assignment" || n.type === "for_statement")
      identifiers(n.childForFieldName("left")).forEach(bind);
  });
  const tokens = [];
  const visit = (n) => {
    if (n.type === "comment") return;
    if (
      [
        "string",
        "string_literal",
        "verbatim_string_literal",
        "interpolated_string_expression",
        "template_string",
      ].includes(n.type)
    ) {
      tokens.push(n.type + ":" + n.text);
      return;
    }
    if (n.childCount === 0) {
      tokens.push(
        n.type +
          ":" +
          (n.type === "identifier" && !isMemberName(n) && names.has(n.text)
            ? names.get(n.text)
            : n.text),
      );
      return;
    }
    tokens.push(n.type);
    for (const child of n.children) visit(child);
  };
  visit(body);
  return JSON.stringify(tokens);
}

export function hasTaskComment(text) {
  const content = text
    .replace(/^\s*(?:\/\/|\/\*|#)\s?/, "")
    .replace(/\*\/\s*$/, "");
  // A task marker introduces a comment item, rather than merely appearing in prose.
  return content
    .split("\n")
    .some((line) =>
      /^\s*\*?\s*(?:[-*]\s*)?(?:TODO|FIXME|HACK)\b(?:\s*\([^)]*\))?(?:\s*[:\-]|\s+\S|\s*$)/i.test(
        line,
      ),
    );
}

export function commentedCode(text, language) {
  const content = text
    .replace(/^\s*(?:\/\/|\/\*|#)\s?/, "")
    .replace(/\*\/\s*$/, "")
    .trim();
  if (!content) return false;
  // Require a statement at the start of a comment line; prose containing code
  // examples is documentation. This remains a heuristic, not intent inference.
  return content.split("\n").some((raw) => {
    const line = raw.replace(/^\s*\*\s?/, "").trim();
    if (language === "py")
      return /^(?:(?:def|class)\s+\w+\s*[:(]|(?:if|elif|for|while|with|try|except)\b[^:]*:(?:\s*(?:return\b.*|[A-Za-z_]\w*\s*=.*))?\s*$|return(?:\s+.+)?$|[A-Za-z_]\w*\s*=\s*.+|[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\s*\(.*\)\s*$)/.test(
        line,
      );
    return /^(?:(?:const|let|var|int|string|bool|double|float|decimal|void)\s+[\w$]+\s*(?:=|;|\()|(?:function|class)\s+[\w$]+\s*[({]|(?:if|for|while)\s*\(|return\b.*;\s*$|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\(.*\)\s*;\s*$)/.test(
      line,
    );
  });
}

export const constantName = (name) =>
  /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(name);
export function parameterNames(root) {
  const result = [];
  walk(root, (n) => {
    if (
      ![
        "function_declaration",
        "function_expression",
        "arrow_function",
        "function_definition",
        "method_declaration",
        "local_function_statement",
      ].includes(n.type)
    )
      return;
    for (const id of identifiers(n.childForFieldName("parameters")))
      if (!["self", "cls"].includes(id.text))
        result.push({
          name: id.text,
          line: id.startPosition.row + 1,
          code: id.text,
        });
  });
  return result;
}

// Resolve reads to lexical declarations, including captures from enclosing scopes.
// Writes and property names do not count as reads. Function references form a
// graph rooted in top-level execution (or Main), so isolated recursion is unused.
export function usageAnalysis(root, language) {
  const functionTypes = new Set(
    language === "py"
      ? ["function_definition", "lambda"]
      : language === "js"
        ? [
            "function_declaration",
            "function_expression",
            "arrow_function",
            "method_definition",
          ]
        : [
            "method_declaration",
            "local_function_statement",
            "lambda_expression",
            "constructor_declaration",
          ],
  );
  const scopeTypes = new Set([
    ...functionTypes,
    ...(language === "py"
      ? ["module", "class_definition"]
      : language === "js"
        ? ["program", "statement_block", "class_declaration", "for_statement"]
        : [
            "compilation_unit",
            "class_declaration",
            "block",
            "statement_block",
            "for_statement",
          ]),
  ]);
  const scopes = new Map(),
    bindings = [],
    declarations = new Set(),
    functions = [];
  const scopeOf = (n, skipSelf = false, onlyFunction = false) => {
    let p = skipSelf ? n.parent : n;
    while (p) {
      if (
        onlyFunction
          ? functionTypes.has(p.type) || p === root
          : scopeTypes.has(p.type)
      )
        return p;
      p = p.parent;
    }
    return root;
  };
  const add = (id, scope, type, owner = null) => {
    if (!id) return;
    const sk = key(scope);
    if (!scopes.has(sk)) scopes.set(sk, new Map());
    let binding = scopes.get(sk).get(id.text);
    if (!binding) {
      binding = {
        name: id.text,
        line: id.startPosition.row + 1,
        node: id,
        scope,
        type,
        owner,
        reads: 0,
        edges: new Set(),
        root: false,
      };
      scopes.get(sk).set(id.text, binding);
      bindings.push(binding);
    }
    declarations.add(key(id));
    return binding;
  };
  walk(root, (n) => {
    if (functionTypes.has(n.type)) {
      const id = n.childForFieldName("name");
      if (id) {
        const binding = add(id, scopeOf(n, true), "function", n);
        functions.push(binding);
        if (language === "cs" && id.text === "Main") binding.root = true;
      }
      for (const id of identifiers(n.childForFieldName("parameters")))
        add(id, n, "parameter");
    }
    if (n.type === "variable_declarator")
      for (const id of identifiers(n.childForFieldName("name"))) {
        const isVar =
          language === "js" && n.parent?.type === "variable_declaration";
        add(id, scopeOf(n, false, isVar), "variable");
      }
    if (
      language === "py" &&
      ["assignment", "augmented_assignment", "for_statement"].includes(n.type)
    )
      for (const id of identifiers(n.childForFieldName("left")))
        add(id, scopeOf(n), "variable");
  });
  const resolve = (n) => {
    let scope = scopeOf(n);
    while (scope) {
      const found = scopes.get(key(scope))?.get(n.text);
      if (found) return found;
      if (scope === root) break;
      scope = scopeOf(scope, true);
    }
    return null;
  };
  const resolveMember = (n) => {
    let current = n.parent;
    while (
      current &&
      !["class_declaration", "class_definition"].includes(current.type)
    )
      current = current.parent;
    if (!current) return null;
    const receiver = (
      n.parent?.childForFieldName("expression") ||
      n.parent?.childForFieldName("object") ||
      n.parent?.namedChild(0)
    )?.text;
    const className = current.childForFieldName("name")?.text;
    if (!["this", "self", "cls", className].includes(receiver)) return null;
    return scopes.get(key(current))?.get(n.text) || null;
  };
  walk(root, (n) => {
    const member = isMemberName(n);
    if (
      ![
        "identifier",
        "shorthand_property_identifier",
        "property_identifier",
      ].includes(n.type) ||
      declarations.has(key(n)) ||
      (n.type === "property_identifier" && !member)
    )
      return;
    const p = n.parent;
    if (
      p &&
      (([
        "assignment",
        "assignment_expression",
        "augmented_assignment",
        "augmented_assignment_expression",
      ].includes(p.type) &&
        same(p.childForFieldName("left"), n)) ||
        p.type === "update_expression")
    )
      return;
    const binding = member ? resolveMember(n) : resolve(n);
    if (!binding) return;
    binding.reads++;
    if (binding.type === "function") {
      const ownerNode = scopeOf(n, false, true),
        owner = functions.find((f) => same(f.owner, ownerNode));
      if (owner) owner.edges.add(binding);
      else binding.root = true;
    }
  });
  const reachable = new Set(),
    visit = (f) => {
      if (reachable.has(f)) return;
      reachable.add(f);
      for (const next of f.edges) visit(next);
    };
  for (const fn of functions)
    if (
      fn.root ||
      (language === "js" && fn.owner.parent?.type === "export_statement")
    )
      visit(fn);
  return {
    reads(name, line, index) {
      return (
        bindings.find(
          (b) =>
            b.name === name &&
            b.line === line &&
            (index === undefined || b.node.startIndex === index),
        )?.reads ?? 0
      );
    },
    functionUsed(name, line) {
      const fn = functions.find((b) => b.name === name && b.line === line);
      return fn ? reachable.has(fn) : false;
    },
  };
}
