import clack from "../lib/clack.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import boxen from "boxen";
import { mainBanner } from "../ui/banner.js";
import { ARCHONE_DIR } from "../constants.js";

export default async () => {
  console.clear();
  mainBanner();

  const sessionPath = path.join(ARCHONE_DIR, "session.json");
  const lastAnalysisPath = path.join(ARCHONE_DIR, "last_analysis.json");

  const setupGuide = [
    `${chalk.cyan("Archie:")} I will set up ArcHone on this machine.`,
    "",
    `${chalk.bold("What this setup does")}`,
    "- Creates ~/.archone in your home directory",
    "- Creates session.json for login session data",
    "- Creates a last_analysis.json file to store your most recent analysis results",
    "",
    `${chalk.bold("Install Location")}`,
    chalk.yellow(ARCHONE_DIR),
  ].join("\n");

  console.log(
    boxen(setupGuide, {
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      borderStyle: "double",
      title: "ArcHone Initialization",
      titleAlignment: "center",
    }),
  );

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
    clack.outro(
      "\n" +
        boxen(
          `${chalk.yellow("ArcHone is already initialized.")}\n\nYou can continue using the CLI normally.\nIf you want a clean reset, remove ~/.archone and run 'archone init' again.`,
          {
            padding: 1,
            borderStyle: "round",
            title: "No Action Needed",
          },
        ),
    );
    return;
  }

  try {
    fs.mkdirSync(ARCHONE_DIR, { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify({}, null, 2));
    fs.writeFileSync(lastAnalysisPath, JSON.stringify({}, null, 2));

    clack.outro(
      "\n" +
        boxen(
          `${chalk.green("Initialization complete.")}\n\nArcHone is ready on this machine.\nNext step: run ${chalk.cyan("archone login")} to connect your account.`,
          {
            padding: 1,
            borderStyle: "round",
            title: "Setup Successful",
          },
        ),
    );
  } catch (error) {
    clack.outro(chalk.red(`Error initializing project: ${error.message}`));
  }
};
