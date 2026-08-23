import blessed from "blessed";
import chalk from "chalk";

export const putHeader = (container, content) => {
  const header = blessed.box({
    parent: container,
    top: 0,
    left: "center",
    height: 3,
    width: "100%",
    content: chalk.bold(content),
    border: "line",
    align: "center",
  });

  const closeButton = blessed.box({
    parent: header,
    top: 0,
    right: 1,
    width: 1,
    content: "X",
  });

  closeButton.on("click", () => {
    process.exit(0);
  });

  return { header };
};
