import clack from "../lib/clack.js";
import chalk from "chalk";
import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";
import { box } from "../ui/box.js";

export default async () => {
  const { userId } = await getSession();

  if (!userId) {
    box(
      "You must be logged in to join a classroom. Please run 'archone login' first.",
      "Unauthenticated",
      null,
      null,
      true,
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

  box(joinGuide, "Join Classroom", null, null, true);

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

  // validate if the user is already part of the classroom

  const classroom = await Database.getClassroomByCode(classroomCode);

  if (!classroom) {
    spinner.stop(chalk.red(`No classroom found with code: ${classroomCode}.`));
    console.log("\n");
    return;
  }

  const existingClassroomUser = await Database.getClassroomUser(
    userId,
    classroom.$id,
  );

  if (existingClassroomUser) {
    if (existingClassroomUser.accepted) {
      spinner.stop(
        chalk.yellow(
          `You are already a member of the classroom with code: ${classroomCode}.\n`,
        ),
      );
    } else {
      spinner.stop(
        chalk.yellow(
          `You have already requested to join the classroom with code: ${classroomCode}. Please wait for your instructor to approve your request.\n`,
        ),
      );
    }

    return;
  }

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
      `Successfully requested to join the classroom with code: ${classroomCode}!\nWait for your instructor to approve your request.`,
    ),
  );
  console.log("\n");
};
