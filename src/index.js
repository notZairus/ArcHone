#!/usr/bin/env node

import boxen from "boxen";
import figlet from "figlet";
import chalk from "chalk";
import { CONSOLE_MAX_WIDTH } from "./constants.js";
import {
  isInitialized,
  refreshScreen,
  wait,
  showNotification,
} from "./utils/helpers.js";
import { box, boxError, boxSuccess } from "./ui/box.js";
import initialize from "./actions/initialize.js";
import blessed from "blessed";

import commands from "./actions/barrel.js";

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
    const sizes = {
      titleBox: 21,
      footerBox: 20,
      commandBox: 100 - 21 - 20,
    };

    const container = blessed.box({
      parent: screen,
      top: "center",
      left: "center",
      width: "50%",
      height: "80%",
    });

    const titleBox = blessed.box({
      parent: container,
      border: {
        type: "line",
      },
      left: "center",
      width: "100%",
      height: `${sizes.titleBox}%`,
      content: chalk.bold(
        figlet.textSync("ArcHone", {
          font: "Small",
        }),
      ),
      tags: true,
    });

    const closeButton = blessed.button({
      parent: container,
      mouse: true,
      keys: true,
      shrink: true,
      content: "X",
      right: 2,
      top: 1,
    });

    closeButton.on("press", () => {
      process.exit(0);
    });

    const commandBox = blessed.box({
      parent: container,
      top: `${sizes.titleBox}%`,
      left: "center",
      width: "100%",
      height: `${sizes.commandBox}%`,
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
