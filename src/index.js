#!/usr/bin/env node

import chalk from "chalk";
import {
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
      width: "50%",
      height: "80%",
    });

    putHeader(container, "ArchOne - CLI Code Analyzer");

    const commandBox = blessed.box({
      parent: container,
      top: 3,
      left: "center",
      width: "100%",
      height: `100%-3`,
      border: {
        type: "line",
      },
      label: chalk.bold(" Available Commands "),
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

    for (let i = 0; i < commands.length; i++) {
      const commandText = `${chalk.bold(commands[i].triggers.join(", "))} - ${commands[i].description}`;

      const commandLine = blessed.box({
        parent: commandBox,
        top: i * 4,
        width: "96%",
        height: 4,
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
        const action = commands[i].triggers[0];
        resolve(action);
      });
    }

    screen.render();
    commandBox.focus();
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
