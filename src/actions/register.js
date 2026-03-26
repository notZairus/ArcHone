import boxen from "boxen";
import { ID } from "appwrite";
import chalk from "chalk";

import clack from "../lib/clack.js";
import { account } from "../lib/appwrite.js";
import { mainBanner } from "../ui/banner.js";

export default async function register() {
  console.clear();
  mainBanner();

  const registerGuide = [
    `${chalk.cyan("Archie:")} Let us create your ArcHone account.`,
    "",
    `${chalk.bold("What you will provide")}`,
    "- Email address",
    "- Display name",
    "- Password and confirmation",
    "",
    `${chalk.bold("After registration")}`,
    `- Run ${chalk.cyan("archone login")} to start your authenticated session`,
  ].join("\n");

  console.log(
    boxen(registerGuide, {
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      borderStyle: "double",
      title: "ArcHone Registration",
      titleAlignment: "center",
    }),
  );

  const { email, name, password, confirmPassword } = await clack.group(
    {
      email: () =>
        clack.text({
          message: "Enter your email:",
          placeholder: "Email",
        }),
      name: () =>
        clack.text({
          message: "Enter your name:",
          placeholder: "Name",
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
        clack.outro(chalk.yellow("Registration cancelled."));
        process.exit(0);
      },
    },
  );

  if (password !== confirmPassword) {
    console.log(
      boxen(
        chalk.red(
          "Passwords did not match. Please run registration again and make sure both password entries are identical.",
        ),
        {
          padding: 1,
          borderStyle: "round",
          title: "Validation Error",
        },
      ),
    );
    clack.outro(chalk.red("Archie: Registration stopped for your safety."));
    return;
  }

  try {
    await account.create({
      userId: ID.unique(),
      email,
      name,
      password,
    });

    clack.outro(
      "\n" +
        boxen(
          `${chalk.green("Registration successful.")}\n\nYour ArcHone account is ready. Next step: run ${chalk.cyan("archone login")} to sign in on this machine.`,
          {
            padding: 1,
            borderStyle: "round",
            title: "Account Created",
          },
        ),
    );
  } catch (error) {
    console.log(
      boxen(chalk.red(`Registration failed: ${error.message}`), {
        padding: 1,
        borderStyle: "round",
        title: "Registration Error",
      }),
    );
    clack.outro(chalk.red("Archie: Please review your details and try again."));
    return;
  }
}
