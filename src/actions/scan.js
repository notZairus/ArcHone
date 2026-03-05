import clack from "../lib/clack.js";
import fs from "fs";
import path from "path";
import archy from "archy";
import { getConfig } from "../utils/config.js";

export default async () => {
  const target = process.argv.slice(4)[0] || process.cwd();
  const spinner = clack.spinner();

  const scan = scanDirectory(process.cwd());

  clack.note(
    target +
      "\n\n" +
      archy(scan.structure) +
      "\n\n" +
      scan.state.fileCount +
      " files and " +
      scan.state.folderCount +
      " folders found." +
      "\n\nScanning up to " +
      scan.state.level +
      " levels deep.",
  );

  spinner.start("Analyzing project with AI...");
  await new Promise((resolve) => setTimeout(resolve, 3000));
  spinner.stop("Analysis complete!");
};

function scanDirectory(
  dir,
  state = { fileCount: 0, folderCount: 0, level: 1 },
) {
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

  for (const file of files) {
    if (ignored.includes(file.name) || file.name.startsWith(".")) continue;

    if (file.isDirectory()) {
      const result = scanDirectory(file.parentPath + "/" + file.name, {
        ...state,
        level: state.level + 1,
      });

      const subStructure = result.structure;
      newState = result.state;

      structure.nodes.push(subStructure);
      state.folderCount += 1;
    } else {
      structure.nodes.push(file.name);
      state.fileCount += 1;
    }
  }

  if (structure.nodes.length === 0) {
    structure.nodes.push("(empty)");
  }

  return {
    structure,
    state: newState,
  };
}
