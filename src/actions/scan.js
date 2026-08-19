import fs from "fs";
import path from "path";
import clack from "../lib/clack.js";
import chalk from "chalk";
import { box } from "../ui/box.js";
import { AVAILABLE_ANALYSIS_MODES, CONSOLE_MAX_WIDTH } from "../constants.js";
import analyzeGeneralJS from "../analyzer/general/javascript.js";
import analyzeGeneralPy from "../analyzer/general/python.js";
import analyzeGeneralCS from "../analyzer/general/csharp.js";
import analyzeOopJS from "../analyzer/oop/javascript.js";
import analyzeOopPy from "../analyzer/oop/python.js";
import analyzeOopCS from "../analyzer/oop/csharp.js";
import { refreshScreen, showNotification, log, colorSeverity } from "../utils/helpers.js"
import blessed from "blessed";

import analyzeFile from "./analyze.js";

import treeParser from "../parser/analysis-parser.js";

const analyzersByMode = {
  general: {
    js: analyzeGeneralJS,
    py: analyzeGeneralPy,
    cs: analyzeGeneralCS,
  },
  oop: {
    js: analyzeOopJS,
    py: analyzeOopPy,
    cs: analyzeOopCS,
  },
};

const SCAN_LIMITS = {
  maxScanDurationMs: 10000,
  maxFilesystemEntries: 50000,
  maxSupportedFiles: 5000,
};

const severityRank = {
  critical: 0,
  error: 1,
  warning: 2,
  improvement: 3,
  info: 4,
  unknown: 5,
};

