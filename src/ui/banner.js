import figlet from "figlet";
import chalk from "chalk";
import boxen from "boxen";

export const mainBanner = () => {
  console.log(
    figlet.textSync("ArcHone", {
      font: "Small Slant",
      horizontalLayout: "default",
      verticalLayout: "default",
    }),
  );
};
