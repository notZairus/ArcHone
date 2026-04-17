import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";
import { mainBanner } from "../ui/banner.js";
import boxen from "boxen";
import { CONSOLE_MAX_WIDTH } from "../constants.js";
import chalk from "chalk";

export default async () => {
  const { userId } = await getSession();
  if (!userId) {
    console.log("You need to be logged in to view your classrooms.");
    return;
  }

  const classrooms = await Database.getClassroomsByUserId(userId);

  console.log("\n");
  mainBanner();

  if (classrooms.length === 0) {
    console.log(
      boxen("You are not a member of any classrooms yet.", {
        padding: 1,
        width: 50,
        borderStyle: "double",
        title: "My Classrooms",
        titleAlignment: "center",
      }),
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

  console.log(
    boxen(classroomList, {
      padding: 1,
      width: CONSOLE_MAX_WIDTH,
      borderStyle: "double",
      title: "My Classrooms",
      titleAlignment: "left",
    }),
  );
  console.log("\n");
};
