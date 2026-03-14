import boxen from "boxen";
import chalk from "chalk";

export const boxSuccess = (text = "Text Placeholder") => {
  console.log("\n");

  console.log(
    boxen(chalk.green("(≧◡≦): " + text), {
      borderColor: "green",
      padding: 1,
      borderStyle: "round",
    }),
  );

  console.log("\n");
};

export const boxError = (text = "Text Placeholder") => {
  console.log("\n");

  console.log(
    boxen(chalk.red("(≧︿≦): " + text), {
      borderColor: "red",
      padding: 1,
      borderStyle: "round",
    }),
  );

  console.log("\n");
};
