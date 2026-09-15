import chalk from "chalk";
import { refreshScreen, backToMenu } from "../utils/helpers.js";
import blessed from "blessed";

export default async function about({ screen, hasActionByDefault }) {
  refreshScreen(screen);
  const aboutText = [
    `${chalk.bold("What ArcHone does")}`,
    "ArcHone is a code review assistant that scans your project for issues that make software harder to read, maintain, and extend.",
    "It analyzes source files and explains problems in plain language so you can understand what needs attention and why.",
    "",
    `${chalk.bold("What it checks for")}`,
    "- Unused variables, and dead code",
    "- Bad and language specific naming practices",
    "- Overly complex or deeply nested logic",
    "- Poor structure that hurts readability and maintainability",
    "- Repeated patterns, code smells, and design issues",
    "- Object-oriented problems such as large classes or excessive dependencies",
    "",
    `${chalk.bold("How it helps")}`,
    "- Highlights problems before they become harder to refactor",
    "- Teaches cleaner coding habits using practical standards",
    "- Helps you spot risky patterns early in development",
    "- Turns review results into clear, actionable next steps",
    "",
    `${chalk.bold("Supported workflows")}`,
    "ArcHone can analyze JavaScript, Python, and C# files, then summarize issues in a way that is easier to act on than raw lint output.",
    "",
    `${chalk.bold("How to get started")}`,
    `1. Run ${chalk.cyan("archone init")} to set up your local project configuration`,
    `2. Run ${chalk.cyan("archone login")} to authenticate your session. (Note: this step is optional if you want to use ArcHone a mere development tool, but is required for other features.)`,
    `3. Run ${chalk.cyan("archone scan")} to analyze your project or a specific directory`,
    `4. Run ${chalk.cyan("archone analyze <file>")} or ${chalk.cyan("archone scan")} to review code`,
    "5. Review the findings and apply the suggested improvements",
    "",
    `${chalk.bold("Best way to use ArcHone")}`,
    "Use it during development to catch avoidable problems early, and during review to quickly understand hotspots in a codebase.",
  ].join("\n");

  const box = blessed.box({
    parent: screen,
    left: "center",
    top: "center",
    border: {
      type: "line",
    },
    mouse: true,
    vi: true,
    keys: true,
    width: "50%",
    height: "80%",
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "grey",
      },
    },
    content: aboutText,
    padding: {
      left: 2,
      right: 2,
      top: 1,
      bottom: 1,
    },
  });

  const closeBtn = blessed.button({
    parent: box,
    width: 1,
    height: 1,
    top: -1,
    right: -1,
    content: "X",
    mouse: true,
  });

  closeBtn.on("press", () => {
    backToMenu(hasActionByDefault);
    return;
  });

  screen.render();
}
