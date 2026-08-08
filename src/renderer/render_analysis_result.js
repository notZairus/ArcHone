import blessed from "blessed";
import chalk from "chalk";
import { checkAuth } from "../utils/helpers.js";

const SIDE_WIDTH = 20;
const MAIN_WIDTH = 100 - SIDE_WIDTH;

export default async function displayAnalysisResult({
  fileToAnalyze,
  result,
  noteText = "Click on a finding to view the code snippet and details.",
}) {
  const screen = blessed.screen({
    width: "100%",
    smartCSR: true,
    height: "100%",
    smartCSR: true,
  });

  const container = blessed.box({
    parent: screen,
    top: "center",
    smartCSR: true,
    left: "center",
    width: "80%",
    draggable: true,
    height: "90%",
  });

  const header = await getHeader();
  const footer = await getFooter();
  const side = await getSide(noteText);
  const main = await getMain(result, screen);

  container.append(header);
  container.append(footer);
  container.append(side);
  container.append(main);

  screen.key(["escape", "q"], function (ch, key) {
    return process.exit(0);
  });

  screen.render();
}

async function getHeader() {
  const header = blessed.box({
    top: 0,
    left: 0,
    smartCSR: true,
    width: "100%",
    height: "15%",
    padding: {
      left: 2,
      right: 2,
    },
    border: "line",
    valign: "middle",
  });

  const fileAnalyzed = blessed.text({
    parent: header,
    align: "left",
    height: 2,
    valign: "middle",
    content: `${chalk.bold("File Analyzed")}: ${chalk.cyan("file.js")}`,
  });

  const language = blessed.text({
    parent: header,
    right: 0,
    align: "right",
    height: 2,
    valign: "middle",
    content: `${chalk.bold("Language")}: ${chalk.cyan("JavaScript")}`,
  });

  return header;
}

async function getSide(
  noteText = "Click on a finding to view the code snippet and details.",
) {
  const side = blessed.box({
    width: `${SIDE_WIDTH}%`,
    height: "70%",
    top: "15%",
    smartCSR: true,
    left: 0,
    align: "center",
  });

  const metrics = blessed.box({
    parent: side,
    top: 0,
    left: 0,
    smartCSR: true,
    padding: {
      left: 1,
      right: 0,
    },
    width: "100%",
    border: "line",
    height: "30%",
    content: `${chalk.bold("Metrics")}\n\n ${chalk.red("Warnings: 0")}\n ${chalk.yellow("Improvements: 0")}\n ${chalk.blue("Info: 0")}\n\n ${chalk.bold("Score: 100")}`,
  });

  const note = blessed.box({
    parent: side,
    top: "30%",
    left: 0,
    smartCSR: true,
    padding: {
      left: 1,
      right: 0,
    },
    width: "100%",
    border: "line",
    height: "30%",
    scrollable: true,
    content: `${chalk.bold("Note")}\n\n${noteText}`,
  });

  return side;
}

async function getMain(result, screen) {
  const main = blessed.box({
    width: `${MAIN_WIDTH}%`,
    height: "70%",
    top: "15%",
    smartCSR: true,
    left: `${SIDE_WIDTH + 0.5}%`,
    padding: {
      left: 1,
      right: 1,
    },
    border: "line",
  });

  const findingsView = blessed.box({
    parent: main,
    top: 0,
    left: 0,
    smartCSR: true,
    width: "97%",
    height: "90%",
    scrollable: true,
    keys: true,
    mouse: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      inverse: true,
    },
  });

  result.issues.forEach((issue, index) => {
    const issueBox = blessed.box({
      parent: findingsView,

      top: index * 7,
      width: "97%",
      height: 7,

      mouse: true,

      padding: {
        left: 1,
        right: 2,
      },

      border: "line",

      style: {
        hover: {
          bg: "gray",
        },
      },

      content:
        `${chalk.bold(index + 1 + ". " + issue.title)}\n\n` +
        `${chalk.red("Line:")} ${issue.line}\n` +
        `${chalk.yellow("Type:")} ${issue.type}\n` +
        `${chalk.blue("Message:")} ${issue.message}\n` +
        `${chalk.green("Suggestion:")} ${issue.suggestion}`,
    });

    issueBox.on("click", () => {
      showDetails(issue);
    });
  });

  const detailsView = blessed.box({
    parent: main,
    top: 0,
    left: 0,
    smartCSR: true,
    width: "97%",
    height: "90%",
    hidden: true,
    border: "line",
    scrollable: true,
    keys: true,
    mouse: true,
    padding: {
      left: 1,
      right: 1,
    },
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      inverse: true,
    },
  });

  const backButton = blessed.button({
    parent: detailsView,
    top: 0,
    right: 4,
    width: 10,
    height: 3,
    align: "center",
    valign: "middle",
    border: "line",
    content: "Close",
  });

  backButton.on("click", () => {
    showFindings();
  });

  function showDetails(issue) {
    detailsView.setContent(
      `${chalk.bold(issue.title)}\n\n` +
        `${chalk.red("Line:")} ${issue.line}\n` +
        `${chalk.yellow("Type:")} ${issue.type}\n\n` +
        `${chalk.blue("Message:")}\n${issue.message}\n\n` +
        `${chalk.green("Suggestion:")}\n${issue.suggestion}\n\n` +
        `${chalk.bold("Code:")}\n\n${issue.code}`,
    );

    findingsView.hide();
    detailsView.show();

    detailsView.focus();

    screen.render();
  }

  function showFindings() {
    detailsView.hide();
    findingsView.show();

    findingsView.focus();

    screen.render();
  }

  findingsView.focus();

  return main;
}

async function getFooter() {
  const footer = blessed.box({
    top: "85%",
    left: 0,
    smartCSR: true,
    width: "100%",
    height: 5,
    border: "line",
    valign: "middle",
    align: "center",
    content: `${chalk.bold("Press 'q', or 'Escape' to exit.")}`,
  });

  return footer;
}
