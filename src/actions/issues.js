import boxen from "boxen";
import chalk from "chalk";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { CONSOLE_MAX_WIDTH } from "../constants.js";

const require = createRequire(import.meta.url);
const detectableIssues = {
  catalog: "ArcHone Detectable Issues",
  version: 1,
  issues: [
    {
      title: "Unused Variable",
      severity: "warning",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "YAGNI (You Aren't Gonna Need It)",
      why: "Unused variables add noise and make students spend time understanding data that is never used.",
      suggestion:
        "Delete variables you do not need, or use them where they belong.",
      code: 'function calculateTotal(items) {\n  const taxRate = 0.12;\n  const debugMessage = "starting total";\n\n  return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);\n}',
      fix: "function calculateTotal(items) {\n  const taxRate = 0.12;\n\n  return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);\n}",
    },
    {
      title: "Unused Function",
      severity: "warning",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "YAGNI (You Aren't Gonna Need It)",
      why: "Unused functions increase maintenance cost because learners think they matter, but they are never executed.",
      suggestion:
        "Remove functions that are never called, or integrate them into real logic.",
      code: 'function helperFormatName(name) {\n  return name.trim().toUpperCase();\n}\n\nfunction showWelcome() {\n  console.log("Welcome student");\n}\n\nshowWelcome();',
      fix: 'function showWelcome() {\n  console.log("Welcome student");\n}\n\nshowWelcome();',
    },
    {
      title: "Use of var",
      severity: "improvement",
      detectableIn: ["javascript"],
      principle: "POLA (Principle of Least Astonishment)",
      why: "Using var can cause confusing scope behavior for beginners, especially inside loops and blocks.",
      suggestion:
        "Use const by default and let only when the value must change.",
      code: "function printIds(ids) {\n  for (var i = 0; i < ids.length; i++) {\n    console.log(ids[i]);\n  }\n}",
      fix: "function printIds(ids) {\n  for (let i = 0; i < ids.length; i++) {\n    console.log(ids[i]);\n  }\n}",
    },
    {
      title: "Poor Variable Naming",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "Clean Code (Meaningful Names)",
      why: "Unclear names force students to guess what values represent, slowing down learning and debugging.",
      suggestion: "Use names that describe the purpose of the data.",
      code: "function buildReceipt(cartItems) {\n  const x = cartItems.length;\n  const y = cartItems.reduce((a, b) => a + b.price, 0);\n\n  return { x, y };\n}",
      fix: "function buildReceipt(cartItems) {\n  const itemCount = cartItems.length;\n  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);\n\n  return { itemCount, totalPrice };\n}",
    },
    {
      title: "Naming Convention",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "Clean Code (Consistent Naming)",
      why: "Inconsistent naming makes code harder to scan because students cannot predict identifier styles.",
      suggestion:
        "Follow the language naming style consistently (camelCase, snake_case, or PascalCase based on language rules).",
      code: "function get_user_name(user_list) {\n  const UserName = user_list[0].name;\n  return UserName;\n}",
      fix: "function getUserName(userList) {\n  const userName = userList[0].name;\n  return userName;\n}",
    },
    {
      title: "Name Reuse",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "DRY (Don't Repeat Yourself)",
      why: "Reusing the same name for different values in one scope creates ambiguity and bugs.",
      suggestion: "Give each value a distinct, descriptive name.",
      code: "function summarizeOrder(order) {\n  const total = order.subtotal;\n  const total = order.subtotal + order.tax;\n  return total;\n}",
      fix: "function summarizeOrder(order) {\n  const subtotal = order.subtotal;\n  const grandTotal = order.subtotal + order.tax;\n  return grandTotal;\n}",
    },
    {
      title: "Function Too Long",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "SRP (Single Responsibility Principle)",
      why: "Long functions mix too many tasks, which makes them difficult for students to understand and test.",
      suggestion:
        "Break long functions into small helpers with one clear responsibility.",
      code: "function processOrder(order) {\n  // validation\n  // pricing\n  // discount\n  // tax\n  // inventory\n  // invoice\n  // notification\n  // audit log\n  // analytics\n  // ... many more lines\n}",
      fix: "function processOrder(order) {\n  validateOrder(order);\n  const priceSummary = calculatePrice(order);\n  saveInvoice(order, priceSummary);\n  notifyCustomer(order);\n}",
    },
    {
      title: "Too Many Parameters",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "KISS (Keep It Simple, Stupid)",
      why: "Too many parameters are hard to remember, easy to mix up, and harder to evolve.",
      suggestion: "Group related values in a single object or model.",
      code: "function createUser(firstName, lastName, email, phone, city, country, role) {\n  return { firstName, lastName, email, phone, city, country, role };\n}",
      fix: "function createUser(profile) {\n  const { firstName, lastName, email, phone, city, country, role } = profile;\n  return { firstName, lastName, email, phone, city, country, role };\n}",
    },
    {
      title: "High Complexity",
      severity: "warning",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "KISS (Keep It Simple, Stupid)",
      why: "Highly complex branching logic is harder to reason about and easier to break.",
      suggestion:
        "Split logic into focused helper functions and reduce nested decision points.",
      code: 'function decideDiscount(user, order) {\n  if (user.isVip) {\n    if (order.total > 1000) return 0.2;\n    if (order.total > 500) return 0.15;\n  } else {\n    if (order.total > 1000 && user.loyalty > 8) return 0.1;\n    if (order.total > 500 && user.loyalty > 5) return 0.07;\n  }\n\n  if (order.hasCoupon) {\n    if (order.couponType === "FLASH") return 0.12;\n    if (order.couponType === "WELCOME") return 0.05;\n  }\n\n  return 0;\n}',
      fix: "function decideDiscount(user, order) {\n  if (user.isVip) return getVipDiscount(order);\n  if (order.hasCoupon) return getCouponDiscount(order);\n  return getLoyaltyDiscount(user, order);\n}",
    },
    {
      title: "Deep Nesting",
      severity: "warning",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "KISS (Keep It Simple, Stupid)",
      why: "Deeply nested conditions force students to track many branches in their head, which increases mistakes.",
      suggestion:
        "Use guard clauses and early returns to flatten the control flow.",
      code: 'function nestedExample() {\n    if (condition) {\n        if (condition) {\n            if (condition) {\n                if (condition) {\n                    if (condition) {\n                        console.log("Deep level");\n                    } else {\n                        if (condition) {\n                            console.log("Alternate path 1");\n                        } else {\n                            if (condition) {\n                                console.log("Alternate path 2");\n                            }\n                        }\n                    }\n                }\n            }\n        }\n    }\n}',
      fix: 'function flatExample() {\n    if (!condition) return;\n\n    if (!condition) return;\n\n    if (!condition) return;\n\n    if (!condition) return;\n\n    if (!condition) return;\n\n    console.log("Deep level");\n\n    if (condition) {\n        console.log("Alternate path 1");\n        return;\n    }\n\n    if (condition) {\n        console.log("Alternate path 2");\n        return;\n    }\n}',
    },
    {
      title: "TODO Comment",
      severity: "info",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "None (TODOs should be resolved, not ignored)",
      why: "TODO comments can be useful, but unresolved TODOs often become forgotten technical debt.",
      suggestion:
        "Convert TODO comments into actionable tasks and remove them once completed.",
      code: "function finalizeReport(data) {\n  // TODO: validate edge cases before publishing\n  return buildReport(data);\n}",
      fix: "function finalizeReport(data) {\n  validateEdgeCases(data);\n  return buildReport(data);\n}",
    },
    {
      title: "Commented-out Code",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "YAGNI (You Aren't Gonna Need It)",
      why: "Commented-out code is noisy and misleading because students cannot tell if it is important or obsolete.",
      suggestion:
        "Delete dead code and rely on version control history when needed.",
      code: 'function renderUser(user) {\n  // const fullName = user.firstName + " " + user.lastName;\n  // showLegacyProfile(user);\n  showProfile(user);\n}',
      fix: "function renderUser(user) {\n  showProfile(user);\n}",
    },
  ],
  titles: [
    "Unused Variable",
    "Unused Function",
    "Use of var",
    "Poor Variable Naming",
    "Naming Convention",
    "Name Reuse",
    "Function Too Long",
    "Too Many Parameters",
    "High Complexity",
    "Deep Nesting",
    "TODO Comment",
    "Commented-out Code",
  ],
};

