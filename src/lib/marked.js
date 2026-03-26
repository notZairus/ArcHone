import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

marked.use(markedTerminal());
marked.use({
  renderer: {
    code(token) {
      const text =
        typeof token === "object" && token !== null ? token.text : token;
      return `${text}\n\n`;
    },
  },
});

export default marked;
