import boxen from "boxen";
import { ID } from "appwrite";
import chalk from "chalk";

import clack from "../lib/clack.js";
import { account } from "../lib/appwrite.js";
import { mainBanner } from "../ui/banner.js";

export default async function register() {
  console.clear();
  mainBanner();

  console.log(
    boxen("Please enter your registration details.", {
      padding: 1,
      borderStyle: "round",
      title: "Archone Registration",
    }),
  );

  const { email, password, confirmPassword } = await clack.group(
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
      confirmPassword: () =>
        clack.password({
          message: "Confirm your password:",
          placeholder: "Confirm Password",
        }),
    },
    {
      onCancel: () => {
        clack.outro("Registration cancelled.");
        process.exit(0);
      },
    },
  );

  if (password !== confirmPassword) {
    clack.outro(chalk.red("Passwords do not match. Please try again."));
    return;
  }

  try {
    const user = await account.create(ID.unique(), email, password);
    clack.outro(chalk.green("Registration successful! You can now log in."));
  } catch (error) {
    clack.outro(chalk.red(`Registration failed: ${error.message}`));
    return;
  }
}
