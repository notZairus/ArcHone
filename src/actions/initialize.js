import clack from "../configs/clack.js";
import fs from "fs";

const ignoreDirs = {
  javascript: ["node_modules", "dist", "build", "coverage"],
  python: ["__pycache__", "venv", "env", "build", "dist", ".pytest_cache"],
  java: ["target", "bin", "out", ".gradle"],
  go: ["vendor", "bin", "pkg"],
  ruby: ["vendor", "log", "tmp", "node_modules"],
  php: ["vendor", "node_modules", "cache"],
  csharp: ["bin", "obj", ".vs", "packages"],
  cpp: ["build", "bin", "obj", "vendor"],
};

export default async () => {
  if (fs.existsSync("archone.config.json")) {
    const overwrite = await clack.confirm({
      message:
        "A configuration file already exists. Do you want to overwrite it?",
    });

    if (!overwrite) {
      clack.log("Initialization cancelled.");
      return;
    }
  }

  const projectName = await clack.text({
    message: "Enter the name of your project:",
    placeholder: "my-awesome-project",
  });

  const projectType = await clack.select({
    message: "Select the type of project you want to initialize:",
    options: [
      { value: "javascript", label: "Javascript" },
      { value: "python", label: "Python" },
      { value: "java", label: "Java" },
      { value: "go", label: "Go" },
      { value: "ruby", label: "Ruby" },
      { value: "php", label: "PHP" },
      { value: "csharp", label: "C#" },
      { value: "cpp", label: "C++" },
    ],
  });

  const aiEnabled = await clack.confirm({
    message: "Do you want to enable AI features for this project?",
  });

  const exclude = ignoreDirs[projectType] || [];

  const config = {
    projectName,
    projectType,
    aiEnabled,
    exclude,
  };

  fs.writeFileSync("archone.config.json", JSON.stringify(config, null, 2));
};
