import boxen from "boxen";
import chalk from "chalk";
import { CONSOLE_MAX_WIDTH } from "../constants.js";
import { mainBanner } from "./banner.js";

export function boxSuccess(text = "Text Placeholder") {
  console.log("\n");

  console.log(
    boxen(text, {
      padding: 1,
      width: CONSOLE_MAX_WIDTH,
    }),
  );

  console.log("\n");
}

export function boxError(text = "Text Placeholder") {
  console.log("\n");

  console.log(
    boxen(chalk.red(text), {
      borderColor: "red",
      padding: 1,
      width: CONSOLE_MAX_WIDTH,
    }),
  );

  console.log("\n");
}

export function box(
  text = "Text PlaceHolder",
  title = "",
  alignment = "left",
  style = "double",
  banner = false,
  padding = 1,
) {
  !banner && console.log("\n");
  banner && mainBanner();
  console.log(
    boxen(text, {
      padding: padding,
      width: CONSOLE_MAX_WIDTH,
      borderStyle: style || "double",
      title: chalk.bold(title.toUpperCase()),
      titleAlignment: alignment || "left",
    }),
  );
}

export function boxSilent({
  text = "Text PlaceHolder",
  title = "",
  alignment = "left",
  style = "double",
  banner = false,
  padding = 1,
}) {
  !banner && console.log("\n");
  banner && mainBanner();
  return boxen(text, {
    padding: padding,
    width: CONSOLE_MAX_WIDTH,
    borderStyle: style || "double",
    title: chalk.bold(title.toUpperCase()),
    titleAlignment: alignment || "left",
  });
}
