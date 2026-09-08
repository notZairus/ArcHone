import {
  refreshScreen,
  log,
  showNotification,
  hideScreenChildren,
  showScreenChildren,
} from "../utils/helpers.js";
import blessed from "blessed";
import chalk from "chalk";
import db from "../lib/db.js";
import { putHeader } from "../ui/components.js";

export default async function displayAnalysisFeedbacks({
  screen,
  analysis,
  selectedFeedbackIndex = 0,
  fromArchive = false,
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
      width: "100%-4",
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