export default async ({ screen, currentMode = null }) => {
  refreshScreen(screen);
  const args = process.argv.slice(3);
  const showAll = args.includes("--all");

  const modeFlagIndex = args.findIndex(
    (arg) => String(arg).toLowerCase() === "--mode",
  );

  const hasModeFlag = modeFlagIndex !== -1;
  let mode = hasModeFlag
    ? args[modeFlagIndex + 1]
      ? String(args[modeFlagIndex + 1]).toLowerCase()
      : "general"
    : "general";

  if (currentMode) {
    mode = currentMode;
  }

  if (!AVAILABLE_ANALYSIS_MODES.includes(mode)) {

    const message = `Invalid mode specified. Available modes are: ${AVAILABLE_ANALYSIS_MODES.join(
      ", ",
    )}. Please provide a valid mode using the --mode flag.`;


    await showNotification({
      screen,
      message,
      duration: 3000,
    })

    process.exit(0);
  }

  const analyzersByExtension = analyzersByMode[mode] || analyzersByMode.general;
  const positionalArgs = args.filter((arg, index) => {
    if (String(arg).toLowerCase() === "--all") {
      return false;
    }

    if (
      hasModeFlag &&
      (index === modeFlagIndex || index === modeFlagIndex + 1)
    ) {
      return false;
    }

    return true;
  });

  const targetArg = positionalArgs[0] || ".";
  const targetPath = path.resolve(process.cwd(), targetArg);
  const scanStartedAt = Date.now();

  if (!fs.existsSync(targetPath) || !fs.lstatSync(targetPath).isDirectory()) {
    await showNotification({
      screen,
      message: "Invalid directory. Please provide a valid folder path."
    })

    process.exit(0)
  }

  let sourceFiles = [];

  try {
    sourceFiles = collectSourceFiles(
      targetPath,
      scanStartedAt,
      analyzersByExtension,
    );
  } catch (error) {
    if (await handleFolderTooLargeError(error)) {
      return;
    }

    throw error;
  }

  if (!sourceFiles.length) {
    await showNotification({
      screen,
      message: "No supported files found (.js, .py, .cs).",
    })
    process.exit(0);
  }

  const issueSummary = new Map();
  const fileSummary = new Map();
  let totalFindings = 0;
  const languageCounts = { js: 0, py: 0, cs: 0 };


  try {
    for (const filePath of sourceFiles) {
      ensureScanWithinDuration(scanStartedAt);

      const extension = path.extname(filePath).slice(1).toLowerCase();
      const analyzer = analyzersByExtension[extension];
      const relativeFilePath = path.relative(process.cwd(), filePath);
      if (languageCounts[extension] != null) {
        languageCounts[extension] += 1;
      }
      const sourceCode = fs.readFileSync(filePath, "utf-8");
      const tree = await treeParser(sourceCode, extension);
      const result = await analyzer(tree, sourceCode, extension);
      const issues = result.issues || [];

      if (issues.length) {
        if (!fileSummary.has(relativeFilePath)) {
          fileSummary.set(relativeFilePath, {
            file: relativeFilePath,
            total: 0,
            warning: 0,
            improvement: 0,
            info: 0,
            unknown: 0,
          });
        }

        const fileEntry = fileSummary.get(relativeFilePath);
        for (const issue of issues) {
          fileEntry.total += 1;
          const issueType = issue.type || "unknown";

          if (issueType === "warning") {
            fileEntry.warning += 1;
          } else if (issueType === "improvement") {
            fileEntry.improvement += 1;
          } else if (issueType === "info") {
            fileEntry.info += 1;
          } else {
            fileEntry.unknown += 1;
          }
        }
      }

      for (const issue of issues) {
        totalFindings += 1;

        const title = issue.title || "Unknown Issue";
        const type = issue.type || "unknown";

        if (!issueSummary.has(title)) {
          issueSummary.set(title, {
            title,
            type,
            count: 0,
            files: new Set(),
          });
        }

        const entry = issueSummary.get(title);
        entry.count += 1;
        entry.files.add(relativeFilePath);
      }
    }
  } catch (error) {
    if (await handleFolderTooLargeError(error, spinner)) {
      return;
    }

    throw error;
  }

  const sortedIssues = [...issueSummary.values()].sort((a, b) => {
    const rankA = severityRank[a.type] ?? 99;
    const rankB = severityRank[b.type] ?? 99;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return b.count - a.count || a.title.localeCompare(b.title);
  });

  const severityBreakdown = buildSeverityBreakdown(sortedIssues);
  const sortedFilesWithIssues = [...fileSummary.values()].sort((a, b) => {
    return b.total - a.total || a.file.localeCompare(b.file);
  });

  const container = blessed.box({
    parent: screen,
    left: "center",
    top: "center",
    width: "90%",
    height: "90%",
  })


  const header = blessed.box({
    parent: container,
    width: "100%",
    height: 3,
    border: "line",
    align: "center",
    valign: "middle",
    padding: {
      left: 1
    },
    content: chalk.bold("ArcHone Scan")
  })


  const exitBtn = blessed.button({
    parent: header,
    content: "X",
    width: 1,
    height: 1,
    top: 0,
    right: 1,
    mouse: true,
  })

  exitBtn.on("press", () => {
    process.exit(0)
  })

  const mainContainer = blessed.box({
    parent: container,
    top: 3,
    width: "100%",
    height: "100%-3",
  })

  const scanDetailsContainer = blessed.box({
    parent: mainContainer,
    height: 7,
    width: "50%",
    label: chalk.bold(" Scan Details "),
    border: "line",
    padding: {
      top: 1,
      left: 1,
      bottom: 1,
      right: 1
    },
    content: [
      `${chalk.bold("Directory:")} ${path.relative(process.cwd(), targetPath) || "."}`,
      `${chalk.bold("Total files scanned:")} ${sourceFiles.length}`,
      `${chalk.bold("File types scanned:")} JavaScript (${languageCounts.js}), Python (${languageCounts.py}), C# (${languageCounts.cs})`
    ].join("\n"),
  })

  const overallResultContainer = blessed.box({
    parent: mainContainer,
    left: "50%",
    height: 7,
    width: "50%",
    label: chalk.bold(" Overall Result "),
    padding: {
      top: 1,
      left: 1,
      bottom: 1,
      right: 1
    },
    border: "line",
    content: [
      `Found ${totalFindings} issue(s) across ${sortedFilesWithIssues.length} file(s).`,
      `Detected ${sortedIssues.length} different issue type(s).`,
      `Severity summary: ${severityBreakdown}`
    ].join("\n")
  })

  const filesContainer = blessed.box({
    parent: mainContainer,
    top: 7,
    height: "100%-8",
    width: "50%",
    border: "line",
    vi: true,
    keys: true,
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      inverse: true,
    },
    label: chalk.bold(" Files to Refactor "),
  })

  sortedFilesWithIssues.forEach((file, index) => {
    const fileIssueBox = blessed.box({
      parent: filesContainer,
      top: 5 * index,
      height: 5,
      width: "95%",
      border: "line",
      padding: {
        left: 1,
      },
      mouse: true,
      content: [
        chalk.bold(`${index + 1}. ${file.file}`),
        `- Total issues: ${file.total}`,
        `- Breakdown: ${chalk.red(`Warning: ${file.warning}`)} | ${chalk.yellow(`Improvement: ${file.improvement}`)} | ${chalk.blue(`Info: ${file.info}`)}`,
      ].join("\n")
    })

    fileIssueBox.on("click", async () => {
      await analyzeFile({
        screen,
        currentFilePath: file.file,
        currentMode: mode,
        fromScan: true
      })
    })
  })

  const issueRankingsContainer = blessed.box({
    parent: mainContainer,
    top: 7,
    left: "50%",
    height: "100%-8",
    width: "50%",
    border: "line",
    vi: true,
    keys: true,
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      inverse: true,
    },
    label: chalk.bold(" Issue Rankings ")
  })

  sortedIssues.forEach((issue, index) => {
    const issueBox = blessed.box({
      parent: issueRankingsContainer,
      top: 4 * index,
      height: 4,
      width: "95%",
      border: "line",
      padding: {
        left: 1,
      },
      content: [
        chalk.bold(`${index + 1}. ${issue.title}[${colorSeverity(issue.type)}]`),
        `- ${issue.count} finding(s) in ${issue.files.size} file(s)`
      ].join("\n")
    })
  });

  screen.render();
};










