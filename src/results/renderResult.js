import blessed from "blessed";
import chalk from "chalk";
import {
  log,
  stripCodeFences,
  refreshScreen,
  showNotification,
  getIssuesScore,
} from "../utils/helpers.js";
import { getAiConfig } from "../lib/local.js";
import process from "process";
import {
  getGenericExplanation,
  formatGenericExplanation,
  formatCode,
} from "./modules.js";
import { explainIssueWithGemini } from "../lib/ai.js";
import clipboard from "clipboardy";
import analyzeFile from "../actions/analyze.js";

const SIDE_WIDTH = 20;
const MAIN_WIDTH = 100 - SIDE_WIDTH;

let globalSelectedIssue = null;
let globalResult = null;

async function reAnalyzeFile({ screen, currentFilePath, currentMode }) {
  await showNotification({
    screen,
    message: "Re-analyzing the file...",
    duration: 500,
  });

  await analyzeFile({
    screen,
    currentFilePath,
    currentMode,
  });
}

export default async function displayAnalysisResult({
  screen,
  result,
  noteText = "Click on a finding to view the code snippet and details.",
}) {
  refreshScreen(screen);

  screen.key(["escape", "q"], function (ch, key) {
    process.exit(0);
  });

  screen.key(["r"], async function (ch, key) {
    await reAnalyzeFile({
      screen,
      currentFilePath: result.fileToAnalyze,
      currentMode: result.mode,
    });
  });

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

  async function getHeader() {
    const header = blessed.box({
      top: 0,
      left: 0,
      smartCSR: true,
      width: "100%",
      height: 5,
      padding: {
        left: 1,
        right: 1,
      },
      border: "line",
      valign: "middle",
    });

    const fileAnalyzed = blessed.box({
      parent: header,
      align: "left",
      height: 2,
      valign: "middle",
      content: `${chalk.bold("File Analyzed")}: ${chalk.cyan(result.fileToAnalyze.split("/").pop())} \t\t ${chalk.bold("Mode")}: ${chalk.cyan(result.mode)} \t\t ${chalk.bold("Language")}: ${chalk.cyan(result.language)}`,
    });

    const closeBtn = blessed.button({
      parent: header,
      content: "X",
      top: 0,
      right: 1,
      width: 3,
      height: 3,
      align: "center",
      valign: "middle",
      mouse: true,
    });

    closeBtn.on("press", () => {
      process.exit(0);
    });

    return header;
  }

  async function getSide(
    noteText = "Click on a finding to view the code snippet and details.",
  ) {
    const side = blessed.box({
      width: `${SIDE_WIDTH}%`,
      height: "85%",
      top: 5,
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
      height: 9,
      content: `${chalk.bold("Metrics")}\n\n ${chalk.red("Warnings: " + result.issues.filter((issue) => issue.type === "warning").length)}\n ${chalk.yellow("Improvements: " + result.issues.filter((issue) => issue.type === "improvement").length)}\n ${chalk.blue("Info: " + result.issues.filter((issue) => issue.type === "info").length)}\n\n ${chalk.bold("Score: " + getIssuesScore(result.issues)) + " / 100"}`,
    });

    const note = blessed.box({
      parent: side,
      top: 9,
      left: 0,
      smartCSR: true,
      padding: {
        left: 1,
        right: 1,
      },
      width: "100%",
      border: "line",
      height: "shrink",
      scrollable: true,
      content: `${chalk.bold("Note")}\n\n${noteText}`,
    });

    const buttonsContainer = blessed.box({
      parent: side,
      bottom: 0,
      left: 0,
      smartCSR: true,
      valign: "middle",
      align: "center",
      width: "100%",
      border: "line",
      height: 5,
    });

    const analyzeButton = blessed.button({
      parent: buttonsContainer,
      bottom: 0,
      left: "center",
      valign: "middle",
      width: "90%",
      height: 3,
      content: "Re-analyze",
      style: {
        hover: {
          bg: "gray",
        },
      },
      border: "line",
    });

    analyzeButton.on("click", async () => {
      await reAnalyzeFile({
        screen,
        currentFilePath: result.fileToAnalyze,
        currentMode: result.mode,
      });
    });

    return side;
  }

  async function getMain() {
    globalSelectedIssue = null;
    globalResult = result;

    const main = blessed.box({
      width: `${MAIN_WIDTH}%`,
      height: "85%",
      top: 5,
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

    if (result.issues.length <= 0) {
      const noIssues = blessed.box({
        parent: findingsView,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        content: `No issue found. The current state of file: ${chalk.bold(result.fileToAnalyze.split("/").pop())} on ${chalk.bold(result.mode)} mode is great!`,
        align: "center",
        valign: "middle",
      });
    } else {
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
    }

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

    const idealCodeBoxContainer = blessed.box({
      parent: codeContainerMain,
      top: 0,
      left: "50%",
      smartCSR: true,
      width: "50%",
      height: "100%",
    });

    const idealCodeBox = blessed.box({
      parent: idealCodeBoxContainer,
      top: 0,
      left: 0,
      smartCSR: true,
      width: "100%",
      height: "100%",
      border: "line",
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
      padding: {
        left: 1,
        right: 1,
      },
      content: `${chalk.bold("Ideal Code")} \n\n${formatCode(idealCode, globalResult.language)}`,
    });

    const copyButton = blessed.button({
      parent: idealCodeBoxContainer,
      bottom: 2,
      right: 4,
      width: 12,
      height: 3,
      align: "center",
      valign: "middle",
      border: "line",
      content: "Copy Code",
    });

    copyButton.on("click", () => {
      clipboard.writeSync(stripCodeFences(idealCode));
    });

    screen.render();
  }

  const header = await getHeader();
  // const footer = await getFooter();
  const side = await getSide(noteText);
  const main = await getMain({ result, issuesHolder, screen });

  resultContainer.append(header);
  // resultContainer.append(footer);
  resultContainer.append(side);
  resultContainer.append(main);

  showResultContainer();
}
