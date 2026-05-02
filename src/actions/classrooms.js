import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";
import { mainBanner } from "../ui/banner.js";
import boxen from "boxen";
import { CONSOLE_MAX_WIDTH } from "../constants.js";
import chalk from "chalk";
import { box } from "../ui/box.js";

export default async () => {
  const { userId } = await getSession();
  if (!userId) {
    console.log("You need to be logged in to view your classrooms.");
    return;
  }

  const classrooms = await Database.getClassroomsByUserId(userId);

  if (classrooms.length === 0) {
    box(
      "You are not a member of any classrooms yet.",
      "My Classrooms",
      null,
      null,
      true,
    );

    return;
  }

  const classroomList = classrooms
    .map((classroom, index) => {
      const isAccepted = classroom.accepted == true;
      const status = isAccepted
        ? chalk.green("Joined")
        : chalk.yellow("Pending approval");

      return boxen(
        `${index + 1}. ${chalk.bold(classroom.name)}\n\nStatus: ${status}\nDescription: ${classroom.description || "No description provided."}`,
        {
          padding: 0.5,
          width: CONSOLE_MAX_WIDTH - 8,
        },
      );
    })
    .join("\n");

  box(classroomList, "My Classrooms", null, null, true);
};
