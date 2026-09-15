import blessed from "blessed";
import chalk from "chalk";
import {
  log,
  stripCodeFences,
  refreshScreen,
  showNotification,
  getIssuesScore,
  hideScreenChildren,
  showScreenChildren,
  wait,
  backToMenu,
} from "../utils/helpers.js";
import { getAiConfig } from "../lib/local.js";
import process from "process";
import {
  getGenericExplanation,
  formatGenericExplanation,
  formatCode,
} from "./modules.js";
import { explainIssueWithAI } from "../lib/ai.js";
import clipboard from "clipboardy";
import analyzeFile from "../actions/analyze.js";
import scanDirectory from "../actions/scan.js";
import userArchive from "../actions/archive.js";
import Database from "../lib/db.js";
import displayAnalysisFeedbacks from "./analysisFeedbacks.js";
import { putHeader } from "../ui/components.js";
import fs from "fs";
import path from "path";

const SIDE_WIDTH = 20;
const MAIN_WIDTH = 100 - SIDE_WIDTH;

let globalSelectedIssue = null;
let globalResult = null;

async function reAnalyzeFile({
  screen,
  hasActionByDefault,
  currentFilePath,
  currentMode,
  fromScan = false,
  fromArchive = false,
}) {
  hideScreenChildren(screen);

  await showNotification({
    screen,
    message: "Re-analyzing the file...",
    duration: 500,
  });

  showScreenChildren(screen);

  await analyzeFile({
    screen,
    hasActionByDefault,
    currentFilePath,
    currentMode,
    fromScan,
    fromArchive,
  });
}

