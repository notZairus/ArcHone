import { mainBanner } from "../ui/banner.js";
import boxen from "boxen";
import chalk from "chalk";
import { CONSOLE_MAX_WIDTH } from "../constants.js";

export default async function about() {
  console.clear();
  mainBanner();

  const aboutText = [
    `${chalk.cyan("Archie:")} Welcome to ArcHone.`,
    "",
    `${chalk.bold("What ArcHone does")}`,
    "ArcHone analyzes your source files and explains bad coding practices in plain language.",
    "",
    `${chalk.bold("Bad practices ArcHone detects")}`,
    "- Unused variables, imports, and dead code",
    "- Weak naming and unclear function intent",
    "- Overly complex or deeply nested logic",
    "- Risky patterns that hurt readability or maintainability",
    "",
    `${chalk.bold("Why it helps")}`,
    "- Guides user toward cleaner and more readable code",
    "- Encourages practical industry coding standards",
    "- Turns analysis results into actionable next steps",
    "",
    `${chalk.bold("Best way to start")}`,
    `Run ${chalk.cyan("archone init")}, then ${chalk.cyan("archone login")}, and finally ${chalk.cyan("archone analyze <file>")}.`,
  ].join("\n");

  console.log(
    boxen(aboutText, {
      title: "About ArcHone",
      titleAlignment: "center",
      borderStyle: "double",
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      width: CONSOLE_MAX_WIDTH,
    }),
  );
  console.log("\n");
}
