import chalk from "chalk";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { box } from "../../src/ui/box.js";

const aiOutput = {
  title: "Deep Nesting",
  type: "warning",
  line: 10,
  message: "Function `(anonymous)` has deep nesting (level 6).",
  principle: "KISS (Keep It Simple, Stupid)",
  whyThisIssueMatters:
    "Imagine you're trying to find your favorite toy in a set of Russian nesting dolls. You open one doll, then another, then another, and so on. If there are too many dolls inside each other, it becomes really hard to remember which doll is which and how many layers you've gone through. In programming, 'deep nesting' is like having too many of these dolls. It makes your code very confusing and hard to follow, understand, or fix when something goes wrong. It's like trying to read a story where every new sentence is pushed further and further to the right on the page!",
  whatPartOfTheCodeCausedIt:
    "The problem comes from having many 'if' statements inside other 'if' statements. Look at the lines starting around line 10 (if (arr[i] !== null)). You see an 'if' inside an 'if', then another 'if' insidethat, and so on. Each new 'if' block pushes your code further to the right, creating a deeply indented section that is hard to read. This is like building a pyramid with 'if' statements.",
  beginnerFriendlyExplanation:
    "Think of your code like a recipe. If every step in the recipe has an 'if' condition (like 'if the water is boiling, then...', 'if you have eggs, then...', 'if the mixture is smooth, then...'), and these 'if's are all stacked up, the recipe becomes really hard to follow. You have to keep track of many conditions at once! 'Nesting' means putting one thing inside another. 'Deep nesting' means putting too many things inside each other.The solution is to use something called 'early returns' or 'guard clauses'. Instead of checking for all the *good* conditions to do something, you check for the *bad* conditions first. If something is bad, you stop right there, log an error, and move on to the next item. This makes your main recipe much shorter and easier to read because you only do the 'good path' when all the 'bad paths' have been avoided.",
  suggestedFixedCode:
    "```javascript\n" +
    "function (input) {\n" +
    '    var arr = input.split(",");\n' +
    "    var t = 0;\n" +
    "    var p = 0;\n" +
    "    var f = 0;\n" +
    "\n" +
    "    for (var i = 0; i < arr.length; i++) {\n" +
    "      var n = parseInt(arr[i]);\n" +
    "\n" +
    "      // Early exit conditions (guard clauses)\n" +
    "      if (isNaN(n)) {\n" +
    '        console.log("not a number");\n' +
    "        continue; // Skip to the next item in the loop\n" +
    "      }\n" +
    "\n" +
    "      if (n < 0) {\n" +
    '        console.log("negative score");\n' +
    "        continue;\n" +
    "      }\n" +
    "\n" +
    "      if (n > 100) {\n" +
    '        console.log("invalid score");\n' +
    "        continue;\n" +
    "      }\n" +
    "\n" +
    "      // If we reach here, 'n' is a valid score between 0 and 100\n" +
    "      t = t + n;\n" +
    "\n" +
    "      if (n >= 75) {\n" +
    "        p = p + 1;\n" +
    "      } else {\n" +
    "        f = f + 1;\n" +
    "      }\n" +
    "    }\n" +
    "\n" +
    "    var avg = 0;\n" +
    "\n" +
    "    if (arr.length > 0) {\n" +
    "      avg = t / arr.length;\n" +
    "    }\n" +
    "\n" +
    '    console.log("Average:", avg);\n' +
    '    console.log("Passed:", p);\n' +
    '    console.log("Failed:", f);\n' +
    "\n" +
    "    rl.close();\n" +
    "  }\n" +
    "```",
  whatChangedAndWhy: [
    {
      change: "Removed the `if (arr[i] !== null)` check.",
      why: "The original code first checked if `arr[i]` was not `null`. Then, inside that, it checked `!isNaN(n)`. The `parseInt()` function already handles situations where the input is `null` or not a valid number by returning `NaN` (Not a Number). So, the `isNaN(n)` check already covers the 'not a number' scenario, making the `arr[i] !== null` check redundant and allowing us to remove one layer of nesting.",
    },
    {
      change:
        "Replaced nested `if` statements with 'early return' (using `continue` in a loop) for invalid conditions.",
      why: "Instead of building a 'pyramid' of `if` statements to check for valid scores (like `if n >= 0`, then `ifn <= 100`), we now check for the *invalid* conditions first (`if n < 0`, `if n > 100`). If an invalid condition is found, we print the error and immediately use `continue`. This `continue` keyword tells the program to stop processingthe current item in the list and move on to the next one. This technique, called 'guard clauses' or 'early returns',flattens the code structure, making it much easier to read and understand. The main logic (adding scores, counting passes/fails) is no longer buried deep inside many `if` blocks, which follows the 'Keep It Simple, Stupid' (KISS) principle by making the flow of the program straightforward.",
    },
  ],
};

