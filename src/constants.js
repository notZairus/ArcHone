export const ignoreDirs = {
  javascript: ["node_modules", "dist", "build", "coverage"],
  python: ["__pycache__", "venv", "env", "build", "dist", ".pytest_cache"],
  java: ["target", "bin", "out", ".gradle"],
  go: ["vendor", "bin", "pkg"],
  ruby: ["vendor", "log", "tmp", "node_modules"],
  php: ["vendor", "node_modules", "cache"],
  csharp: ["bin", "obj", ".vs", "packages"],
  cpp: ["build", "bin", "obj", "vendor"],
};
