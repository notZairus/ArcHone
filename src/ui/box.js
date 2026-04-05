import boxen from "boxen";
import chalk from "chalk";
import { CONSOLE_MAX_WIDTH } from "../constants.js";

export function boxSuccess(text = "Text Placeholder") {
  console.log("\n");

  console.log(
    boxen(chalk.green("(≧◡≦): " + text), {
      borderColor: "green",
      padding: 1,
      width: CONSOLE_MAX_WIDTH,
      borderStyle: "round",
    }),
  );

  console.log("\n");
}

export function boxError(text = "Text Placeholder") {
  console.log("\n");

  console.log(
    boxen(chalk.red("(≧︿≦): " + text), {
      borderColor: "red",
      padding: 1,
      width: CONSOLE_MAX_WIDTH,
      borderStyle: "round",
    }),
  );

  console.log("\n");
}
