#!/usr/bin/env node

import chalk from "chalk";
import {
  log,
  isInitialized,
  refreshScreen,
  showNotification,
} from "./utils/helpers.js";
import initialize from "./actions/initialize.js";
import blessed from "blessed";
import tty from "tty";
import { putHeader } from "./ui/components.js";

import commands from "./actions/barrel.js";

if (process.platform === "win32") {
  const { setFdMode, VTINPUT } = tty;

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdout.write("\x1b[?1000h\x1b[?1006h");
}

const screen = blessed.screen({
  width: "100%",
  height: "100%",
  smartCSR: true,
  mouse: true, // IMPORTANT: Enables mouse clicks on buttons
  cursor: {
    synthetic: true,
    hidden: false,
  },
});

async function getUserAction() {
  refreshScreen(screen);
  return new Promise((resolve) => {
    const container = blessed.box({
      parent: screen,
      top: "center",
      left: "center",
      width: "80%",
      height: "90%",
    });

    putHeader(container, "ArchOne - CLI Code Analyzer");

    const gettingStared = blessed.box({
      parent: container,
      top: 3,
      width: "50%",
      height: `50%-3`,
      border: {
        type: "line",
      },
      label: chalk.bold(" Getting Started "),
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        track: {
          bg: "gray",
        },
        style: {
          inverse: true,
        },
      },
    });

    const codeAnalysis = blessed.box({
      parent: container,
      top: 3,
      left: "50%",
      width: "50%",
      height: `50%-3`,
      border: {
        type: "line",
      },
      label: chalk.bold(" Code Analysis "),
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        track: {
          bg: "gray",
        },
        style: {
          inverse: true,
        },
      },
    });

    const accountAndAccess = blessed.box({
      parent: container,
      top: "50%",
      width: "50%",
      height: `50%-3`,
      border: {
        type: "line",
      },
      label: chalk.bold(" Account & Access "),
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        track: {
          bg: "gray",
        },
        style: {
          inverse: true,
        },
      },
    });

    const issuesLearning = blessed.box({
      parent: container,
      top: "50%",
      left: "50%",
      width: "50%",
      height: `50%-3`,
      border: {
        type: "line",
      },
      label: chalk.bold(" --- "),
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        track: {
          bg: "gray",
        },
        style: {
          inverse: true,
        },
      },
    });

    commands
      .filter((cmd) => cmd.category === "Getting Started")
      .forEach((cmd, i) => {
        const commandText = `${chalk.bold(cmd.triggers.join(", "))} - ${cmd.description}`;

        const commandLine = blessed.box({
          parent: gettingStared,
          top: i * 7,
          width: "100%-5",
          height: 7,
          mouse: true,
          border: {
            type: "line",
          },
          padding: {
            left: 1,
            right: 1,
          },
          style: {
            hover: {
              bg: "gray",
            },
          },
          content: commandText,
        });
        commandLine.on("click", async () => {
          log("Command clicked:", cmd.triggers[0]);
          const action = cmd.triggers[0];
          resolve(action);
        });
      });

    commands
      .filter((cmd) => cmd.category === "Code Analysis")
      .forEach((cmd, i) => {
        const commandText = `${chalk.bold(cmd.triggers.join(", "))} - ${cmd.description}`;

        const commandLine = blessed.box({
          parent: codeAnalysis,
          top: i * 7,
          width: "100%-5",
          height: 7,
          mouse: true,
          border: {
            type: "line",
          },
          padding: {
            left: 1,
            right: 1,
          },
          style: {
            hover: {
              bg: "gray",
            },
          },
          content: commandText,
        });
        commandLine.on("click", async () => {
          const action = cmd.triggers[0];
          resolve(action);
        });
      });

    commands
      .filter((cmd) => cmd.category === "Account & Access")
      .forEach((cmd, i) => {
        const commandText = `${chalk.bold(cmd.triggers.join(", "))} - ${cmd.description}`;

        const commandLine = blessed.box({
          parent: accountAndAccess,
          top: i * 7,
          width: "100%-5",
          height: 7,
          mouse: true,
          border: {
            type: "line",
          },
          padding: {
            left: 1,
            right: 1,
          },
          style: {
            hover: {
              bg: "gray",
            },
          },
          content: commandText,
        });
        commandLine.on("click", async () => {
          const action = cmd.triggers[0];
          resolve(action);
        });
      });

    commands
      .filter((cmd) => cmd.category === "Results & Learning")
      .forEach((cmd, i) => {
        const commandText = `${chalk.bold(cmd.triggers.join(", "))} - ${cmd.description}`;

        const commandLine = blessed.box({
          parent: issuesLearning,
          top: i * 7,
          width: "100%-5",
          height: 7,
          mouse: true,
          border: {
            type: "line",
          },
          padding: {
            left: 1,
            right: 1,
          },
          style: {
            hover: {
              bg: "gray",
            },
          },
          content: commandText,
        });
        commandLine.on("click", async () => {
          const action = cmd.triggers[0];
          resolve(action);
        });
      });

    screen.render();
    gettingStared.focus();
  });
}

async function main() {
  let action = process.argv[2];

  if (!isInitialized() && action !== "init") {
    await initialize({ screen });
  }

  if (!action) {
    action = await getUserAction();
  }

  const commandsStringArray = commands.map((cmd) => cmd.triggers).flat();

  if (action && !commandsStringArray.includes(action)) {
    refreshScreen(screen);
    const message = `${chalk.red(
      `Invalid command: ${action}\n\nPlease select a valid command from the list.`,
    )}\n\n Type "archone" to see the list of available commands.`;
    await showNotification({ screen, message, title: "Invalid Command" });
    process.exit(1);
  }

  for (const command of commands) {
    if (command.triggers.includes(action)) {
      refreshScreen(screen);
      await command.function({ screen: screen });
    }
  }
}

main().catch((err) => {
  console.error("An error occurred:", err);
});
