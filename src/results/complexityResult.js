import blessed from "blessed";
import {
  refreshScreen,
  showScreenChildren,
  hideScreenChildren,
  showNotification,
  log,
  getIssuesScore,
} from "../utils/helpers.js";
import chalk from "chalk";

import analyzeFile from "../actions/analyze.js";

const SIDE_WIDTH = 20;
const MAIN_WIDTH = 100 - SIDE_WIDTH;

let globalSelectedIssue = null;
let globalResult = null;

async function reAnalyzeFile({
  screen,
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
    currentFilePath,
    currentMode,
    fromScan,
    fromArchive,
  });
}

export default async function displayComplexityResult({
  screen,
  result,
  fromScan = false,
  fromArchive = false,
}) {
  refreshScreen(screen);

  if (!fromArchive) {
    screen.key(["r"], async function (ch, key) {
      await reAnalyzeFile({
        screen,
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
            currentMode: result.mode,
          });
        } else if (fromArchive) {
          await userArchive({
            screen,
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
        process.exit(0);
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
      height: 11,
      scrollable: true,
      content: `${chalk.bold("File Path:")} ${result.fileToAnalyze}\n${chalk.bold("Language:")} ${result.language}\n${chalk.bold("Mode:")} ${result.mode}\n\n${chalk.bold("Space Complexity:")} ${result.complexitySummary.fileSummary.worstSpace.estimate}\n${chalk.bold("Time Complexity:")} ${result.complexitySummary.fileSummary.worstTime.estimate}`,
    });

    // const timeComplexityMetrics = blessed.box({
    //   parent: side,
    //   top: 11,
    //   left: 0,
    //   smartCSR: true,
    //   padding: {
    //     left: 1,
    //     right: 0,
    //   },
    //   width: "100%",
    //   border: "line",
    //   height: 9,
    //   label: chalk.bold(" Time Complexity Metrics "),
    //   content: [``].join("\n"),
    // });

    // const spaceComplexityMetrics = blessed.box({
    //   parent: side,
    //   top: 20,
    //   left: 0,
    //   smartCSR: true,
    //   padding: {
    //     left: 1,
    //     right: 0,
    //   },
    //   width: "100%",
    //   border: "line",
    //   height: 9,
    //   label: chalk.bold(" Space Complexity Metrics "),
    //   content: ``,
    // });

    const buttonsContainer = blessed.box({
      parent: side,
      top: 11,
      left: 0,
      smartCSR: true,
      valign: "middle",
      align: "center",
      width: "100%",
      border: "line",
      height: "100%-29",
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

        await displayAnalysisResult({
          screen,
          result: selectedFileAnalyses[rightIndex],
          fromArchive: true,
          selectedIndex: rightIndex,
          selectedFileAnalyses: selectedFileAnalyses,
        });
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

        await displayAnalysisResult({
          screen,
          result: selectedFileAnalyses[leftIndex],
          fromArchive: true,
          selectedIndex: leftIndex,
          selectedFileAnalyses: selectedFileAnalyses,
        });
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

    result.complexitySummary.functions.forEach((fn, index) => {
      const fnBox = blessed.box({
        parent: findingsView,
        top: index * 15,
        left: 0,
        width: "100%",
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
          `${chalk.bold("Reasoning:\n")}${fn.reasoning
            .filter((reason) => !reason.startsWith("Built-in"))
            .map((reason) => ` - ${reason}`)
            .join("\n")}`,
        ].join("\n"),
      });

      fnBox.on("click", async () => {
        if (
          ["O(1)", "O(n)", "O(n log n)"].includes(fn.time.estimate) &&
          ["O(1)", "O(n)", "O(n log n)"].includes(fn.space.estimate)
        ) {
          hideScreenChildren(screen);
          await showNotification({
            screen: screen,
            message:
              "The time and space complexity of this function is already good.",
          });
          showScreenChildren(screen);
        } else {
          screen.destroy();
          console.log(
            ["O(1)", "O(n)", "O(n log n)"].includes(fn.time.estimate),
          );
          console.log(
            ["O(1)", "O(n)", "O(n log n)"].includes(fn.space.estimate),
          );
        }
      });
    });

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

  resultContainer.append(await getHeader());
  resultContainer.append(await getSide());
  resultContainer.append(await getMain());

  screen.render();
}
