import path from "path";
import os from "os";

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
