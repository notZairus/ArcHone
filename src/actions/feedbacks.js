import { refreshScreen, log, backToMenu } from "../utils/helpers.js";
import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";
import blessed from "blessed";
import { putHeader } from "../ui/components.js";
import chalk from "chalk";
import displayAnalysisFeedbacks from "../renders/analysisFeedbacks.js";

export default async function feedbacks({ screen, hasActionByDefault }) {
  refreshScreen(screen);

  const { userId } = getSession();

  if (!userId) {
    await showNotification({
      screen,
      message: "User not logged in.",
    });

    backToMenu(hasActionByDefault);
  }

  const analyses = await Database.getUserAnalyses(userId);

  if (analyses.length === 0) {
    await showNotification({
      screen,
      message: "No analyses found.",
    });

    backToMenu(hasActionByDefault);
  }

  const analysesWithFeedbacks = await Promise.all(
    analyses.map(async (analysis) => {
      const feedbacks = await Database.getFeedbacksByFileName(
        analysis.fileName,
      );
      return { ...analysis, feedbacks };
    }),
  );

  const filteredAnalyses = [];

  for (const analysis of analysesWithFeedbacks) {
    const existing = filteredAnalyses.find(
      (a) => a.fileName === analysis.fileName,
    );

    if (!existing && analysis.feedbacks.length > 0) {
      filteredAnalyses.push(analysis);
    }
  }

  if (filteredAnalyses.length === 0) {
    await showNotification({
      screen,
      message: "No feedbacks found.",
    });

    backToMenu(hasActionByDefault);
  }

  const container = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "90%",
    height: "90%",
  });

  putHeader(container, "Feedbacks", () => {
    backToMenu(hasActionByDefault);
  });

  const mainContainer = blessed.box({
    parent: container,
    top: 3,
    left: 0,
    width: "100%",
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
  });

  filteredAnalyses.forEach((analysis, index) => {
    const analysisBox = blessed.box({
      parent: mainContainer,
      top: index * 7,
      left: 0,
      width: "100%-5",
      height: 7,
      padding: {
        left: 1,
      },
      border: "line",
      content: [
        `File Name: ${chalk.bold(analysis.fileName)}`,
        `Feedbacks Count: ${analysis.feedbacks.length}`,
        `Last Feedback By: ${analysis.feedbacks[analysis.feedbacks.length - 1].instructorId}`,
        `Last Feedback Message: ${analysis.feedbacks[analysis.feedbacks.length - 1].message}`,
      ].join("\n"),
      mouse: true,
    });

    analysisBox.on("click", async () => {
      await displayAnalysisFeedbacks({
        screen,
        analysis,
        fromFeedbacks: true,
      });
    });
  });

  screen.render();
}
