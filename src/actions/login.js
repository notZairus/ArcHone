// TODO: login action

import boxen from "boxen";
import clack from "../lib/clack.js";
import chalk from "chalk";
import { mainBanner } from "../ui/banner.js";

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

  const username = await clack.text({
    message: "Enter your username:",
    placeholder: "Username",
  });

  const password = await clack.password({
    message: "Enter your password:",
    placeholder: "Password",
  });

  if (username === "admin" && password === "password") {
    clack.outro(chalk.green("Login successful!"));
  } else {
    clack.outro(chalk.red("Invalid Credentials."));
  }
}
