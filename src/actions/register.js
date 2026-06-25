import boxen from "boxen";
import { ID } from "appwrite";
import chalk from "chalk";

import clack from "../lib/clack.js";
import open from "open";
import { account } from "../lib/appwrite.js";
import { mainBanner } from "../ui/banner.js";
import Database from "../lib/db.js";
import { CONSOLE_MAX_WIDTH } from "../constants.js";
import { box } from "../ui/box.js";

export default async function register() {
  const registerGuide = [
    `${chalk.bold("Welcome to ArcHone!")}`,
    `Let's create your ArcHone account so you can start analyzing code and tracking your progress!`,
    ``,
    `${chalk.bold("What you will provide")}`,
    "- Email address",
    "- Full name",
    "- Role",
    "- Password and confirmation",
    "",
    `${chalk.bold("After registration")}`,
    `- Run ${chalk.cyan("archone login")} to start your authenticated session`,
  ].join("\n");

  box(registerGuide, "Registration", null, null, true);

  clack.outro(
    chalk.green(
      "ArcHone: Registration initiated. Please complete the process in your browser.",
    ),
  );

  const registrationUrl = "http://localhost:5173" + "/register-student";

  box(registrationUrl, "Registration URL");

  console.log(
    chalk.yellow(
      "\Please copy and paste the URL above into your browser to complete registration.\n",
    ),
  );
}
