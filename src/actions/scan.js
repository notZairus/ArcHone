import clack from "../lib/clack.js";
import fs from "fs";
import path from "path";
import archy from "archy";
import { getConfig } from "../utils/config.js";
import { wait } from "../utils/helpers.js";
import { ARCHONE_DIR_PATH } from "../constants.js";

export default async () => {
  const target = process.argv.slice(4)[0] || process.cwd();
  const spinner = clack.spinner();

  spinner.start("Scanning project...");
  await wait(1000);
  spinner.stop("Scan complete!");

  const scanResult = scanDirectory(target);
  clack.note(
    target +
      "\n\n" +
      archy(scanResult.structure) +
      "\n\n" +
      scanResult.state.fileCount +
      " files and " +
      scanResult.state.folderCount +
      " folders found." +
      "\nScanning up to " +
      scanResult.state.level +
      " levels deep.",
    "Scan Results:",
  );

  saveScanResults(scanResult);
};

/// helpers

const scanDirectory = (
  dir,
  state = { fileCount: 0, folderCount: 0, level: 1 },
) => {
  const structure = {
    label: path.basename(dir),
    nodes: [],
  };

  let newState = state;

  const ignored = getConfig().exclude || [
    "node_modules",
    "vendor",
    "dist",
    "build",
  ];

  const files = fs.readdirSync(dir, { withFileTypes: true });

  // TODO fix the file count bug

  for (const file of files) {
    if (
      ignored.includes(file.name) ||
      (file.isDirectory() && file.name.startsWith("."))
    )
      continue;

    if (file.isDirectory()) {
      state.folderCount += 1;
      const result = scanDirectory(file.parentPath + "/" + file.name, {
        ...state,
        level: state.level + 1,
      });

      const subStructure = result.structure;
      newState = result.state;

      structure.nodes.push(subStructure);
    } else {
      state.fileCount += 1;
      structure.nodes.push(file.name);
    }
  }

  if (structure.nodes.length === 0) {
    structure.nodes.push("(empty)");
  }

  return {
    structure,
    state: newState,
  };
};

const saveScanResults = (results) => {
  if (!fs.existsSync(".archone")) {
    fs.mkdirSync(".archone");
  }

  fs.writeFileSync(
    ".archone/scan-result.json",
    JSON.stringify(results, null, 2),
  );
};
