import { mainBanner } from "../ui/banner.js";
import boxen from "boxen";
import chalk from "chalk";

export default async function about() {
  console.clear();
  mainBanner();

  const aboutText = chalk.cyan(
    [
      "(^‿^): Hey there, I am Archie, your code sidekick inside Archone.",
      "",
      "What is Archone?",
      "Archone is a CLI code analyzer developed to help beginner developers write cleaner and more readable code.",
      "It also introduces them to industry coding standards by explaining issues in plain language and suggesting practical improvements.",
    ].join("\n"),
  );

  console.log(
    boxen(aboutText, {
      title: "About Archone",
      titleAlignment: "left",
      borderStyle: "round",
      borderColor: "cyan",
      padding: 1,
      margin: 1,
    }),
  );
  console.log("\n");
}
