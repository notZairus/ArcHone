import path from "path";
import os from "os";

export const CONSOLE_MAX_WIDTH = Math.min(
  process.stdout.columns - 20 || 100,
  100,
);

export const ignoreDirs = {
  javascript: ["node_modules", "dist", "build", "coverage", ".archone"],
  python: [
    "__pycache__",
    "venv",
    "env",
    "build",
    "dist",
    ".pytest_cache",
    ".archone",
  ],
  java: ["target", "bin", "out", ".gradle", ".archone"],
  go: ["vendor", "bin", "pkg", ".archone"],
  ruby: ["vendor", "log", "tmp", "node_modules", ".archone"],
  php: ["vendor", "node_modules", "cache", ".archone"],
  csharp: ["bin", "obj", ".vs", "packages", ".archone"],
  cpp: ["build", "bin", "obj", "vendor", ".archone"],
};

export const IGNORED_FILE_NAMES = [
  "node_modules",
  ".vscode",
  ".git",
  ".gitignore",
  ".env",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "Gemfile.lock",
  "composer.lock",
  "requirements.txt",
  "Pipfile.lock",
  "go.mod",
  "go.sum",
  "vendor",
  "package.json",
  "composer.json",
  "Pipfile",
  "go.mod",
  "go.sum",
  "dist",
  "build",
  "coverage",
  ".archone",
  "__pycache__",
  "venv",
  "env",
  ".pytest_cache",
  "target",
  "bin",
  "out",
  ".gradle",
  "vendor",
  "pkg",
  "log",
  "tmp",
  "cache",
  "obj",
  ".vs",
  "packages",
];

export const ARCHONE_DIR_PATH = path.join(process.cwd(), "archone");

export const VALID_FILE_EXTENSIONS = ["js", "cs", "py"];

export const APPWRITE_DATABASE_ID = "69b86a1600132cab3e71";

export const ARCHONE_DIR = path.join(os.homedir(), ".archone");

/// formatter.js constants

export const BASE_ISSUE_PENALTIES = [
  {
    title: "High Complexity",
    penalty: 2.0,
  },
  {
    title: "Deep Nesting",
    penalty: 1.5,
  },
  {
    title: "Function Too Long",
    penalty: 1.25,
  },
  {
    title: "Too Many Parameters",
    penalty: 1.0,
  },
  {
    title: "Name Reuse",
    penalty: 0.75,
  },
  {
    title: "Poor Variable Naming",
    penalty: 0.75,
  },
  {
    title: "Naming Convention",
    penalty: 0.75,
  },
  {
    title: "Commented-out Code",
    penalty: 0.5,
  },
  {
    title: "TODO Comment",
    penalty: 0.2,
  },
];

export const LANGUAGE_ISSUE_PENALTIES = {
  javascript: [
    {
      title: "Use of var",
      penalty: 0.25,
    },
  ],
};

export const DEFAULT_PENALTY_BY_TYPE = {
  critical: 2.5,
  error: 2.0,
  warning: 1.0,
  improvement: 0.75,
  info: 0.25,
};

export const DEFAULT_FALLBACK_PENALTY = 0.75;

export const SEVERITY_RANK = {
  critical: 0,
  error: 1,
  warning: 2,
  improvement: 3,
  info: 4,
  hint: 5,
  style: 6,
};

export const UNKNOWN_SEVERITY_RANK = 50;

export const TYPE_DISPLAY_ORDER = [
  "critical",
  "error",
  "warning",
  "improvement",
  "info",
  "hint",
  "style",
  "unknown",
];

export const LANGUAGE_BY_EXTENSION = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  cs: "csharp",
};
