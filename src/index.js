#!/usr/bin/env node

import { mainBanner } from "./ui/displays.js";
import initialize from "./actions/initialize.js";

const commands = [
  {
    triggers: ["init", "initialize", "--init", "-init"],
    function: initialize,
  },
  {
    triggers: ["help", "--help", "-h"],
    function: () => {
      console.log("Available commands:");
    },
  },
  {
    triggers: ["version", "--version", "-v"],
    function: () => {
      console.log("Version 1.0.0");
    },
  },
  {
    triggers: ["scan", "--scan", "-s"],
    function: () => {
      console.log("Scanning...");
    },
  },
  {
    triggers: ["report", "--report", "-r"],
    function: () => {
      console.log("Generating report...");
    },
  },
  {
    triggers: ["analyze", "--analyze", "-a"],
    function: () => {
      console.log("Analyzing...");
    },
  },
  {
    triggers: ["exit", "quit", "--exit", "-e"],
    function: () => {
      console.log("Exiting...");
    },
  },
];

const main = async () => {
  mainBanner();

  const action = process.argv[2];

  for (const command of commands) {
    if (command.triggers.includes(action)) {
      await command.function();
    }
  }
};

main();
