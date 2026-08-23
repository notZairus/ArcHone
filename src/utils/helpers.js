import fs from "fs";
import path from "path";
import chalk from "chalk";
import boxen from "boxen";
import { CONSOLE_MAX_WIDTH, ARCHONE_DIR, CONFIG_PATH } from "../constants.js";
import { getSession } from "./session.js";
import blessed from "blessed";
import figlet from "figlet";
import { execSync } from "child_process";
import {
  DEFAULT_PENALTY_BY_TYPE,
  DEFAULT_FALLBACK_PENALTY,
} from "../constants.js";
import { putHeader } from "../ui/components.js";

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getIssuesScore = (issues) => {
  let score = 100;

  for (const issue of issues) {
    const penalty =
      DEFAULT_PENALTY_BY_TYPE[issue.type] || DEFAULT_FALLBACK_PENALTY;
    score -= penalty;
  }

  return Math.max(score, 0);
};

export function refreshScreen(screen) {
  for (const child of [...screen.children]) {
    child.detach();
    child.destroy();
  }
}

export function refreshBox(box) {
  for (const child of [...box.children]) {
    child.detach();
    child.destroy();
  }
}

export async function selectFileFromDirectory({ directory, screen }) {
  refreshScreen(screen);
  return new Promise((resolve) => {
    const container = blessed.box({
      parent: screen,
      top: "center",
      left: "center",
      width: "50%",
      height: "80%",
    });

    putHeader(container, "ArcHne Analyze");

    const fileManager = blessed.filemanager({
      parent: container,
      cwd: directory,
      width: "100%",

      top: 3,
      height: `100%-3`,
      left: "center",

      border: "line",

      keys: true,
      vi: true,
      mouse: true,
      label: chalk.bold(" Select a File "),

      padding: {
        top: 1,
        left: 1,
        right: 1,
      },

      style: {
        selected: {
          bg: "blue",
          fg: "white",
        },

        item: {
          fg: "white",
        },
      },
    });

    // User selected a file
    fileManager.on("file", (filePath) => {
      refreshScreen(screen);
      resolve(filePath);
    });

    // ESC / cancel
    fileManager.on("cancel", () => {
      refreshScreen(screen);
      resolve(null);
    });

    screen.key(["escape", "C-c", "q"], () => {
      refreshScreen(screen);
      resolve(null);
    });

    fileManager.refresh(directory, () => {
      fileManager.focus();
      screen.render();
    });

    screen.render();
  });
}

export function selectAnalysisMode({ screen }) {
  refreshScreen(screen);

  return new Promise((resolve) => {
    const container = blessed.box({
      parent: screen,
      top: "center",
      left: "center",
      width: "50%",
      height: "50%",
    });

    putHeader(container, "ArcHone Analyze");

    const modes = [
      {
        value: "general",
        label: "General",
        hint: "General code issues (functions, variables, complexity, etc.)",
      },
      {
        value: "oop",
        label: "OOP",
        hint: "OOP smells (constructor, dependencies, responsibilities, etc.)",
      },
      {
        value: "complexity",
        label: "Complexity",
        hint: "Code complexity (time complexity and space complexity)",
      },
    ];

    const list = blessed.list({
      parent: container,

      top: 3,
      left: "center",
      width: "100%",
      height: `100%-3`,
      padding: {
        top: 1,
        left: 1,
        right: 1,
      },

      label: " Choose Analysis Mode ",

      border: "line",

      keys: true,
      vi: true,
      mouse: true,

      items: modes.map((mode) => `${mode.label} - ${mode.hint}`),

      style: {
        selected: {
          bg: "blue",
          fg: "white",
        },

        item: {
          fg: "white",
        },
      },

      tags: true,
    });

    list.focus();

    list.on("select", (_, index) => {
      const selectedMode = modes[index];
      refreshScreen(screen);
      resolve(selectedMode.value);
    });

    screen.key(["escape", "C-c", "q"], () => {
      refreshScreen(screen);
      resolve(null);
    });

    screen.render();
  });
}

export function sortIssuesBySeverity(issues) {
  const severityRank = {
    warning: 3,
    improvement: 2,
    info: 1,
  };

  return issues.sort((issueA, issueB) => {
    const rankA = severityRank[issueA.type] || 0;
    const rankB = severityRank[issueB.type] || 0;

    if (rankA !== rankB) {
      return rankB - rankA;
    }

    return (issueA.line || 0) - (issueB.line || 0);
  });
}

export function isInitialized() {
  return fs.existsSync(ARCHONE_DIR) && fs.existsSync(CONFIG_PATH)
    ? true
    : false;
}

export function isLoggedIn() {
  const session = getSession();

  if (!session.userId) {
    return false;
  }

  console.log(
    boxen(
      `${chalk.green("You are already logged in.")}\n\nWelcome back, ${chalk.bold(
        session.name,
      )}! Your ArcHone CLI is connected to your account on this machine.`,
      {
        padding: 1,
        width: CONSOLE_MAX_WIDTH,
        borderStyle: "round",
        title: "Already Logged In",
      },
    ) + "\n",
  );

  return true;
}

export async function validateApiKey(provider, apiKey) {
  try {
    let response;

    switch (provider) {
      case "openai":
        response = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        return response.ok;

      case "gemini":
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
          {
            method: "GET",
          },
        );

        return response.ok;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error("API key validation failed:", error);
    return false;
  }
}

export async function checkAuth() {
  const { userId } = await getSession();
  return userId;
}

export function log(data, title = "Debug Alert") {
  const logFilePath = path.join(process.cwd(), "main.log");

  const entry = {
    date: `${new Date().toISOString()}`,
    title: title,
    data: data,
  };

  try {
    fs.appendFileSync(logFilePath, JSON.stringify(entry) + "\n", "utf8");
  } catch (error) {}
}

export function stripCodeFences(codeString) {
  const trimmed = codeString.trim();

  // Check if string starts and ends with ```
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    return trimmed
      .replace(/^```[^\n]*\n?/, "") // Removes starting ``` plus any language identifier and newline
      .replace(/\n?```$/, ""); // Removes trailing ``` and optional preceding newline
  }

  return codeString; // Return as-is if no code fences are found
}

export function readClipboard() {
  switch (process.platform) {
    case "darwin":
      // macOS uses pbpaste
      return execSync("pbpaste", { encoding: "utf8" });

    case "win32":
      // Windows uses PowerShell Get-Clipboard
      return execSync('powershell -command "Get-Clipboard"', {
        encoding: "utf8",
      }).trim();

    case "linux":
      // Linux requires xclip or xsel installed on the system
      return execSync("xclip -selection clipboard -o", { encoding: "utf8" });

    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export async function showNotification({ screen, message, duration = 2000 }) {
  const box = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    height: "shrink",
    width: "35%",
    border: {
      type: "line",
    },
    padding: {
      top: 1,
      bottom: 1,
      left: 2,
      right: 2,
    },
    content: message,
    tags: true,
  });

  screen.render();
  await wait(duration);
  box.destroy();
  screen.render();
}

export function colorSeverity(type) {
  const lowerType = type.toLowerCase();
  if (lowerType === "warning") {
    return chalk.red("Warning");
  }

  if (lowerType === "improvement") {
    return chalk.yellow("Improvement");
  }

  if (lowerType === "info") {
    return chalk.blue("Info");
  }

  return chalk.yellow("Unknown");
}

export function cleanFileName(fileName) {
  const splitted = fileName.replace("\\", "/").split("/");
  return splitted[splitted.length - 1];
}
