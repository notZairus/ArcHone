import boxen from "boxen";
import chalk from "chalk";
import fs from "fs";
import path from "path";

import { account } from "../lib/appwrite.js";
import { mainBanner } from "../ui/banner.js";
import clack from "../lib/clack.js";
import { ARCHONE_DIR } from "../constants.js";

export default async function login() {
  console.clear();
  mainBanner();

  const sessionPath = path.join(ARCHONE_DIR, "session.json");

  if (!fs.existsSync(ARCHONE_DIR) || !fs.existsSync(sessionPath)) {
    console.log(
      boxen(
        `${chalk.red("Archie:")} I cannot log you in yet because ArcHone is not initialized.\n\nRun ${chalk.cyan("archone init")} first, then come back and run ${chalk.cyan("archone login")}.`,
        {
          padding: 1,
          borderStyle: "round",
          title: "Initialization Required",
        },
      ),
    );
    clack.outro(chalk.yellow("Login skipped until setup is complete."));
    return;
  }

  const loginGuide = [
    `${chalk.cyan("Archie:")} Let us get you signed in.`,
    "",
    `${chalk.bold("What happens next")}`,
    "- Enter your ArcHone account email and password",
    "- ArcHone securely verifies your account",
    "- Your local session is saved automatically",
  ].join("\n");

  console.log(
    boxen(loginGuide, {
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      borderStyle: "double",
      title: "ArcHone Login",
      titleAlignment: "center",
    }),
  );

  const { email, password } = await clack.group(
    {
      email: () =>
        clack.text({
          message: "Enter your email:",
          placeholder: "Email",
        }),
      password: () =>
        clack.password({
          message: "Enter your password:",
          placeholder: "Password",
        }),
    },
    {
      onCancel: () => {
        clack.outro(chalk.yellow("Login cancelled."));
        process.exit(0);
      },
    },
  );

  try {
    const session = await account.createEmailPasswordSession(email, password);
    const { userId, expire } = session;

    // Save session data to .archone/session.json
    fs.writeFileSync(sessionPath, JSON.stringify({ userId, expire }, null, 2));

    clack.outro(
      "\n" +
        boxen(
          `${chalk.green("Login successful.")}\n\nYou are now connected and ArcHone can access your account data on this machine.`,
          {
            padding: 1,
            borderStyle: "round",
            title: "Welcome Back",
          },
        ),
    );
  } catch (error) {
    clack.outro(
      "\n" +
        boxen(chalk.red(`Login failed: ${error.message}`), {
          padding: 1,
          borderStyle: "round",
          title: "Authentication Error",
        }),
    );
  }
}
