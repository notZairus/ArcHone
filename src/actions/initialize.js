import clack from "../lib/clack.js";
import fs from "fs";
import { validateGeminiApiKey } from "../utils/ai-key-validator.js";

import { deleteEnv, saveToEnv } from "../utils/env.js";
import { ignoreDirs } from "../constants.js";

export default async () => {
  if (fs.existsSync("archone.config.json")) {
    const overwrite = await clack.confirm({
      message:
        "A configuration file already exists. Do you want to overwrite it?",
    });

    if (!overwrite) {
      clack.outro("Initialization cancelled.");
      return;
    }
  }

  const config = await clack.group(
    {
      projectName: () =>
        clack.text({
          message: "Enter the name of your project:",
          placeholder: "my-awesome-project",
          validate: (value) => {
            if (!value || value.length === 0) {
              return "Project name cannot be empty.";
            }
          },
        }),
      projectType: () =>
        clack.select({
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
        }),
      aiEnabled: () =>
        clack.confirm({
          message: "Do you want to enable AI for this project?",
        }),
      aiProvider: ({ results }) => {
        if (!results.aiEnabled) return null;
        return clack.select({
          message: "Select the AI provider you want to use:",
          options: [
            { value: "openai", label: "OpenAI" },
            { value: "gemini", label: "Gemini" },
            { value: "deepseek", label: "DeepSeek" },
            { value: "default", label: "Default" },
          ],
        });
      },
      aiApiKey: ({ results }) => {
        if (!results.aiProvider) return null;
        if (results.aiProvider === "default") return null;

        return clack.text({
          message: "Enter your AI API key:",
          validate: (value) => {
            if (!value || value.length === 0) {
              return "API key cannot be empty.";
            }
          },
        });
      },
    },
    {
      onCancel: () => {
        clack.outro("Initialization cancelled.");
        process.exit(0);
      },
    },
  );

  const exclude = ignoreDirs[config.projectType] || [];

  const configToSave = {
    projectName: config.projectName,
    projectType: config.projectType,
    aiEnabled: config.aiEnabled
      ? {
          aiProvider: config.aiProvider,
        }
      : false,
    exclude: ignoreDirs[config.projectType] || [],
  };

  // test api key
  if (configToSave.aiEnabled) {
    let isValid;

    try {
      switch (configToSave.aiEnabled.aiProvider) {
        case "gemini":
          isValid = await validateGeminiApiKey(config.aiApiKey);
          break;
        case "openai":
          // TODO validate openai api key
          break;
        case "deepseek":
          // TODO validate deepseek api key
          break;
        default:
          break;
      }
    } catch (error) {}

    if (!isValid && configToSave.aiEnabled.aiProvider !== "default") {
      deleteEnv("AI_API_KEY");
      clack.outro(
        "Invalid API key provided. Please check your key and try again.",
      );
      process.exit(1);
    }

    saveToEnv("AI_API_KEY", config.aiApiKey);
  }

  fs.writeFileSync(
    "archone.config.json",
    JSON.stringify(configToSave, null, 2),
  );

  clack.outro(`Project "${config.projectName}" initialized successfully!`);
};
