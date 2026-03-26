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

  const archoneDir = ARCHONE_DIR;
  const sessionPath = path.join(archoneDir, "session.json");

  const setupGuide = [
    `${chalk.cyan("Archie:")} I will set up ArcHone on this machine.`,
    "",
    `${chalk.bold("What this setup does")}`,
    "- Creates ~/.archone in your home directory",
    "- Creates session.json for login session data",
    "",
    `${chalk.bold("Install Location")}`,
    chalk.yellow(archoneDir),
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

  if (fs.existsSync(archoneDir)) {
    console.log(
      boxen(
        `${chalk.yellow("ArcHone is already initialized.")}\n\nYou can continue using the CLI normally.\nIf you want a clean reset, remove ~/.archone and run 'archone init' again.`,
        {
          padding: 1,
          borderStyle: "round",
          title: "No Action Needed",
        },
      ),
    );
    clack.outro(chalk.yellow("Initialization skipped."));
    return;
  }

  try {
    fs.mkdirSync(archoneDir, { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify({}, null, 2));

    console.log(
      boxen(
        `${chalk.green("Initialization complete.")}\n\nArcHone is ready on this machine.\nNext step: run ${chalk.cyan("archone login")} to connect your account.`,
        {
          padding: 1,
          borderStyle: "round",
          title: "Setup Successful",
        },
      ),
    );
    clack.outro(chalk.green("Archie: You're all set."));
  } catch (error) {
    clack.outro(chalk.red(`Error initializing project: ${error.message}`));
  }
};
