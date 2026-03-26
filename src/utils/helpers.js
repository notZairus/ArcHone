import fs from "fs";
import path from "path";
import chalk from "chalk";
import boxen from "boxen";
import clack from "../lib/clack.js";
import { VALID_FILE_EXTENSIONS, IGNORED_FILE_NAMES } from "../constants.js";

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const selectFileFromDirectory = async (
  startDirectory = process.cwd(),
) => {
  let currentDirectory = path.resolve(startDirectory);
  let didRenderHeader = false;

  while (true) {
    let directoryEntries = [];

    try {
      directoryEntries = fs
        .readdirSync(currentDirectory, { withFileTypes: true })
        .filter((entry) => {
          return (
            !entry.isSymbolicLink() && !IGNORED_FILE_NAMES.includes(entry.name)
          );
        })
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });
    } catch {
      clack.note(
        `Unable to read: ${currentDirectory}`,
        "Directory access issue",
      );
      const parentDirectory = path.dirname(currentDirectory);

      if (parentDirectory === currentDirectory) {
        return null;
      }

      currentDirectory = parentDirectory;
      continue;
    }

    if (!didRenderHeader) {
      const startPath = path.relative(process.cwd(), currentDirectory) || ".";
      const intro = [
        `${chalk.cyan("Archie:")} Choose a file for analysis.`,
        "",
        `${chalk.bold("Picker Overview")}`,
        `- Start directory: ${chalk.cyan(startPath)}`,
        `- Supported files: ${VALID_FILE_EXTENSIONS.join(", ")}`,
        "",
        `${chalk.bold("How to use")}`,
        "- Select a [DIR] item to navigate",
        "- Select a [FILE] item to analyze",
        "- Use Cancel to exit the picker",
      ].join("\n");

      console.log(
        "\n" +
          boxen(intro, {
            title: "ArcHone Analyze",
            titleAlignment: "center",
            borderStyle: "double",
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          }),
      );

      didRenderHeader = true;
    }

    const options = [];
    const fileCount = directoryEntries.filter(
      (entry) => !entry.isDirectory(),
    ).length;
    const directoryCount = directoryEntries.length - fileCount;

    if (path.dirname(currentDirectory) !== currentDirectory) {
      options.push({
        value: "__parent__",
        label: "[DIR] ../",
        hint: "Go to parent directory",
      });
    }

    for (const entry of directoryEntries) {
      const extension = path.extname(entry.name).slice(1).toLowerCase();
      const isSupportedFile =
        entry.isDirectory() || VALID_FILE_EXTENSIONS.includes(extension);

      options.push({
        value: `${entry.isDirectory() ? "dir" : "file"}:${entry.name}`,
        label: entry.isDirectory()
          ? `[DIR] ${entry.name}/`
          : `[FILE] ${entry.name}`,
        hint: entry.isDirectory()
          ? "Open"
          : isSupportedFile
            ? "Ready to analyze"
            : `Unsupported (${VALID_FILE_EXTENSIONS.join(", ")})`,
      });
    }

    options.push({
      value: "__cancel__",
      label: "Cancel",
      hint: "Exit picker",
    });

    const visibleDirectory =
      path.relative(process.cwd(), currentDirectory) || ".";

    const selection = await clack.select({
      message: `Location: ${visibleDirectory} (${directoryCount} dirs, ${fileCount} files)`,
      options,
    });

    if (clack.isCancel(selection) || selection === "__cancel__") {
      return null;
    }

    if (selection === "__parent__") {
      currentDirectory = path.dirname(currentDirectory);
      continue;
    }

    const [entryType, ...nameParts] = selection.split(":");
    const selectedName = nameParts.join(":");
    const selectedPath = path.join(currentDirectory, selectedName);

    if (entryType === "dir") {
      currentDirectory = selectedPath;
      continue;
    }

    const selectedExtension = path.extname(selectedPath).slice(1).toLowerCase();
    if (!VALID_FILE_EXTENSIONS.includes(selectedExtension)) {
      clack.note(
        `Select a supported file type: ${VALID_FILE_EXTENSIONS.join(", ")}`,
        "Unsupported file",
      );
      continue;
    }

    return selectedPath;
  }
};
