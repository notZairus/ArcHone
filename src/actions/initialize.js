import clack from "../lib/clack.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { box } from "../ui/box.js";
import { mainBanner } from "../ui/banner.js";
import { ARCHONE_DIR, CONSOLE_MAX_WIDTH } from "../constants.js";

export default async () => {
  const sessionPath = path.join(ARCHONE_DIR, "session.json");
  const lastAnalysisPath = path.join(ARCHONE_DIR, "last_analysis.json");

  const setupGuide = [
    `${chalk.bold("Welcome to ArcHone!")}`,
    "Let's get you set up with the ArcHone CLI on this machine.",
    "",
    `${chalk.bold("What this setup does")}`,
    "- Creates ~/.archone in your home directory",
    "- Creates session.json for login session data",
    "- Creates a last_analysis.json file to store your most recent analysis results",
    "",
    `${chalk.bold("Install Location")}`,
    chalk.yellow(ARCHONE_DIR),
  ].join("\n");

  box(setupGuide, "Initialization", null, null, true);

  const allowed = await clack.confirm({
    message: "Proceed with initialization now?",
    yes: "Yes, let's do it!",
    no: "No, maybe later.",
  });

  if (!allowed) {
    clack.outro(chalk.yellow("Setup cancelled. Run 'archone init' anytime."));
    return;
  }

  if (fs.existsSync(ARCHONE_DIR)) {
    box(
      `${chalk.yellow("ArcHone is already initialized.")}\n\nYou can continue using the CLI normally.\nIf you want a clean reset, remove ~/.archone and run 'archone init' again.`,
      "Already Initialized",
      "left",
      "round",
      false,
    );
    return;
  }

  try {
    fs.mkdirSync(ARCHONE_DIR, { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify({}, null, 2));
    fs.writeFileSync(lastAnalysisPath, JSON.stringify({}, null, 2));

    box(
      `${chalk.green("Initialization complete.")}\n\nArcHone is ready on this machine.\nNext step: run ${chalk.cyan("archone login")} to connect your account.`,
      "Setup Successful",
      "left",
      "round",
      false,
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch (error) {
    clack.outro(chalk.red(`Error initializing project: ${error.message}`));
  }
};
