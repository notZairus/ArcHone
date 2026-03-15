import clack from "../lib/clack.js";
import fs from "fs";
import path from "path";
import os from "os";
import chalk from "chalk";
import boxen from "boxen";
import Database from "better-sqlite3";

import { mainBanner } from "../ui/banner.js";

export default async () => {
  console.clear();
  mainBanner();

  console.log(
    boxen(
      "This will initialize the project and create .archone/ in your home directory.",
      {
        padding: 1,
        borderStyle: "round",
        title: "Initialize ArchOne",
      },
    ),
  );

  const allowed = await clack.confirm({
    message: "Do you want to continue?",
    yes: "Yes, let's do it!",
    no: "No, maybe later.",
  });

  if (!allowed) {
    clack.outro(
      chalk.red(
        "Initialization cancelled. You can run 'archone init' anytime to set it up.",
      ),
    );
    return;
  }

  const homeDir = os.homedir();
  const archoneDir = path.join(homeDir, ".archone");

  if (fs.existsSync(archoneDir)) {
    clack.outro(
      chalk.yellow(
        "ArchOne is already initialized. If you're logged in, you can start using it right away. If you want to reset, please delete the .archone directory in your home folder and run 'archone init' again.",
      ),
    );
    return;
  }

  try {
    fs.mkdirSync(archoneDir);
    fs.writeFileSync(path.join(archoneDir, ".env"), ""); // Create empty .env
    fs.writeFileSync(path.join(archoneDir, "archone.db"), ""); // Create empty archone.db

    await initializeDatabase();

    clack.outro(
      chalk.green(
        "Project initialized successfully! The .archone directory has been created in your home directory.",
      ),
    );
  } catch (error) {
    clack.outro(chalk.red(`Error initializing project: ${error.message}`));
  }
};

async function initializeDatabase() {
  const dbPath = path.join(os.homedir(), ".archone", "archone.db");
  const db = new Database(dbPath);

  // TODO: Implement database initialization logic here (e.g., create tables, set up schema, etc.)
}
