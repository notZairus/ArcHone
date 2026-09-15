import blessed from "blessed";
import {
  refreshScreen,
  showNotification,
  hideScreenChildren,
  showScreenChildren,
  backToMenu,
} from "../utils/helpers.js";
import chalk from "chalk";
import fs from "fs";
import { account } from "../lib/appwrite.js";
import { SESSION_PATH } from "../constants.js";
import Database from "../lib/db.js";
import { getSession } from "../utils/session.js";

function isLoggedIn() {
  const session = getSession();

  if (!session.userId) {
    return false;
  }

  return true;
}

export default async function login({
  screen,
  hasActionByDefault,
  email,
  password,
  focusOn = "email",
}) {
  refreshScreen(screen);

  if (isLoggedIn()) {
    const session = getSession();
    const message = `${chalk.green("You are already logged in.")}\n\nWelcome back, ${chalk.bold(
      session.name,
    )}! Your ArcHone CLI is connected to your account on this machine.`;

    await showNotification({ screen, message });
    backToMenu(hasActionByDefault);
    return;
  }

  const form = blessed.form({
    parent: screen,
    width: "50%",
    height: 18,
    top: "center",
    left: "center",
    keys: true,
    border: {
      type: "line",
    },
    label: chalk.bold(" Archone Login "),
  });

  const closeButton = blessed.button({
    parent: form,
    mouse: true,
    keys: true,
    shrink: true,
    padding: {
      left: 1,
      right: 1,
      top: 0,
      bottom: 0,
    },
    right: 1,
    top: 0,
    name: "close",
    content: "X",
  });

  closeButton.on("press", () => {
    backToMenu(hasActionByDefault);
    return;
  });

  const emailLabel = blessed.text({
    parent: form,
    top: 2,
    left: 5,
    content: "Email:",
  });

  const emailInput = blessed.textbox({
    parent: form,
    name: "email",
    top: 3,
    left: "center",
    width: "90%",
    height: 3,
    mouse: true,
    inputOnFocus: true,
    border: {
      type: "line",
    },
  });

  if (email) {
    emailInput.setValue(email);
  }

  const passwordLabel = blessed.text({
    parent: form,
    top: 7,
    left: 5,
    content: "Password:",
  });

  const passwordInput = blessed.textbox({
    parent: form,
    name: "password",
    top: 8,
    left: "center",
    width: "90%",
    height: 3,
    inputOnFocus: true,
    censor: true,
    mouse: true,
    border: {
      type: "line",
    },
  });

  if (password) {
    passwordInput.setValue(password);
  }

  emailInput.on("click", () => {
    login({
      screen,
      hasActionByDefault,
      email: emailInput.value,
      password: passwordInput.value,
      focusOn: "email",
    });
  });

  passwordInput.on("click", () => {
    login({
      screen,
      hasActionByDefault,
      email: emailInput.value,
      password: passwordInput.value,
      focusOn: "password",
    });
  });

  const submitButton = blessed.button({
    parent: form,
    mouse: true,
    keys: true,
    shrink: true,
    padding: {
      left: 4,
      right: 4,
    },
    left: "center",
    top: 12,
    name: "submit",
    content: "Submit",
    border: "line",
  });

  submitButton.on("press", () => {
    form.submit();
  });

  form.on("submit", (data) => {
    handleSubmit({ screen, data });
  });

  if (focusOn == "email") {
    emailInput.focus();
  } else {
    passwordInput.focus();
  }

  screen.render();
}

async function handleSubmit({ screen, data }) {
  const loader = blessed.loading({
    parent: screen,
    top: "center",
    left: "center",
    width: "20%",
    height: "shrink",
    border: "line",
    align: "center",
    valign: "middle",
  });

  try {
    hideScreenChildren(screen);

    loader.load("Logging in...");

    const { userId, expire } = await account.createEmailPasswordSession(
      data.email,
      data.password,
    );

    const user = await Database.getUserById(userId);

    if (user.role === "instructor") {
      const message = `${chalk.red("Login failed.")}\n\n${chalk.bold("Access Denied: Instructor accounts cannot log in to the ArcHone CLI.")}\n\nPlease use a student account to access the CLI features.`;

      await showNotification({ screen, message });
      process.exit(1);
    }

    if (user.status !== "verified") {
      const message = `${chalk.red("Login failed.")}\n\n${chalk.bold("Verification Required: Your email address is not verified.")}\n\nPlease check your email's inbox for a verification email and verify your account before logging in.`;

      await showNotification({ screen, message });
      process.exit(1);
    }

    // Save session data to .archone/session.json
    fs.writeFileSync(
      SESSION_PATH,
      JSON.stringify(
        { userId: user.$id, name: user.name, role: user.role, expire },
        null,
        2,
      ),
    );

    loader.stop();
    loader.hide();

    await showNotification({
      screen,
      message: `${chalk.green("Login successful!")}\n\nWelcome, ${chalk.bold(user.name)}! Your ArcHone CLI is now connected to your account. You can start running analyses and accessing your data securely on this machine.`,
    });

    process.exit(0);
  } catch (error) {
    loader.stop();
    loader.hide();

    await showNotification({
      screen,
      message: `${chalk.red("Login failed.")}\n\n${chalk.bold(error.message.toUpperCase())}\n\nPlease check your credentials and try again.`,
    });

    login({ screen, hasActionByDefault });
  }
}