const aiOutput2 = {
  title: "Improvement: Use `const` instead of `var` for `arr`",
  type: "improvement",
  line: 11,
  message: "`arr` uses `var`, which can be confusing in JavaScript.",
  principle: "KISS (Keep It Simple, Stupid)",
  whyThisIssueMatters:
    "Imagine you have a box where you store a list of your favorite snacks. If you use a weak label (like `var`), someone might accidentally replace your snack list with something else, or put the same label on a different box, making it hard to know which box holds what. Using a stronger, clearer label (like `const` or `let`) helps you and others understand exactly what's inside and makes it harder to mess up. It makes your code more predictable and prevents unexpected issues.",
  whatPartOfTheCodeCausedIt:
    'The problem is on line 11, specifically where it says `var arr = input.split(",");`. The word `var` is the part causing the issue.',
  beginnerFriendlyExplanation:
    "In programming, we often put pieces of information into digital containers. Think of these containers like boxes, and wegive them names using labels like `var`, `let`, or `const`.\n" +
    "\n" +
    "`var` is like an old, flimsy label. It's easy to accidentally peel it off and put it on a different box, or even try to change what's inside the box in ways that can be confusing later.\n" +
    "\n" +
    "`const` (short for 'constant') is like a super strong label that says, 'This box will always contain this specific thing, and you can't change what's inside this box after I put it there.' It's great for things that should never change, like your birthdate.\n" +
    "\n" +
    "`let` is also a good, clear label. It says, 'I might change what's inside this box later, but I'll do it carefully and clearly.' It's for things that *can* change, like your current score in a game.\n" +
    "\n" +
    "Because `const` and `let` are much clearer and safer about how you use your boxes, modern programmers prefer them over `var` to avoid confusion andmistakes. It makes your code easier to read and understand for anyone, including your future self!",
  suggestedFixedCode: '```javascript\nconst arr = input.split(",");\n```',
  whatChangedAndWhy: [
    {
      change: "The keyword `var` was changed to `const`.",
      why: "In programming, we store information in 'variables' (like named boxes). `var` is an older way to name a box. It's less clear and can sometimes lead to mistakes because it allows the box to be re-used or changed in confusing ways. `const` is a modern way to name a box that tells everyone this box will hold the same thing forever. Since the 'arr' box here gets its list of items once and likely won't change to a *completely different* list later, `const` is the perfect, clearest, and safest choice. It makes your code easier to understand and prevents accidental changes to important information.",
    },
  ],
};

const selected = aiOutput;

const require = createRequire(import.meta.url);

function buildMarkdown(output) {
  const changeList = Array.isArray(output.whatChangedAndWhy)
    ? output.whatChangedAndWhy
        .map((change, index) =>
          [
            `## ${index + 1}. ${change.change}`,
            change.why || "No explanation provided.",
            "",
          ].join("\n"),
        )
        .join("\n")
    : "No change details provided.";

  return [
    box(
      chalk.bold(`Selected output: ${output.title}`),
      "AI OUTPUT",
      "center",
      "double",
      false,
      1,
    ),
    "\n\n",
    `## ${output.title || "Untitled AI Output"}`,
    `- Type: ${output.type || "unknown"}`,
    `- Line: ${output.line ?? "n/a"}`,
    `- Message: ${output.message || "No message provided."}`,
    `- Principle: ${output.principle || "No principle provided."}`,
    "",
    "### Why This Issue Matters",
    output.whyThisIssueMatters || "No explanation provided.",
    "",
    "### What Part Of The Code Caused It",
    output.whatPartOfTheCodeCausedIt || "No cause provided.",
    "",
    "### Beginner Friendly Explanation",
    output.beginnerFriendlyExplanation || "No explanation provided.",
    "",
    "### Suggested Fixed Code",
    output.suggestedFixedCode || "No fixed code provided.",
    "",
    "### What Changed And Why",
    changeList,
  ].join("\n");
}

function renderWithTerminalMarkdown(markdownText) {
  const tmCliPath = require.resolve("terminal-markdown/cli.js");

  const rendered = spawnSync(process.execPath, [tmCliPath], {
    input: markdownText,
    encoding: "utf8",
  });

  if (rendered.status !== 0) {
    throw new Error(rendered.stderr?.trim() || "terminal-markdown failed.");
  }

  return rendered.stdout || markdownText;
}

export function formatAiOutput(output) {
  const markdownText = buildMarkdown(output);
  const renderedText = renderWithTerminalMarkdown(markdownText);
  return renderedText;
}
