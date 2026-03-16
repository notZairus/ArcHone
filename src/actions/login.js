import boxen from "boxen";
import chalk from "chalk";

import { account } from "../lib/appwrite.js";
import { mainBanner } from "../ui/banner.js";
import clack from "../lib/clack.js";

export default async function login() {
  console.clear();
  mainBanner();

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
    await account.createEmailPasswordSession(email, password);
    clack.outro(chalk.green("Login successful!"));
  } catch (error) {
    clack.outro(chalk.red(`Login failed: ${error.message}`));
  }
}
