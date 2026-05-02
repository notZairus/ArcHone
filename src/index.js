#!/usr/bin/env node

import boxen from "boxen";
import figlet from "figlet";
import chalk from "chalk";
import { CONSOLE_MAX_WIDTH } from "./constants.js";
import { isInitialized } from "./utils/helpers.js";
import { box, boxError, boxSuccess } from "./ui/box.js";

import commands from "./actions/barrel.js";

async function main() {
  console.clear();

  if (!isInitialized()) {
    await initialize();
  }

  const action = process.argv[2];

  if (!action) {
    box(
      "Please provide a command. Use 'help' to see the available commands.",
      "Archone CLI",
      "left",
    );
    console.log("\n");

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
