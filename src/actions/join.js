import clack from "../lib/clack.js";
import chalk from "chalk";
import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";
import boxen from "boxen";
import { CONSOLE_MAX_WIDTH } from "../constants.js";
import { mainBanner } from "../ui/banner.js";

export default async () => {
  console.clear();
  mainBanner();

  const { userId } = await getSession();

  if (!userId) {
    console.log(
      chalk.red(
        boxen(
          "You must be logged in to join a classroom. Please run 'archone login' first.",
          {
            padding: 1,
            width: CONSOLE_MAX_WIDTH,
            borderStyle: "double",
            title: "Unauthenticated",
          },
        ) + "\n",
      ),
    );
    return;
  }

  const joinGuide = [
    `${chalk.bold("Join a Classroom")}`,
    "Enter the classroom code provided by your instructor to submit a join request.",
    "",
    `${chalk.bold("What you will provide")}`,
    "- Classroom code",
    "",
    `${chalk.bold("After submitting")}`,
    "- Your instructor must approve your request",
    `- Use ${chalk.cyan("archone classrooms")} to check your classroom access`,
    "",
    chalk.dim("Press Ctrl+C to cancel at any time"),
  ].join("\n");

  console.log(
    boxen(joinGuide, {
      padding: 1,
      width: CONSOLE_MAX_WIDTH,
      borderStyle: "double",
      title: "Join Classroom",
      titleAlignment: "center",
    }),
  );

  const { classroomCode } = await clack.group(
    {
      classroomCode: () =>
        clack.text({
          message: "Enter classroom code:",
          placeholder: "Classroom code",
          validate: (value) => {
            if (!value || value.length < 5) {
              return "Classroom code must be at least 5 characters long.";
            }
          },
        }),
    },
    {
      onCancel: () => {
        clack.outro(chalk.yellow("Action cancelled."));
        process.exit(0);
      },
    },
  );

  const spinner = clack.spinner();

  spinner.start(chalk.blue(`Joining classroom with code: ${classroomCode}...`));

  try {
    await Database.joinClassroom(userId, classroomCode);
  } catch {
    spinner.stop(
      chalk.red(
        `Failed to join classroom with code: ${classroomCode}. Please check the code and try again.`,
      ),
    );
    console.log("\n");
    return;
  }

  spinner.stop(
    chalk.green(
      `Successfully requested to joined the classroom with code: ${classroomCode}!\nWait for your instructor to approve your request.`,
    ),
  );
  console.log("\n");
};
