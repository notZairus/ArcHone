import blessed from "blessed";
import {
  refreshScreen,
  showScreenChildren,
  hideScreenChildren,
  showNotification,
  backToMenu,
} from "../utils/helpers.js";
import chalk from "chalk";
import process from "process";
import clipboard from "clipboardy";
import { getAiConfig } from "../lib/local.js";
import { explainComplexityWithGemini } from "../lib/ai.js";
import { formatCode } from "./modules.js";
import scanDirectory from "../actions/scan.js";
import userArchive from "../actions/archive.js";
import { stripCodeFences } from "../utils/helpers.js";

import analyzeFile from "../actions/analyze.js";
import displayAnalysisResult from "./generalOopResult.js";

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

export default async function displayComplexityResult({
  screen,
  hasActionByDefault,
  result,
  fromScan = false,
  fromArchive = false,
  selectedIndex,
  selectedFileAnalyses,
}) {
  refreshScreen(screen);

  const complexityHolder = result.complexitySummary.functions.map((fn) => ({
    name: fn.name,
    line: fn.line,
    ai: {
      explained: false,
      explanation: null,
    },
  }));

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
      content: chalk.bold("ArcHone Analyze Complexity"),
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

    const fileDetails = blessed.box({
      parent: side,
      top: 0,
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
      height: 10,
      scrollable: true,
      content: `${chalk.bold("File Path:")} ${result.fileToAnalyze || result.fileName}\n${chalk.bold("Language:")} ${result.language || result.fileType}\n${chalk.bold("Mode:")} ${result.mode}\n\n${chalk.bold("Function Count:")} ${result.complexitySummary.functions.length}`,
    });

    const buttonsContainer = blessed.box({
      parent: side,
      top: 10,
      left: 0,
      smartCSR: true,
      valign: "middle",
      align: "center",
      width: "100%",
      border: "line",
      height: "shrink",
    });

    if (!fromArchive) {
      const analyzeButton = blessed.button({
        parent: buttonsContainer,
        top: 0,
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
          fromArchive,
        });
      });
    } else {
      const rightAnalysis = blessed.button({
        parent: buttonsContainer,
        top: 0,
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

        if (selectedFileAnalyses[rightIndex].mode === "complexity") {
          await displayComplexityResult({
            screen,
            result: selectedFileAnalyses[rightIndex],
            fromArchive: true,
            selectedIndex: rightIndex,
            selectedFileAnalyses: selectedFileAnalyses,
          });
        } else {
          await displayAnalysisResult({
            screen,
            result: selectedFileAnalyses[rightIndex],
            fromArchive: true,
            selectedIndex: rightIndex,
            selectedFileAnalyses: selectedFileAnalyses,
          });
        }
      });

      const leftAnalysis = blessed.button({
        parent: buttonsContainer,
        top: 3,
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

        if (selectedFileAnalyses[leftIndex].mode === "complexity") {
          await displayComplexityResult({
            screen,
            result: selectedFileAnalyses[leftIndex],
            fromArchive: true,
            selectedIndex: leftIndex,
            selectedFileAnalyses: selectedFileAnalyses,
          });
        } else {
          await displayAnalysisResult({
            screen,
            result: selectedFileAnalyses[leftIndex],
            fromArchive: true,
            selectedIndex: leftIndex,
            selectedFileAnalyses: selectedFileAnalyses,
          });
        }
      });
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
      width: "98%",
      height: "90%",
      scrollable: true,
      alwaysScroll: true,
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

    const detailsView = blessed.box({
      parent: main,
      top: 0,
      left: 0,
      width: "98%",
      height: "90%",
      hidden: true,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        track: {
          bg: "gray",
        },
        inverse: true,
      },
      content: "details view",
    });

    const compareCodeButton = blessed.button({
      parent: detailsView,
      top: 0,
      right: 7,
      width: 20,
      height: 3,
      align: "center",
      valign: "middle",
      border: "line",
      hidden: true,
      content: "Compare Code",
    });

    compareCodeButton.on("click", () => {
      if (!globalSelectedIssue?.explanation) return;

      showCodeContainer({
        currentCode: globalSelectedIssue.fn.code,
        idealCode: globalSelectedIssue.explanation.suggestedOptimizedCode,
        language: globalResult.language,
      });
    });

    function showFindingsView() {
      findingsView.show();
      detailsView.hide();

      screen.render();
    }

    function showDetailsView(content) {
      detailsView.setContent(content);

      findingsView.hide();
      detailsView.show();
      detailsView.focus();

      screen.render();
    }

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
      showFindingsView();
    });

    result.complexitySummary.functions.forEach((fn, index) => {
      const fnBox = blessed.box({
        parent: findingsView,
        top: index * 15,
        left: 0,
        width: "100%-5",
        height: 15,
        padding: {
          left: 1,
          right: 1,
        },
        border: "line",
        valign: "middle",
        mouse: true,
        content: [
          `${chalk.bold("Function Name:")} ${fn.name}`,
          ``,
          `${chalk.bold("Time Complexity")}`,
          `- Complexity: ${fn.time.estimate}`,
          `- Class: ${fn.time.class}`,
          ``,
          `${chalk.bold("Space Complexity")}`,
          `- Complexity: ${fn.space.estimate}`,
          `- Class: ${fn.space.class}`,
          ``,
          // `${chalk.bold("Reasoning:\n")}${fn.reasoning
          //   .filter((reason) => !reason.startsWith("Built-in"))
          //   .map((reason) => ` - ${reason}`)
          //   .join("\n")}`,
        ].join("\n"),
      });

      fnBox.on("click", async () => {
        if (
          ["O(1)", "O(n)", "O(n log n)"].includes(fn.time.estimate) &&
          ["O(1)", "O(n)", "O(n log n)"].includes(fn.space.estimate)
        ) {
          await showNotification({
            screen: screen,
            message:
              "The time and space complexity of this function is already good.",
          });
        } else {
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

          mainLoader.load("Asking AI about this function's complexity...");

          let detailsContent = "";

          if (!aiConfig.enabled) {
            compareCodeButton.hide();

            const filteredReasoning = fn.reasoning.filter(
              (reason) => !reason.startsWith("Built-in"),
            );

            const complexityHints = [
              fn.time.estimate.startsWith("O(n^2)") ||
              fn.time.estimate.startsWith("O(2^n)") ||
              fn.time.estimate.startsWith("O(n!)")
                ? "- Time: Consider replacing nested loops/recursive branching with hash maps, memoization, or early exits."
                : null,
              fn.space.estimate.startsWith("O(n)") ||
              fn.space.estimate.startsWith("O(n^2)")
                ? "- Space: Reuse variables or switch to in-place operations when safe to reduce auxiliary memory."
                : null,
              "- If this function is hot (called frequently), prioritize optimization here first.",
            ].filter(Boolean);

            detailsContent = [
              `${chalk.bold("Function Complexity Details")}`,
              "",
              `${chalk.bold("Function Name:")} ${fn.name}`,
              `${chalk.bold("Line:")} ${fn.line || "unknown"}`,
              "",
              `${chalk.bold("Time Complexity")}`,
              `- Estimate: ${fn.time.estimate}`,
              `- Class: ${fn.time.class}`,
              "",
              `${chalk.bold("Space Complexity")}`,
              `- Estimate: ${fn.space.estimate}`,
              `- Class: ${fn.space.class}`,
              "",
              `${chalk.bold("Why ArcHone flagged this")}`,
              filteredReasoning.length
                ? filteredReasoning.map((reason) => `- ${reason}`).join("\n")
                : "- No additional reasoning was provided by the analyzer.",
              "",
              `${chalk.bold("Optimization Hints")}`,
              complexityHints.join("\n"),
            ].join("\n");
          } else {
            try {
              const selectedFn = complexityHolder.find(
                (item) => item.name === fn.name && item.line === fn.line,
              );

              const aiOutput = selectedFn.ai.explained
                ? selectedFn.ai.explanation
                : await explainComplexityWithGemini({
                    filePath: result.fileToAnalyze,
                    language: result.language,
                    mode: result.mode,
                    fn,
                  });

              if (!selectedFn.ai.explained) {
                selectedFn.ai.explained = true;
                selectedFn.ai.explanation = aiOutput;
              }

              detailsContent = [
                `${chalk.bold("Function Complexity Details")}`,
                "",
                `${chalk.bold("Function Name:")} ${aiOutput.name || fn.name}`,
                `${chalk.bold("Line:")} ${aiOutput.line || fn.line || "unknown"}`,
                "",
                `${chalk.bold("Time Complexity")}`,
                `- Estimate: ${fn.time.estimate}`,
                `- Class: ${fn.time.class}`,
                "",
                `${chalk.bold("Space Complexity")}`,
                `- Estimate: ${fn.space.estimate}`,
                `- Class: ${fn.space.class}`,
                "",
                `${chalk.bold("Explanation:")}`,
                aiOutput.beginnerFriendlyExplanation,
                "",
                `${chalk.bold("What caused this complexity:")}`,
                aiOutput.whatPartOfTheFunctionCausedIt,
                "",
              ].join("\n");

              globalSelectedIssue = {
                fn,
                explanation: aiOutput,
              };

              if (
                aiOutput.isOptimizable &&
                aiOutput.suggestedOptimizedCode != fn.code
              ) {
                compareCodeButton.show();
              } else {
                compareCodeButton.hide();
              }
            } catch (error) {
              compareCodeButton.hide();

              const filteredReasoning = fn.reasoning.filter(
                (reason) => !reason.startsWith("Built-in"),
              );

              detailsContent = [
                `${chalk.bold("Function Complexity Details")}`,
                "",
                `${chalk.bold("Function Name:")} ${fn.name}`,
                `${chalk.bold("Line:")} ${fn.line || "unknown"}`,
                "",
                `${chalk.bold("Time Complexity")}`,
                `- Estimate: ${fn.time.estimate}`,
                `- Class: ${fn.time.class}`,
                "",
                `${chalk.bold("Space Complexity")}`,
                `- Estimate: ${fn.space.estimate}`,
                `- Class: ${fn.space.class}`,
                "",
                `${chalk.bold("Why ArcHone flagged this")}`,
                filteredReasoning.length
                  ? filteredReasoning.map((reason) => `- ${reason}`).join("\n")
                  : "- No additional reasoning was provided by the analyzer.",
              ].join("\n");
            }
          }

          mainLoader.stop();
          mainLoader.hide();
          mainLoader.destroy();
          showScreenChildren(main);

          showDetailsView(detailsContent);
        }
      });
    });

    showFindingsView();

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
    hidden: true,
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
      height: 3,
      border: "line",
      align: "center",
      valign: "middle",
      content: chalk.bold("Code Comparison"),
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
      content: `${chalk.bold("Current Code")}\n\n${formatCode(
        currentCode || "Current function source is unavailable.",
        language,
      )}`,
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
      content: `${chalk.bold("Optimized Code")}\n\n${formatCode(
        idealCode || "No optimized code was provided.",
        language,
      )}`,
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
      clipboard.writeSync(stripCodeFences(idealCode || ""));
    });

    screen.render();
  }

  resultContainer.append(await getHeader());
  resultContainer.append(await getSide());
  resultContainer.append(await getMain());

  showResultContainer();
}