// HELPERS /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// HELPERS /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// HELPERS /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function collectSourceFiles(rootDir, scanStartedAt, analyzersByExtension) {
  const ignored = new Set([
    "node_modules",
    "vendor",
    "dist",
    "build",
    ".git",
    ".archone",
    "venv",
    "__pycache__",
  ]);

  const output = [];
  const stack = [rootDir];
  let filesystemEntriesScanned = 0;

  while (stack.length) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      ensureScanWithinDuration(scanStartedAt);

      if (ignored.has(entry.name)) {
        continue;
      }

      filesystemEntriesScanned += 1;

      if (filesystemEntriesScanned > SCAN_LIMITS.maxFilesystemEntries) {
        const error = new Error(
          `Scanned more than ${SCAN_LIMITS.maxFilesystemEntries.toLocaleString()} files/folders while traversing this directory.`,
        );
        error.code = "FOLDER_TOO_LARGE";
        throw error;
      }

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      const extension = path.extname(entry.name).slice(1).toLowerCase();
      if (analyzersByExtension[extension]) {
        output.push(fullPath);

        if (output.length > SCAN_LIMITS.maxSupportedFiles) {
          const error = new Error(
            `Found more than ${SCAN_LIMITS.maxSupportedFiles.toLocaleString()} supported source files (.js, .py, .cs).`,
          );
          error.code = "FOLDER_TOO_LARGE";
          throw error;
        }
      }
    }
  }

  return output;
}

function ensureScanWithinDuration(scanStartedAt) {
  const elapsedMs = Date.now() - scanStartedAt;

  if (elapsedMs > SCAN_LIMITS.maxScanDurationMs) {
    const error = new Error(
      `Scan exceeded ${Math.floor(SCAN_LIMITS.maxScanDurationMs / 1000)} seconds.`,
    );
    error.code = "FOLDER_TOO_LARGE";
    throw error;
  }
}

async function handleFolderTooLargeError(error) {
  if (error?.code !== "FOLDER_TOO_LARGE") {
    return false;
  }

  await showNotification({
    screen,
    message: [
      "Folder is too large to scan.",
      "",
      `- ${error.message}`,
      "- Try scanning a smaller subfolder.",
    ].join("\n"),
    duration: 3000
  })

  return true;
}

function buildSeverityBreakdown(issues) {
  if (!issues.length) {
    return "none";
  }

  const counts = new Map();
  for (const issue of issues) {
    counts.set(issue.type, (counts.get(issue.type) || 0) + issue.count);
  }

  const ordered = ["critical", "error", "warning", "improvement", "info"];
  const parts = [];

  for (const type of ordered) {
    const count = counts.get(type);


    let toPush;

    if (type === `warning`) {
      toPush = chalk.red(`Warning: ${count}`)
    } else if (type === `improvement`) {
      toPush = chalk.yellow(`Improvement: ${count}`)
    } else if (type === `info`) {
      toPush = chalk.blue(`Info: ${count}`)
    }

    if (count) {
      parts.push(toPush);
    }
  }

  if (!parts.length) {
    parts.push("unknown");
  }

  return parts.join(" | ");
}

function formatTopIssues(issues, showAll = false) {
  if (!issues.length) {
    return ["- No issues found."];
  }

  const maxRows = showAll ? issues.length : 8;
  const rows = issues.slice(0, maxRows).map((issue, index) => {
    const typeLabel = String(issue.type || "unknown").toUpperCase();
    return `${index + 1}. ${issue.title} [${typeLabel}] - ${issue.count} finding(s) in ${issue.files.size} file(s)`;
  });

  if (!showAll && issues.length > maxRows) {
    rows.push(`- ...and ${issues.length - maxRows} more issue type(s).`);
  }

  return rows;
}

function formatFilesWithIssues(files, showAll = false) {
  if (!files.length) {
    return ["- Great news: ArcHone did not find issues in the scanned files."];
  }

  const maxRows = showAll ? files.length : 10;
  const rows = files.slice(0, maxRows).flatMap((file, index) => {
    const parts = [];

    if (file.warning > 0) {
      parts.push(`${file.warning} warning(s)`);
    }
    if (file.improvement > 0) {
      parts.push(`${file.improvement} improvement(s)`);
    }
    if (file.info > 0) {
      parts.push(`${file.info} info note(s)`);
    }
    if (file.unknown > 0) {
      parts.push(`${file.unknown} uncategorized`);
    }

    const detail = parts.length ? parts.join(", ") : "no categorized issues";
    return [
      `${index + 1}. ${file.file}`,
      `   - Total issues: ${file.total}`,
      `   - Breakdown: ${detail}`,
      "",
    ];
  });

  if (!showAll && files.length > maxRows) {
    rows.push(`- ...and ${files.length - maxRows} more file(s) with issues.`);
  }

  return rows;
}
