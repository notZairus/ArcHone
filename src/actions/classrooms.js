import {
  refreshScreen,
  showNotification,
  log,
  readClipboard,
  hideScreenChildren,
  showScreenChildren,
} from "../utils/helpers.js";
import { getSession } from "../utils/session.js";
import blessed from "blessed";
import { putHeader } from "../ui/components.js";
import Database from "../lib/db.js";
import chalk from "chalk";

export default async function classroomsAction({ screen }) {
  refreshScreen(screen);

  const { name, userId } = getSession();

  if (!userId || !name) {
    await showNotification({
      screen,
      message:
        "You need to be logged in to view your classrooms. Please run 'archone login' first.",
    });

    process.exit(0);
  }

  let classrooms = await Database.getClassroomsByUserId(userId);

  const box = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "50%",
    height: "80%",
    content: "",
  });

  putHeader(box, "ArcHone Classrooms");

  const joinForm = blessed.form({
    parent: box,
    top: 3,
    left: "center",
    width: "100%",
    height: 8,
    border: "line",
    label: " Join Classrooms ",
  });

  const codeInput = blessed.textbox({
    parent: joinForm,
    top: 0,
    name: "classroomCode",
    left: 0,
    width: "82%",
    mouse: true,
    height: 3,
    inputOnFocus: true,
    border: "line",
  });

  const pasteBtn = blessed.button({
    parent: joinForm,
    top: 0,
    left: "82%",
    width: "16%",
    height: 3,
    border: "line",
    content: "Paste Code",
    mouse: true,
  });

  pasteBtn.on("press", async () => {
    const text = readClipboard();
    if (text && text.trim().length > 0) {
      codeInput.setValue(text.trim());
      screen.render();
    } else {
      hideScreenChildren(screen);

      await showNotification({
        screen,
        message: "Clipboard is empty or does not contain valid text.",
      });

      showScreenChildren(screen);
    }
  });

  const submitBtn = blessed.button({
    parent: joinForm,
    width: "97%",
    height: 3,
    top: 3,
    border: "line",
    content: "Submit",
    align: "center",
    valign: "middle",
    mouse: true,
  });

  submitBtn.on("press", () => {
    joinForm.submit();
  });

  joinForm.on("submit", async (data) => {
    const code = data.classroomCode?.trim();

    try {
      hideScreenChildren(screen);

      await Database.joinClassroom(userId, code);

      await showNotification({
        screen,
        message:
          "Successfully submitted join request. Please wait for approval.",
      });

      await classroomsAction({ screen });
    } catch (error) {
      await showNotification({
        screen,
        message:
          "Failed to join classroom. Please check the code and try again.",
      });

      showScreenChildren(screen);
    }
  });

  const classroomContainer = blessed.box({
    parent: box,
    top: 11,
    mouse: true,
    padding: {
      left: 1,
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "grey",
      },
      style: {
        inverse: true,
      },
    },
    left: 0,
    label: " Classroom List ",
    width: "100%",
    height: "100%-11",
    border: "line",
  });

  classrooms.length <= 0 &&
    classroomContainer.setContent(
      chalk.yellow("\nYou are not a member of any classrooms yet."),
    );

  classrooms.length > 0 &&
    classrooms.forEach((classroom, index) => {
      const isAccepted = classroom.accepted == true;

      const classroomBox = blessed.box({
        parent: classroomContainer,
        top: index * 5,
        left: 0,
        width: "95%",
        height: 5,
        border: "line",
        content: `{bold}${index + 1}. ${classroom.name}{/bold}\nStatus: ${isAccepted ? chalk.green("Accepted") : chalk.yellow("Pending approval")}\nDescription: ${
          classroom.description || "No description provided."
        }`,
        tags: true,
      });
    });

  screen.render();
}
