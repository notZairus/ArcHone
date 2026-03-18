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

  if (! fs.existsSync(ARCHONE_DIR) || !fs.existsSync(path.join(ARCHONE_DIR, "session.json"))) {
    console.log(chalk.red(boxen("ArchOne is not initialized. Please run 'archone init' first to set up the project.", {
      padding: 1,
      borderStyle: "round",
      title: "ArchOne Not Initialized",
    })) + "\n");
    return;
  } 

  console.log(
    boxen("Please enter your credentials to log in.", {
      padding: 1,
      borderStyle: "round",
      title: "Archone Login",
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
        clack.outro("Login cancelled.");
        process.exit(0);
      },
    },
  );

  try {
    const session = await account.createEmailPasswordSession(email, password);
    const { userId, expire } = session;

    // Save session data to .archone/session.json
    fs.writeFileSync(
      path.join(ARCHONE_DIR, "session.json"),
      JSON.stringify({ userId, expire }, null, 2),
    );

    clack.outro(chalk.green("Login successful!"));
  } catch (error) {
    clack.outro(chalk.red(`Login failed: ${error.message}`));
  }
}
