const LANGUAGE_MISMATCH_PATTERNS = {
  js: [
    {
      language: "Python",
      regex: /^\s*def\s+\w+\s*\([^\n]*\):\s*$/m,
      message:
        "This file contains Python-style function syntax, which does not match a JavaScript analysis.",
    },
    {
      language: "Python",
      regex:
        /^\s*(class|if|elif|else|for|while|try|except|finally|with)\s+.+$/m,
      message:
        "This file contains Python-style control flow syntax, which does not match a JavaScript analysis.",
    },
    {
      language: "Python",
      regex: /\b(self|True|False|None|lambda|print|input)\b/,
      message:
        "This file contains Python-style syntax, which does not match a JavaScript analysis.",
    },
    {
      language: "Java",
      regex:
        /\bpackage\s+[a-zA-Z0-9_.]+;|System\.out\.println\b|public\s+class\s+|public\s+static\s+void\s+main\b/,
      message:
        "This file contains Java-style syntax, which does not match a JavaScript analysis.",
    },
  ],
  py: [
    {
      language: "JavaScript",
      regex:
        /\b(?:const|let|var)\s+\w+\s*=|=>|function\s*\(|console\.(?:log|error|warn)\s*\(/,
      message:
        "This file contains JavaScript-style syntax, which does not match a Python analysis.",
    },
    {
      language: "JavaScript",
      regex: /^\s*(import|export)\s+/m,
      message:
        "This file contains JavaScript-style imports, which does not match a Python analysis.",
    },
    {
      language: "Java",
      regex:
        /\bpackage\s+[a-zA-Z0-9_.]+;|System\.out\.println\b|public\s+class\s+|public\s+static\s+void\s+main\b/,
      message:
        "This file contains Java-style syntax, which does not match a Python analysis.",
    },
  ],
  cs: [
    {
      language: "Python",
      regex: /^\s*def\s+\w+\s*\([^\n]*\):\s*$/m,
      message:
        "This file contains Python-style function syntax, which does not match a C# analysis.",
    },
    {
      language: "JavaScript",
      regex:
        /\b(?:const|let|var)\s+\w+\s*=|=>|function\s*\(|console\.(?:log|error|warn)\s*\(/,
      message:
        "This file contains JavaScript-style syntax, which does not match a C# analysis.",
    },
    {
      language: "Java",
      regex:
        /\bpackage\s+[a-zA-Z0-9_.]+;|System\.out\.println\b|public\s+class\s+|public\s+static\s+void\s+main\b/,
      message:
        "This file contains Java-style syntax, which does not match a C# analysis.",
    },
  ],
};

export function detectLanguageMismatch(sourceCode, targetLanguage) {
  if (!sourceCode || typeof sourceCode !== "string") {
    return null;
  }

  const patterns = LANGUAGE_MISMATCH_PATTERNS[targetLanguage] || [];
  const lines = sourceCode.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        return {
          title: "Mixed Language Syntax",
          type: "warning",
          line: index + 1,
          message: pattern.message,
          suggestion:
            "Make sure the file uses syntax that matches the language being analyzed.",
          why: "Mixing languages in one file makes the code harder to read and understand.",
          code: line.trim(),
        };
      }
    }
  }

  return null;
}
