import { getSession } from "../utils/session.js";
import blessed from "blessed";
import {
  refreshScreen,
  refreshBox,
  showNotification,
  cleanFileName,
} from "../utils/helpers.js";
import { putHeader } from "../ui/components.js";
import Database from "../lib/db.js";
import displayAnalysisResult from "../results/renderResult.js";

export default async function archive({ screen }) {
  refreshScreen(screen);

  const { userId } = getSession();

  if (!userId) {
    await showNotification({
      screen,
      message: "Unauthenticated",
    });

    process.exit(0);
  }

  const analyses = await Database.getUserAnalyses(userId, "desc");

  if (!analyses || analyses.length === 0) {
    await showNotification({
      screen,
      message: "No analyses found.",
    });
    process.exit(0);
  }

  const container = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "50%",
    height: "80%",
  });

  putHeader(container, "ArcHone Archive");

  let sortedAnalyses = {};

  analyses.forEach((analysis) => {
    const cleaned = cleanFileName(analysis.fileName);

    if (sortedAnalyses[cleaned]) {
      sortedAnalyses[cleaned].push(analysis);
    } else {
      sortedAnalyses[cleaned] = [analysis];
    }
  });

  const fileNameContainer = blessed.box({
    parent: container,
    top: 3,
    width: "100%",
    height: "100%-3",
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      style: {
        inverse: true,
      },
    },
    border: "line",
  });

  const analysesContainer = blessed.box({
    parent: container,
    top: 3,
    width: "100%",
    height: "100%-3",
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      style: {
        inverse: true,
      },
    },
    border: "line",
  });

  function showFileNameContainer() {
    fileNameContainer.show();
    analysesContainer.hide();
    screen.render();
  }

  function showAnalysesOfFile(cleanFileName) {
    const selectedFileAnalyses = sortedAnalyses[cleanFileName];

    refreshBox(analysesContainer);

    const backButton = blessed.box({
      parent: analysesContainer,
      top: 0,
      padding: {
        left: 1,
        right: 1,
      },
      width: "95%",
      height: 3,
      border: "line",
      content: "Back",
    });

    backButton.on("click", () => {
      showFileNameContainer();
    });

    selectedFileAnalyses.forEach((analysis, index) => {
      const analysisBox = blessed.box({
        parent: analysesContainer,
        top: (index + 1) * 3,
        padding: {
          left: 1,
          right: 1,
        },
        width: "95%",
        height: 3,
        border: "line",
        content: [
          `${index + 1}. ${new Date(analysis.createdAt).toLocaleString()}`,
        ].join("\n"),
      });

      analysisBox.on("click", async () => {
        await displayAnalysisResult({
          screen,
          result: analysis,
          fromArchive: true,
          selectedIndex: index,
          selectedFileAnalyses: selectedFileAnalyses,
        });
      });
    });

    fileNameContainer.hide();
    analysesContainer.show();
    screen.render();
  }

  Object.entries(sortedAnalyses).forEach(([fileName, analyses], index) => {
    const fileNameBox = blessed.box({
      parent: fileNameContainer,
      top: index * 4,
      padding: {
        left: 1,
        right: 1,
      },
      width: "95%",
      height: 4,
      border: "line",
      mouse: true,
      content: [
        `${index + 1}. ${fileName}`,
        `-- ${analyses.length} analysis.`,
      ].join("\n"),
    });

    fileNameBox.on("click", () => {
      showAnalysesOfFile(fileName);
    });
  });

  showFileNameContainer();
}
