#!/usr/bin/env node

import boxen from "boxen";
import figlet from "figlet";
import chalk from "chalk";
import { CONSOLE_MAX_WIDTH } from "./constants.js";

//ACTIONS
import initialize from "./actions/initialize.js";
import register from "./actions/register.js";
import login from "./actions/login.js";
import about from "./actions/about.js";
import analyze from "./actions/analyze.js";
import explain from "./actions/teach.js";
import stats from "./actions/stats.js";
import scan from "./actions/scan.js";
import whoami from "./actions/whoami.js";
import issues from "./actions/issues.js";

const commands = [
  {
    triggers: ["init"],
    description:
      "Set up ArcHone in the current project by creating the required local configuration and startup files.",
    function: initialize,
  },
  {
    triggers: ["login"],
    description:
      "Authenticate with your ArcHone account so this CLI can access your saved profile and cloud features.",
    function: login,
  },
  {
    triggers: ["register"],
    description:
      "Create a new ArcHone account and connect it to this CLI so you can start analyzing files right away.",
    function: register,
  },
  {
    triggers: ["about"],
    description:
      "Show an overview of ArcHone, including what the tool does and how it helps with code analysis.",
    function: about,
  },
  {
    triggers: ["stats"],
    description:
      "Display your personal analysis metrics, such as scan activity and usage patterns from previous runs.",
    function: stats,
  },
  {
    triggers: ["who"],
    description:
      "Show the authenticated ArcHone user from your local session file.",
    function: whoami,
  },
  {
    triggers: ["issues"],
    description:
      "Show student-friendly lessons for each detectable issue, including why it matters and how to fix it.",
    function: issues,
  },
  {
    triggers: ["help"],
    description:
      "Open Archie assistant mode to see command explanations, practical hints, and quick-start guidance.",
    function: () => {
      const contentWidth = Math.max(56, CONSOLE_MAX_WIDTH - 10);

      const wrapText = (text, width) => {
        const words = text.split(" ");
        const lines = [];
        let currentLine = "";

        for (const word of words) {
          const candidate = currentLine ? `${currentLine} ${word}` : word;
          if (candidate.length <= width) {
            currentLine = candidate;
          } else {
            if (currentLine) {
              lines.push(currentLine);
            }
            currentLine = word;
          }
        }

        if (currentLine) {
          lines.push(currentLine);
        }

        return lines;
      };

      const commandRows = commands
        .filter((command) => !command.triggers.includes("help"))
        .map((command) => {
          const triggerLabel = `- ${command.triggers.join(", ")}`.padEnd(
            14,
            " ",
          );
          const wrappedDescription = wrapText(
            command.description,
            contentWidth - 14,
          );

          return wrappedDescription
            .map((line, index) => {
              return `${index === 0 ? triggerLabel : " ".repeat(14)}${line}`;
            })
            .join("\n");
        });

      const archieHeader = figlet.textSync("Archone", {
        font: "Small Slant",
        horizontalLayout: "default",
        verticalLayout: "default",
      });

      const archieIntro = [
        "(^_^): Hi, I am Archie, your ArcHone assistant.",
        "Here is a quick guide to everything you can run:",
      ].join("\n");

      const usageHints = [
        "Try running the 'archone analyze' command to get started with your first analysis.",
        "Need this panel again? Run: archone help",
      ]
        .flatMap((hint) => wrapText(hint, contentWidth))
        .join("\n");

      const helpPanel = [
        archieIntro,
        "",
        chalk.bold("Commands"),
        commandRows.join("\n"),
        "",
        chalk.bold("Quick Hints"),
        usageHints,
      ].join("\n");

      console.log("\n");
      console.log(archieHeader);
      console.log(
        boxen(helpPanel, {
          width: CONSOLE_MAX_WIDTH,
          padding: { top: 1, right: 2, bottom: 1, left: 2 },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          borderStyle: "double",
          title: "ArcHone CLI Guide",
          titleAlignment: "center",
        }),
      );
      console.log("\n");
    },
  },
  {
    triggers: ["version"],
    description:
      "Show the currently installed ArcHone CLI version so you can confirm updates and compatibility.",
    function: async () => {
      console.log("Checking version...");
    },
  },
  {
    triggers: ["analyze"],
    description:
      "Run ArcHone analysis on a specific source file and return insights about code quality, structure, and issues.",
    function: analyze,
  },
  {
    triggers: ["scan"],
    description:
      "Analyze all supported source files in a directory and show an aggregated issue summary.",
    function: scan,
  },
  {
    triggers: ["explain"],
    description:
      "Get a detailed explanation of a specific good practices issue of the latest analysis, including why it matters and how to fix it.",
    function: explain,
  },
];

async function main() {
  const action = process.argv[2];

  if (!action) {
    console.log(
      "Please provide a command. Use 'help' to see the available commands.",
    );
    return;
  }

  for (const command of commands) {
    if (command.triggers.includes(action)) {
      await command.function();
    }
  }
}

main().catch((err) => {
  console.error("An error occurred:", err);
});