export default async function displayAnalysisResult({
  screen,
  hasActionByDefault,
  result,
  fromScan = false,
  fromArchive = false,
  selectedIndex,
  selectedFileAnalyses,
}) {
  refreshScreen(screen);

  if (!fromArchive) {
    screen.key(["r"], async function (ch, key) {
      await reAnalyzeFile({
        screen,
        hasActionByDefault,
        currentFilePath: result.fileToAnalyze,
        currentMode: result.mode,
        fromScan,
        fromArchive,
      });
    });
  }

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
      width: "100%",
      height: 3,
      border: "line",
      align: "center",
      valign: "middle",
      padding: {
        left: 1,
      },
      content: chalk.bold(" ArcHone Analyze "),
    });

    if (fromScan || fromArchive) {
      const backToScanBtn = blessed.button({
        parent: header,
        content: "<",
        top: 0,
        right: 1,
        width: 1,
        height: 1,
        align: "center",
        valign: "middle",
        mouse: true,
      });

      backToScanBtn.on("press", async () => {
        if (fromScan) {
          await scanDirectory({
            screen,
            hasActionByDefault,
            currentMode: result.mode,
          });
        } else if (fromArchive) {
          await userArchive({
            screen,
            hasActionByDefault,
          });
        }
      });
    } else {
      const closeBtn = blessed.button({
        parent: header,
        content: "X",
        width: 1,
        height: 1,
        top: 0,
        right: 1,
        mouse: true,
      });

      closeBtn.on("press", () => {
        backToMenu(hasActionByDefault);
        return;
      });
    }

    return header;
  }

  async function getSide() {
    const side = blessed.box({
      width: `${SIDE_WIDTH}%`,
      height: "85%",
      top: 3,
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
      label: chalk.bold(" Metrics "),
      content: `${chalk.red("\n Warnings: " + result.issues.filter((issue) => issue.type === "warning").length)}\n ${chalk.yellow("Improvements: " + result.issues.filter((issue) => issue.type === "improvement").length)}\n ${chalk.blue("Info: " + result.issues.filter((issue) => issue.type === "info").length)}\n\n ${chalk.bold("Score: " + getIssuesScore(result.issues)) + " / 100"}`,
    });

    const fileDetails = blessed.box({
      parent: side,
      top: 9,
      left: 0,
      smartCSR: true,
      padding: {
        top: 1,
        bottom: 1,
        left: 1,
        right: 1,
      },

      label: chalk.bold(" File Details "),
      width: "100%",
      border: "line",
      height: `100%-${fromArchive ? 20 : 14}`,
      scrollable: true,
      content: `${chalk.bold("File Path:")} ${result.fileToAnalyze || result.fileName}\n${chalk.bold("Language:")} ${result.language || result.fileType}\n${chalk.bold("Mode:")} ${result.mode}\n\n${chalk.bold("Number Issues Found:")} ${result.issues.length}`,
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
      height: fromArchive ? 11 : 5,
    });

    if (!fromArchive) {
      const analyzeButton = blessed.button({
        parent: buttonsContainer,
        bottom: 0,
        left: "center",
        align: "center",
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
          hasActionByDefault,
          currentFilePath: result.fileToAnalyze,
          currentMode: result.mode,
          fromScan,
        });
      });
    } else {
      const leftAnalysis = blessed.button({
        parent: buttonsContainer,
        top: 0,
        left: "center",
        align: "center",
        width: "90%",
        height: 3,
        mouse: true,
        content: "Next Analysis",
        border: "line",
      });

      leftAnalysis.on("press", async () => {
        if (selectedIndex == 0) {
          await showNotification({
            screen,
            message: "This is the latest analysis of this file.",
            duration: 1000,
          });

          return;
        }

        await showNotification({
          screen,
          message: "Loading the next analysis of this file...",
          duration: 500,
        });

        const leftIndex = selectedIndex - 1;

        await displayAnalysisResult({
          screen,
          result: selectedFileAnalyses[leftIndex],
          fromArchive: true,
          selectedIndex: leftIndex,
          selectedFileAnalyses: selectedFileAnalyses,
        });
      });

      const rightAnalysis = blessed.button({
        parent: buttonsContainer,
        top: 3,
        left: "center",
        align: "center",
        width: "90%",
        height: 3,
        content: "Previous Analysis",
        mouse: true,
        style: {
          hover: {
            bg: "gray",
          },
        },
        border: "line",
      });

      rightAnalysis.on("press", async () => {
        if (selectedIndex == selectedFileAnalyses.length - 1) {
          await showNotification({
            screen,
            message: "This is the earliest analysis of this file.",
            duration: 1000,
          });
          return;
        }

        await showNotification({
          screen,
          message: "Loading the previous analysis of this file...",
          duration: 500,
        });

        const rightIndex = selectedIndex + 1;

        await displayAnalysisResult({
          screen,
          result: selectedFileAnalyses[rightIndex],
          fromArchive: true,
          selectedIndex: rightIndex,
          selectedFileAnalyses: selectedFileAnalyses,
        });
      });

      if (selectedIndex == 0) {
        const feedbacks = await Database.getFeedbacksByFileName(
          result.fileName,
        );
        const filteredFeedbacks = feedbacks.filter((fb) =>
          result.code.includes(fb.highlightedCode),
        );

        const viewFeedbacks = blessed.button({
          parent: buttonsContainer,
          top: 6,
          left: "center",
          align: "center",
          width: "90%",
          height: 3,
          content:
            filteredFeedbacks.length === 0
              ? "No Feedbacks"
              : `View Feedbacks (${filteredFeedbacks.length})`,
          mouse: true,
          border: "line",
        });

        viewFeedbacks.on("press", async () => {
          if (filteredFeedbacks.length === 0) {
            await showNotification({
              screen,
              message: "The analysis has no feedback.",
              duration: 2000,
            });
          } else {
            await displayAnalysisFeedbacks({
              screen,
              analysis: {
                ...result,
                feedbacks: filteredFeedbacks,
              },
              fromArchive: true,
            });
          }
        });
      } else {
        const viewCode = blessed.button({
          parent: buttonsContainer,
          top: 6,
          left: "center",
          align: "center",
          width: "90%",
          height: 3,
          content: "View Code",
          mouse: true,
          border: "line",
        });

        viewCode.on("press", async () => {
          const _codeContainer = blessed.box({
            parent: screen,
            top: "center",
            mouse: true,
            smartCSR: true,
            left: "center",
            width: "90%",
            height: "90%",
          });

          putHeader(_codeContainer, `${result.fileName} Code`, () => {
            _codeContainer.hide();
            _codeContainer.destroy();
            screen.render();
          });

          const codeBox = blessed.box({
            parent: _codeContainer,
            top: 3,
            border: "line",
            scrollable: true,
            alwaysScroll: true,
            mouse: true,
            padding: {
              left: 1,
            },
            scrollbar: {
              ch: " ",
              track: {
                bg: "gray",
              },
            },
            keys: true,
            left: 0,
            smartCSR: true,
            width: "100%",
            height: "100%-3",
            content: formatCode(
              result.code,
              result.language || result.fileType,
            ),
          });

          screen.render();
        });
      }
    }

    return side;
  }

  async function getMain() {
    globalSelectedIssue = null;
    globalResult = result;

    const main = blessed.box({
      width: `${MAIN_WIDTH}%`,
      height: "85%",
      top: 3,
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
      width: "98%",
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
        content: `No issue found. The result of file: ${chalk.bold(result.fileToAnalyze || result.fileName)} on ${chalk.bold(result.mode)} mode is great!`,
        align: "center",
        valign: "middle",
      });
    } else {
      result.issues.forEach((issue, index) => {
        const issueBox = blessed.box({
          parent: findingsView,

          top: index * 7,
          width: "100%-5",
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

          hideScreenChildren(main);

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
                : await explainIssueWithAI(issue);

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
          mainLoader.destroy();

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
      right: 8,
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
        whatChanged: issue.ai.explanation.whatChanged,
        language: globalResult.language,
      });
    });

    const backButton = blessed.button({
      parent: detailsView,
      top: 0,
      right: 2,
      width: 5,
      height: 3,
      align: "center",
      valign: "middle",
      border: "line",
      content: "<",
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

  function showCodeContainer({
    currentCode,
    idealCode,
    whatChanged,
    language = "js",
  }) {
    resultContainer.hide();
    codeContainer.show();

    const codeContainerHeader = blessed.box({
      parent: codeContainer,
      top: 0,
      left: 0,
      smartCSR: true,
      width: "100%",
      height: 3,
      border: "line",
      align: "center",
      valign: "middle",
      content: `${chalk.bold("Code Comparison")}`,
    });

    const closeCodeContainerButton = blessed.button({
      parent: codeContainerHeader,
      top: 0,
      right: 2,
      width: 1,
      height: 1,
      content: "<",
    });

    closeCodeContainerButton.on("click", () => {
      showResultContainer();
    });

    const codeContainerMain = blessed.box({
      parent: codeContainer,
      top: 3,
      left: 0,
      smartCSR: true,
      width: "100%",
      height: "100%-3",
    });

    const idealCodeBoxContainer = blessed.box({
      parent: codeContainerMain,
      top: 0,
      left: "50%",
      smartCSR: true,
      width: "50%",
      height: "80%",
    });

    const currentCodeBox = blessed.box({
      parent: codeContainerMain,
      top: 0,
      left: 0,
      smartCSR: true,
      width: "50%",
      height: "80%",
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

    const whatChangedAndWhyBox = blessed.box({
      parent: codeContainerMain,
      top: "80%",
      left: 0,
      smartCSR: true,
      width: "100%",
      height: "20%",
      border: "line",
      scrollable: true,
      keys: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        track: {
          bg: "gray",
        },
      },
      padding: {
        left: 1,
        right: 1,
      },
      content: `${chalk.bold("What changed and why:")} \n\n${whatChanged}`,
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
      content: `${chalk.bold("Ideal Code")} \n\n${formatCode(idealCode, language)}`,
    });

    const mergeButton = blessed.button({
      parent: idealCodeBoxContainer,
      bottom: 2,
      right: 4,
      width: 12,
      height: 3,
      align: "center",
      valign: "middle",
      border: "line",
      content: "Merge",
    });

    mergeButton.on("click", async () => {
      const filePath = path.join(
        process.cwd(),
        result.fileName ?? result.fileToAnalyze,
      );

      log(result);

      if (!fs.existsSync(filePath)) {
        await showNotification({
          screen,
          message: "File not found, unable to merge.",
          duration: 2000,
        });

        return;
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      const updatedContent = fileContent.replace(currentCode, idealCode);

      fs.writeFileSync(filePath, updatedContent, "utf-8");

      await showNotification({
        screen,
        message: "Code merged successfully.",
        duration: 2000,
      });
    });

    screen.render();
  }

  resultContainer.append(await getHeader());
  resultContainer.append(await getSide());
  resultContainer.append(await getMain({ result, issuesHolder, screen }));

  showResultContainer();
}
