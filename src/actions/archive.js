import { getSession } from "../utils/session.js";
import blessed from "blessed";
import {
  refreshScreen,
  showNotification,
  cleanFileName,
  backToMenu,
  log,
} from "../utils/helpers.js";
import { putHeader } from "../ui/components.js";
import Database from "../lib/db.js";
import displayAnalysisResult from "../renders/generalOopResult.js";
import displayComplexityResult from "../renders/complexityResult.js";

export default async function archive({ screen, hasActionByDefault }) {
  refreshScreen(screen);

  const { userId } = getSession();

  if (!userId) {
    await showNotification({
      screen,
      message: "Please log in to view your past analysis results.",
    });

    backToMenu(hasActionByDefault);
    return;
  }

  const loader = blessed.loading({
    parent: screen,
    top: "center",
    left: "center",
    width: "shrink",
    height: "shrink",
    border: "line",
  });

  loader.load("Fetching analyses...");

  const analyses = await Database.getUserAnalyses(userId, "desc");

  loader.stop();
  loader.destroy();

  if (!analyses || analyses.length === 0) {
    await showNotification({
      screen,
      message: "No analyses found.",
    });

    backToMenu(hasActionByDefault);
    return;
  }

  const container = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "90%",
    height: "90%",
  });

  // MAIN CONTAINERRRRRss

  const fileNameContainer = blessed.box({
    parent: container,
    top: 3,
    width: "100%",
    height: "100%-3",
  });

  const analysesContainer = blessed.box({
    parent: container,
    top: 3,
    width: "100%",
    height: "100%-3",
    border: "line",
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
    },
  });

  // MAIN CONTAINERRRRRss

  const generalContainer = blessed.box({
    parent: fileNameContainer,
    width: "33.3%",
    height: "100%",
    border: "line",
    label: " GENERAL ",
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
    },
  });

  const oopContainer = blessed.box({
    parent: fileNameContainer,
    left: "33.3%",
    width: "33.3%",
    height: "100%",
    border: "line",
    label: " OOP ",
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
    },
  });

  const complexityContainer = blessed.box({
    parent: fileNameContainer,
    left: "66.6%",
    width: "33.3%",
    height: "100%",
    border: "line",
    label: " COMPLEXITY ",
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
    },
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

  const sortedAnalysesArray = Array.from(Object.entries(sortedAnalyses)).map(
    ([fileName, analyses]) => ({
      fileName,
      analyses: analyses.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }),
  );

  sortedAnalysesArray.forEach((fileData, index) => {
    const { fileName, analyses } = fileData;

    const hasGeneral = analyses.some((analysis) => analysis.mode === "general");
    const hasOop = analyses.some((analysis) => analysis.mode === "oop");
    const hasComplexity = analyses.some(
      (analysis) => analysis.mode === "complexity",
    );

    if (hasGeneral) {
      const childrenCount = generalContainer.children.length;

      const generalFileAnalyses = analyses.filter(
        (analysis) => analysis.mode === "general",
      );

      const generalNameBox = blessed.box({
        parent: generalContainer,
        top: (childrenCount - 1) * 4,
        padding: {
          left: 1,
          right: 1,
        },
        width: "100%-5",
        height: 4,
        border: "line",
        content: [
          `${childrenCount}. ${fileName}`,
          `-- ${generalFileAnalyses.length} analysis.`,
        ].join("\n"),
      });

      generalNameBox.on("click", () => {
        showAnalysesContainer(generalFileAnalyses);
      });
    }

    if (hasOop) {
      const childrenCount = oopContainer.children.length;

      const oopFileAnalyses = analyses.filter(
        (analysis) => analysis.mode === "oop",
      );

      const oopNameBox = blessed.box({
        parent: oopContainer,
        top: (childrenCount - 1) * 4,
        padding: {
          left: 1,
          right: 1,
        },
        width: "100%-5",
        height: 4,
        border: "line",
        content: [
          `${childrenCount}. ${fileName}`,
          `-- ${oopFileAnalyses.length} analysis.`,
        ].join("\n"),
      });

      oopNameBox.on("click", () => {
        showAnalysesContainer(oopFileAnalyses);
      });
    }

    if (hasComplexity) {
      const childrenCount = complexityContainer.children.length;

      const complexityFileAnalyses = analyses.filter(
        (analysis) => analysis.mode === "complexity",
      );

      const complexityNameBox = blessed.box({
        parent: complexityContainer,
        top: (childrenCount - 1) * 4,
        padding: {
          left: 1,
          right: 1,
        },
        width: "100%-5",
        height: 4,
        border: "line",
        content: [
          `${childrenCount}. ${fileName}`,
          `-- ${complexityFileAnalyses.length} analysis.`,
        ].join("\n"),
      });

      complexityNameBox.on("click", () => {
        showAnalysesContainer(complexityFileAnalyses);
      });
    }
  });

  function showFileNameContainer() {
    analysesContainer.hide();
    fileNameContainer.show();
    screen.render();
  }

  function showAnalysesContainer(selectedFileAnalyses) {
    fileNameContainer.hide();

    analysesContainer.children.forEach((child) => {
      child.destroy();
    });

    const back = blessed.box({
      parent: analysesContainer,
      top: 0,
      left: 0,
      padding: {
        left: 1,
        right: 1,
      },
      width: "50%-5",
      height: 4,
      border: "line",
      align: "center",
      valign: "middle",
      content: " < Back",
    });

    back.on("click", () => {
      showFileNameContainer();
    });

    selectedFileAnalyses.forEach((analysis, index) => {
      const indexPlusOne = index + 1;

      const analysisBox = blessed.box({
        parent: analysesContainer,
        top: Math.floor(indexPlusOne / 2) * 4,
        left: indexPlusOne % 2 === 0 ? 0 : "48%",
        padding: {
          left: 1,
          right: 1,
        },
        width: "50%-5",
        height: 4,
        border: "line",
        content: [
          `${index + 1}. ${new Date(analysis.createdAt).toLocaleString()}`,
          `-- Mode: ${analysis.mode.toUpperCase()}`,
        ].join("\n"),
      });

      analysisBox.on("click", async () => {
        if (analysis.mode !== "complexity") {
          await displayAnalysisResult({
            screen,
            result: analysis,
            fromArchive: true,
            selectedIndex: index,
            selectedFileAnalyses: selectedFileAnalyses,
          });
        } else {
          await displayComplexityResult({
            screen,
            result: analysis,
            fromArchive: true,
            selectedIndex: index,
            selectedFileAnalyses: selectedFileAnalyses,
          });
        }
      });
    });

    analysesContainer.show();
    screen.render();
  }

  showFileNameContainer();
}
