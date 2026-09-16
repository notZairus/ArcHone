import { log, showNotification } from "../utils/helpers.js";
import blessed from "blessed";
import chalk from "chalk";
import db from "../lib/db.js";
import { putHeader } from "../ui/components.js";
import { COMMENT_SYMBOL_PER_LANGUAGE } from "../constants.js";
import fs from "fs";
import path from "path";

export default async function displayAnalysisFeedbacks({
  screen,
  analysis,
  selectedFeedbackIndex = 0,
  fromArchive = false,
  fromFeedbacks = false,
}) {
  const selectedFeedback = analysis.feedbacks[selectedFeedbackIndex];
  selectedFeedback.from = await db.getUserById(selectedFeedback.instructorId);

  const container = blessed.box({
    parent: screen,
    width: "90%",
    height: "90%",
    top: "center",
    left: "center",
  });

  putHeader(container, `Feedbacks for ${analysis.fileName}`, () => {
    container.hide();
    container.destroy();
    screen.render();
  });

  const feedbacksContainer = blessed.box({
    parent: container,
    top: 3,
    left: 0,
    width: "16%",
    height: "100%-3",
    border: "line",
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
    },
    mouse: true,
  });

  analysis.feedbacks.forEach((feedback, index) => {
    const feedbackBox = blessed.box({
      parent: feedbacksContainer,
      width: "100%-5",
      height: 3,
      top: feedbacksContainer.children.length * 3,
      border: "line",
      content: feedback.message,
      mouse: true,
    });

    feedbackBox.on("click", async () => {
      container.hide();
      container.destroy();

      await displayAnalysisFeedbacks({
        screen,
        analysis,
        selectedFeedbackIndex: index,
        fromArchive,
        fromFeedbacks,
      });
    });
  });

  const detailsContainer = blessed.box({
    parent: container,
    top: 3,
    left: "16%",
    width: "34%",
    height: "100%-3",
    border: "line",
    padding: {
      left: 1,
      right: 1,
    },
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
    },
    content: `From: ${selectedFeedback.from.name}\n\nMessage:\n${selectedFeedback.message}`,
  });

  const mergeButton = blessed.button({
    parent: detailsContainer,
    top: 0,
    right: 0,
    align: "center",
    valign: "middle",
    width: "30%",
    height: 3,
    content: "Merge",
    border: "line",
  });

  mergeButton.on("click", async () => {
    const filePath = path.join(
      process.cwd(),
      analysis.fileName ?? analysis.fileToAnalyze,
    );

    if (!fs.existsSync(filePath)) {
      await showNotification({
        screen,
        message: "File not found, unable to merge.",
        duration: 2000,
      });
      return;
    }

    const commentSymbol = COMMENT_SYMBOL_PER_LANGUAGE.find(
      (entry) => entry.language === analysis.fileType,
    ).symbol;

    const codeWithFeedback =
      `${commentSymbol} ================================\n` +
      `${commentSymbol} Start of feedback from ${selectedFeedback.from.name}\n` +
      `${commentSymbol} TODO: ${selectedFeedback.message}\n` +
      `${selectedFeedback.highlightedCode}\n` +
      `${commentSymbol} End of feedback from ${selectedFeedback.from.name}\n` +
      `${commentSymbol} ================================\n`;

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const updatedContent = fileContent.replace(
      selectedFeedback.highlightedCode,
      codeWithFeedback,
    );

    fs.writeFileSync(filePath, updatedContent, "utf-8");
  });

  const codeContainer = blessed.box({
    parent: container,
    top: 3,
    left: "50%",
    width: "50%",
    padding: {
      left: 1,
      right: 1,
    },
    scrollable: true,
    mouse: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
    },
    height: "100%-3",
    border: "line",
    content: analysis.code.replace(
      selectedFeedback.highlightedCode,
      `\n${chalk.yellow(selectedFeedback.highlightedCode)}\n`,
    ),
  });

  screen.render();
}