function toTitleCase(value = "") {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function formatIssueList(issues) {
  const lines = [
    "Archie: Here are ArcHone's detectable issues.",
    "",
    chalk.bold("How to use"),
    "- Run archone issues <number> to open a full lesson",
    '- Run archone issues "Issue Title" to open by title',
    "",
    chalk.bold("Issue Catalog"),
  ];

  issues.forEach((issue, index) => {
    lines.push(`${index + 1}. ${issue.title}`);
  });

  return lines.join("\n");
}

function getMarkdownFence(issue) {
  const detectableIn = Array.isArray(issue.detectableIn)
    ? issue.detectableIn
    : [];

  if (detectableIn.includes("javascript")) {
    return "javascript";
  }

  if (detectableIn.includes("python")) {
    return "python";
  }

  if (detectableIn.includes("csharp")) {
    return "csharp";
  }

  return "";
}

function formatIssueLessonMarkdown(issue) {
  const languages = Array.isArray(issue.detectableIn)
    ? issue.detectableIn.join(", ")
    : "unknown";
  const fence = getMarkdownFence(issue);

  const lessonLines = [
    `## Title of the issue: ${issue.title || "Unknown"}`,
    `- Severity: ${toTitleCase(issue.severity)}`,
    `- Detectable in: ${languages}`,
    issue.principle ? `- Principle: ${issue.principle}` : null,
    "",
    `### Why is this an issue`,
    issue.why || "No explanation provided.",
    "",
    `### Suggestion`,
    issue.suggestion || "No suggestion provided.",
    "",
    "### Example Code",
    `\`\`\`${fence}`,
    issue.code || "No code example provided.",
    "\`\`\`",
    "",
    "### Example Fix",
    `\`\`\`${fence}`,
    issue.fix || "No fix example provided.",
    "\`\`\`",
  ].filter(Boolean);

  return lessonLines.join("\n");
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

function findIssue(issues, query) {
  const index = Number.parseInt(query, 10);
  if (Number.isInteger(index) && index >= 1 && index <= issues.length) {
    return issues[index - 1];
  }

  const normalized = String(query || "")
    .trim()
    .toLowerCase();
  return issues.find((issue) => issue.title.toLowerCase() === normalized);
}

export default async function issues(initial_query = null) {
  try {
    const issuesCatalog = detectableIssues.issues || [];
    const query = initial_query || process.argv.slice(3).join(" ").trim();

    if (!query) {
      console.log("\n");
      console.log(
        boxen(formatIssueList(issuesCatalog), {
          width: CONSOLE_MAX_WIDTH,
          padding: { top: 1, right: 2, bottom: 1, left: 2 },
          borderStyle: "double",
          title: "ArcHone Issues",
          titleAlignment: "center",
        }),
      );
      console.log("\n");
      return;
    }

    const selectedIssue = findIssue(issuesCatalog, query);
    if (!selectedIssue) {
      console.log("\n");
      console.log(
        boxen(
          `${chalk.yellow("Archie:")} I could not find that issue lesson.\n\nTry ${chalk.cyan("archone issues")} to list available lessons.`,
          {
            width: CONSOLE_MAX_WIDTH,
            padding: 1,
            borderStyle: "round",
            title: "Issue Not Found",
          },
        ),
      );
      console.log("\n");
      return;
    }

    const markdownLesson = formatIssueLessonMarkdown(selectedIssue);
    const renderedLesson = renderWithTerminalMarkdown(markdownLesson);

    console.log("\n");
    console.log(
      boxen(`ArcHone Issue Lesson: ${selectedIssue.title}`, {
        width: CONSOLE_MAX_WIDTH,
        padding: { top: 0, right: 2, bottom: 0, left: 2 },
        borderStyle: "double",
        title: "ArcHone Issues",
        titleAlignment: "center",
      }),
    );
    console.log("\n");
    console.log(renderedLesson);
    console.log("\n");
  } catch (error) {
    console.log("\n");
    console.log(
      boxen(chalk.red(`Failed to load issue lessons: ${error.message}`), {
        width: CONSOLE_MAX_WIDTH,
        padding: 1,
        borderStyle: "round",
        title: "ArcHone Issues Error",
      }),
    );
    console.log("\n");
  }
}
