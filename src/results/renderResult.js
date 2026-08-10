import blessed from "blessed";
import chalk from "chalk";
import { log } from "../utils/helpers.js";
import { getAiConfig } from "../lib/local.js";
import {
  getGenericExplanation,
  formatGenericExplanation,
  formatCode,
} from "./modules.js";
import { explainIssueWithGemini } from "../lib/ai.js";

const SIDE_WIDTH = 20;
const MAIN_WIDTH = 100 - SIDE_WIDTH;

let globalSelectedIssue = null;
let globalResult = null;

const screen = blessed.screen({
  width: "100%",
  smartCSR: true,
  height: "100%",
  smartCSR: true,
});

screen.key(["escape", "q"], function (ch, key) {
  return process.exit(0);
});

const resultContainer = blessed.box({
  parent: screen,
  top: "center",
  smartCSR: true,
  left: "center",
  width: "90%",
  height: "90%",
});

const codeContainer = blessed.box({
  parent: screen,
  top: "center",
  smartCSR: true,
  left: "center",
  width: "90%",
  height: "90%",
});

function showResultContainer() {
  resultContainer.show();
  codeContainer.hide();

  screen.render();
}

function showCodeContainer({ currentCode, idealCode, language = "js" }) {
  resultContainer.hide();
  codeContainer.show();

  log(currentCode);
  log(idealCode);

  const codeContainerHeader = blessed.box({
    parent: codeContainer,
    top: 0,
    left: 0,
    smartCSR: true,
    width: "100%",
    height: 5,
    border: "line",
    align: "center",
    valign: "middle",
    content: `${chalk.bold("Code Comparison")}`,
  });

  const closeCodeContainerButton = blessed.button({
    parent: codeContainerHeader,
    top: 0,
    right: 0,
    width: 8,
    height: 3,
    align: "center",
    valign: "middle",
    border: "line",
    content: "Back",
  });

  closeCodeContainerButton.on("click", () => {
    showResultContainer();
  });

  const codeContainerMain = blessed.box({
    parent: codeContainer,
    top: 5,
    left: 0,
    smartCSR: true,
    width: "100%",
    height: "100%-5",
  });

  const currentCodeBox = blessed.box({
    parent: codeContainerMain,
    top: 0,
    left: 0,
    smartCSR: true,
    width: "50%",
    height: "100%",
    border: "line",
    scrollable: true,
    draggable: true,
    keys: true,
    mouse: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      inverse: true,
    },
    padding: {
      left: 1,
      right: 1,
    },
    content: `${chalk.bold("Current Code")} \n\n${formatCode(currentCode, language)}`,
  });

  const idealCodeBox = blessed.box({
    parent: codeContainerMain,
    top: 0,
    left: "50%",
    smartCSR: true,
    width: "50%",
    height: "100%",
    border: "line",
    scrollable: true,
    draggable: true,
    keys: true,
    mouse: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      inverse: true,
    },
    padding: {
      left: 1,
      right: 1,
    },
    content: `${chalk.bold("Ideal Code")} \n\n${formatCode(idealCode, globalResult.language)}`,
  });

  screen.render();
}

export default async function displayAnalysisResult({
  fileToAnalyze,
  result,
  noteText = "Click on a finding to view the code snippet and details.",
}) {
  const issuesHolder = result.issues.map((issue) => {
    const { code, ...rest } = issue;

    return {
      ...rest,
      ai: {
        explained: false,
        explanation: null,
      },
    };
  });

  const header = await getHeader();
  const footer = await getFooter();
  const side = await getSide(noteText);
  const main = await getMain(result, issuesHolder);

  resultContainer.append(header);
  resultContainer.append(footer);
  resultContainer.append(side);
  resultContainer.append(main);

  showResultContainer();
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

async function getMain(result, issuesHolder) {
  globalSelectedIssue = null;
  globalResult = result;

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

  // FINDINGS PANEL /////////////////////////////////////////

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

    issueBox.on("click", async () => {
      globalSelectedIssue = issue;

      const aiConfig = getAiConfig();

      const mainLoader = blessed.loading({
        parent: main,
        top: "center",
        left: "center",
        width: "shrink",
        height: "shrink",
        border: "line",
        align: "center",
        valign: "middle",
      });

      mainLoader.load("Asking AI about your code's issue...");

      let detailsContent = "";

      if (!aiConfig.enabled) {
        const explanation = getGenericExplanation(issue);
        detailsContent = formatGenericExplanation(explanation);
        compareCodeButton.hide();
      } else {
        try {
          const selectedIssue = issuesHolder.find(
            (i) => i.line === issue.line && i.title === issue.title,
          );

          const aiOutput = selectedIssue.ai.explained
            ? selectedIssue.ai.explanation
            : await explainIssueWithGemini(issue);

          if (!selectedIssue.ai.explained) {
            selectedIssue.ai.explained = true;
            selectedIssue.ai.explanation = aiOutput;
          }

          detailsContent = [
            `${chalk.bold(aiOutput.title)}\n`,
            `${chalk.bold("Type:")} ${aiOutput.type.toUpperCase()}`,
            `${chalk.bold("Line:")} ${aiOutput.line}`,
            `${chalk.bold("Violated Principle:")} ${aiOutput.principle}`,
            `${chalk.bold("Message:")} ${aiOutput.message}`,
            ``,
            `${chalk.bold("Explanation:")}\n${aiOutput.beginnerFriendlyExplanation}\n`,
            `${chalk.bold("What caused this issue:")}\n${aiOutput.whatPartOfTheCodeCausedIt}\n`,
            `${chalk.bold("Why this is a problem:")}\n${aiOutput.whyThisIssueMatters}\n`,
          ].join("\n");

          compareCodeButton.show();
        } catch (error) {
          const explanation = getGenericExplanation(issue);
          detailsContent = formatGenericExplanation(explanation);

          compareCodeButton.hide();
        }
      }

      mainLoader.stop();
      mainLoader.hide();

      showDetails(detailsContent);
    });
  });

  // DETAILS PANEL /////////////////////////////////////////

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

  const compareCodeButton = blessed.button({
    parent: detailsView,
    top: 0,
    right: 16,
    width: 20,
    height: 3,
    align: "center",
    valign: "middle",
    border: "line",
    content: "Compare Code",
  });

  compareCodeButton.on("click", () => {
    const issue = issuesHolder.find(
      (i) =>
        i.line === globalSelectedIssue.line &&
        i.title === globalSelectedIssue.title,
    );

    if (!globalSelectedIssue) return;
    if (!issue) return;

    showCodeContainer({
      currentCode: globalSelectedIssue.code,
      idealCode: issue.ai.explanation.suggestedFixedCode,
      language: globalResult.language,
    });
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
    content: "Back",
  });

  backButton.on("click", () => {
    showFindings();
  });

  function showFindings() {
    detailsView.hide();
    findingsView.show();

    findingsView.focus();

    screen.render();
  }

  function showDetails(content) {
    detailsView.setContent(content);

    findingsView.hide();
    detailsView.show();

    detailsView.focus();

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
