#!/usr/bin/env node

import boxen from "boxen";

//ACTIONS
import initialize from "./actions/initialize.js";
import register from "./actions/register.js";
import login from "./actions/login.js";
import about from "./actions/about.js";
import analyze from "./actions/analyze.js";
import stats from "./actions/stats.js";

const commands = [
  {
    triggers: ["init"],
    description: "Initialize the project.",
    function: initialize,
  },
  {
    triggers: ["login"],
    description: "Log in to your Archone account.",
    function: login,
  },
  {
    triggers: ["register"],
    description: "Register for an Archone account.",
    function: register,
  },
  {
    triggers: ["about"],
    description: "About Archone.",
    function: about,
  },
  {
    triggers: ["analyze"],
    description: "Analyze the a single file.",
    function: analyze,
  },
  {
    triggers: ["stats"],
    description: "Display user analysis statistics.",
    function: stats,
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
        boxen(`${commandString.join("\n")}`, {
          padding: 1,
          borderStyle: "round",
          title: "ArcHone CLI - Available Commands",
        }),
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
