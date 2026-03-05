import * as clack from "@clack/prompts";

clack.updateSettings({
  aliases: {
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  },
});

export default clack;
