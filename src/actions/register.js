import boxen from "boxen";
import { ID } from "appwrite";
import chalk from "chalk";

import clack from "../lib/clack.js";
import open from "open";
import { account } from "../lib/appwrite.js";
import { mainBanner } from "../ui/banner.js";
import Database from "../lib/db.js";
import { CONSOLE_MAX_WIDTH } from "../constants.js";

// export default async function register() {
//   console.clear();
//   mainBanner();

//   const registerGuide = [
//     `${chalk.bold("Welcome to ArcHone!")}`,
//     `Let's create your ArcHone account so you can start analyzing code and tracking your progress!`,
//     ``,
//     `${chalk.bold("What you will provide")}`,
//     "- Email address",
//     "- Display name",
//     "- Password and confirmation",
//     "",
//     `${chalk.bold("After registration")}`,
//     `- Run ${chalk.cyan("archone login")} to start your authenticated session`,
//   ].join("\n");

//   console.log(
//     boxen(registerGuide, {
//       padding: { top: 1, right: 2, bottom: 1, left: 2 },
//       width: CONSOLE_MAX_WIDTH,
//       borderStyle: "double",
//       title: "ArcHone Registration",
//       titleAlignment: "center",
//     }),
//   );

//   const { email, name, password, confirmPassword } = await clack.group(
//     {
//       email: () =>
//         clack.text({
//           message: "Enter your email:",
//           placeholder: "Email",
//         }),
//       name: () =>
//         clack.text({
//           message: "Enter your name:",
//           placeholder: "Name",
//         }),
//       password: () =>
//         clack.password({
//           message: "Enter your password:",
//           placeholder: "Password",
//         }),
//       confirmPassword: () =>
//         clack.password({
//           message: "Confirm your password:",
//           placeholder: "Confirm Password",
//         }),
//     },
//     {
//       onCancel: () => {
//         clack.outro(chalk.yellow("Registration cancelled."));
//         process.exit(0);
//       },
//     },
//   );

//   if (password !== confirmPassword) {
//     console.log(
//       boxen(
//         chalk.red(
//           "Passwords did not match. Please run registration again and make sure both password entries are identical.",
//         ),
//         {
//           padding: 1,
//           width: CONSOLE_MAX_WIDTH,
//           borderStyle: "round",
//           title: "Validation Error",
//         },
//       ),
//     );
//     clack.outro(chalk.red("Archie: Registration stopped for your safety."));
//     return;
//   }

//   try {
//     const userId = ID.unique();

//     await account.create({
//       userId,
//       email,
//       name,
//       password,
//     });
//     await Database.saveNewUser(userId, email, name, "student");

//     clack.outro(
//       "\n" +
//         boxen(
//           `${chalk.green("Registration successful.")}\n\nYour ArcHone account is ready. Next step: run ${chalk.cyan("archone login")} to sign in on this machine.`,
//           {
//             padding: 1,
//             width: CONSOLE_MAX_WIDTH,
//             borderStyle: "round",
//             title: "Account Created",
//           },
//         ),
//     );
//   } catch (error) {
//     console.log(
//       boxen(chalk.red(`Registration failed: ${error.message}`), {
//         padding: 1,
//         width: CONSOLE_MAX_WIDTH,
//         borderStyle: "round",
//         title: "Registration Error",
//       }),
//     );
//     clack.outro(chalk.red("Archie: Please review your details and try again."));
//     return;
//   }
// }

export default async function register() {
  console.clear();
  mainBanner();

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

  // open a new browser window to the registration page
  const registrationUrl = "https://archone.vercel.app/register-student";
  console.log(
    boxen(registerGuide, {
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      width: CONSOLE_MAX_WIDTH,
      borderStyle: "double",
      title: "ArcHone Registration",
      titleAlignment: "center",
    }),
  );

  clack.outro(
    chalk.green(
      "ArcHone: Registration initiated. Please complete the process in your browser.",
    ),
  );

  // if the browser tab did not open, the user can copy and paste the URL to complete registration
  console.log(
    boxen(registrationUrl, {
      padding: 1,
      width: CONSOLE_MAX_WIDTH,
      borderStyle: "double",
      title: "Registration URL",
    }),
  );

  console.log(
    chalk.yellow(
      "\Please copy and paste the URL above into your browser to complete registration.\n",
    ),
  );
}
