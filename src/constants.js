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

export const ARCHONE_DIR_PATH = path.join(process.cwd(), "archone");

export const VALID_FILE_EXTENSIONS = ["js", "cpp", "cs", "vb", "py"];



export const APPWRITE_DATABASE_ID = "69b86a1600132cab3e71";


export const ARCHONE_DIR = path.join(os.homedir(), ".archone");