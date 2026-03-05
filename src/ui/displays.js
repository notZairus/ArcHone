import figlet from "figlet";

export const mainBanner = () => {
  console.log(
    figlet.textSync("ArcHone", {
      font: "Small Slant",
      horizontalLayout: "default",
      verticalLayout: "default",
    }),
  );
};
