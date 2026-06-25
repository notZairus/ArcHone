import { box } from "../ui/box.js";
import { CONSOLE_MAX_WIDTH } from "../constants.js";
import commands from "./barrel.js";
import figlet from "figlet";
import chalk from "chalk";

export default () => {
  console.clear();
  const contentWidth = Math.max(56, CONSOLE_MAX_WIDTH - 10);

  const wrapText = (text, width) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= width) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  const commandRows = commands
    .filter((command) => !command.triggers.includes("help"))
    .map((command) => {
      const triggerLabel = `- ${command.triggers.join(", ")}`.padEnd(14, " ");
      const wrappedDescription = wrapText(
        command.description,
        contentWidth - 14,
      );

      return wrappedDescription
        .map((line, index) => {
          return `${index === 0 ? triggerLabel : " ".repeat(14)}${line}`;
        })
        .join("\n");
    });

  const intro = ["Here is a quick guide to everything you can run:"].join("\n");

  const usageHints = [
    "Try running the 'archone analyze' command to get started with your first analysis.",
    "Need this panel again? Run: archone help",
  ]
    .flatMap((hint) => wrapText(hint, contentWidth))
    .join("\n");

  const helpPanel = [
    intro,
    "",
    chalk.bold("Commands"),
    "",
    commandRows.join("\n\n"),
    "",
    chalk.bold("Quick Hints"),
    usageHints,
  ].join("\n");

  box(helpPanel, "ArcHone CLI Guide");
};
