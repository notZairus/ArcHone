#!/usr/bin/env node

import { mainBanner } from "./ui/banner.js";
import boxen from "boxen";

//ACTIONS
import initialize from "./actions/initialize.js";
import scan from "./actions/scan.js";
import analyze from "./actions/analyze.js";

const commands = [
  {
    triggers: ["init"],
    description: "Initialize the project.",
    function: initialize,
  },
  {
    triggers: ["analyze"],
    description: "Analyze the a single file.",
    function: analyze,
  },
  {
    triggers: ["analyze-folder"],
    description: "Analyze a specific folder",
    function: () => {
      console.log("Analyzing folder...");
    },
  },
  {
    triggers: ["help"],
    description: "Display the available commands.",
    function: () => {
      const commandString = commands.map((command) => {
        return `- ${command.triggers.join(", ")}`;
      });

      console.log("\n");

      console.log(
        boxen(
          `${commandString.join("\n")}\n\nArchie says: "Only use the available commands or I'll start debugging your dreams!"`,
          {
            padding: 1,
            borderColor: "green",
            borderStyle: "round",
            title: "(^‿^): Archie here, ready to serve (and sass)!",
          },
        ),
      );

      console.log("\n");
    },
  },
  {
    triggers: ["version"],
    description: "Display the current version of the tool.",
    function: async () => {
      console.log("Checking version...");
    },
  },
];

const main = async () => {
  const action = process.argv[2];

  for (const command of commands) {
    if (command.triggers.includes(action)) {
      await command.function();
    }
  }
};

main().catch((err) => {
  console.error("An error occurred:", err);
});
