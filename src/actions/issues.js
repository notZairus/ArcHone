import chalk from "chalk";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { putHeader } from "../ui/components.js";
import { refreshScreen, backToMenu } from "../utils/helpers.js";
import blessed from "blessed";

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
      principle: "KISS (Keep It Simple, Stupid)",
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
      principle: "KISS (Keep It Simple, Stupid)",
      why: "Unclear names force students to guess what values represent, slowing down learning and debugging.",
      suggestion: "Use names that describe the purpose of the data.",
      code: "function buildReceipt(cartItems) {\n  const x = cartItems.length;\n  const y = cartItems.reduce((a, b) => a + b.price, 0);\n\n  return { x, y };\n}",
      fix: "function buildReceipt(cartItems) {\n  const itemCount = cartItems.length;\n  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);\n\n  return { itemCount, totalPrice };\n}",
    },
    {
      title: "Naming Convention",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "KISS (Keep It Simple, Stupid)",
      why: "Inconsistent naming makes code harder to scan because students cannot predict identifier styles.",
      suggestion:
        "Follow the language naming style consistently (camelCase, snake_case, or PascalCase based on language rules).",
      code: "//Javascript code\n\nfunction get_user_name(user_list) {\n  const UserName = user_list[0].name;\n  return UserName;\n}",
      fix: "//Javascript code\n\nfunction getUserName(userList) {\n  const userName = userList[0].name;\n  return userName;\n}",
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
      title: "Duplicate Code Blocks",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "DRY (Don't Repeat Yourself)",
      why: "Duplicated logic is harder to maintain because every fix has to be repeated in multiple places.",
      suggestion:
        "Extract repeated logic into one helper function and reuse it instead of copying the same block.",
      code: "function calculateTax(amount) {\n  const base = amount * 0.12;\n  const total = base + 5;\n  return total;\n}\n\nfunction calculateServiceTax(amount) {\n  const base = amount * 0.12;\n  const total = base + 5;\n  return total;\n}",
      fix: "function computeTaxWithFee(amount) {\n  const base = amount * 0.12;\n  const total = base + 5;\n  return total;\n}\n\nfunction calculateTax(amount) {\n  return computeTaxWithFee(amount);\n}\n\nfunction calculateServiceTax(amount) {\n  return computeTaxWithFee(amount);\n}",
    },
    {
      title: "Function Too Long",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "Single Responsibility Principle",
      why: "Long functions mix too many tasks, which makes them difficult for students to understand and test.",
      suggestion:
        "Break long functions into small helpers with one clear responsibility.",
      code: "// multiple logic code in a single function\n\nfunction processOrder(order) {\n  // logic for validation\n  // logic for pricing\n  // logic for  discount\n  // logic for tax\n  // logic for inventory\n  // logic for invoice\n  // logic for notification\n  // logic for audit log\n  // logic for analytics\n  // ... many more lines\n}",
      fix: "// each logic has their own function\n\nfunction processOrder(order) {\n  validateOrder(order);\n  const priceSummary = calculatePrice(order);\n  saveInvoice(order, priceSummary);\n  notifyCustomer(order);\n}",
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
      principle: "Separation of Concerns",
      why: "Highly complex branching logic is harder to reason about and easier to break.",
      suggestion:
        "Split logic into focused helper functions and reduce nested decision points.",
      code: `function getAccessLevel(user) {
  if (user) {
    if (user.isActive) {
      if (user.role === "admin") {
        if (user.permissions.includes("ALL")) {
          return "FULL_ACCESS";
        } else {
          return "LIMITED_ADMIN";
        }
      } else if (user.role === "teacher") {
        if (user.years > 5) {
          return "SENIOR_TEACHER";
        } else {
          return "JUNIOR_TEACHER";
        }
      } else if (user.role === "student") {
        if (user.grade >= 90) {
          return "HONOR_STUDENT";
        } else {
          return "REGULAR_STUDENT";
        }
      }
    } else {
      return "INACTIVE";
    }
  }
  return "GUEST";
}`,
      fix: `function getAccessLevel(user) {
  if (!user) {
    return "GUEST";
  }

  if (!user.isActive) {
    return "INACTIVE";
  }

  if (user.role === "admin") {
    return getAdminAccess(user);
  }

  if (user.role === "teacher") {
    return getTeacherAccess(user);
  }

  if (user.role === "student") {
    return getStudentAccess(user);
  }

  return "GUEST";
}

function getAdminAccess(user) {
  if (user.permissions.includes("ALL")) {
    return "FULL_ACCESS";
  }

  return "LIMITED_ADMIN";
}

function getTeacherAccess(user) {
  if (user.years > 5) {
    return "SENIOR_TEACHER";
  }

  return "JUNIOR_TEACHER";
}

function getStudentAccess(user) {
  if (user.grade >= 90) {
    return "HONOR_STUDENT";
  }

  return "REGULAR_STUDENT";
}`,
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
      principle: "Avoid Premature Optimization",
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

    // OOP mode lessons
    {
      title: "No Constructor",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "KISS (Keep It Simple, Stupid)",
      why: "When a class has instance members but no constructor/initializer, its state often gets initialized inconsistently across methods.",
      suggestion:
        "Add a constructor (`constructor` / `__init__`) to initialize required fields, or make the class a utility class with only static methods.",
      code: "class UserService {\n  users = [];\n\n  addUser(user) {\n    this.users.push(user);\n  }\n}\n",
      fix: "class UserService {\n  constructor() {\n    this.users = [];\n  }\n\n  addUser(user) {\n    this.users.push(user);\n  }\n}\n",
    },
    {
      title: "Too Many Dependencies",
      severity: "warning",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "Separation of Concerns",
      why: "A class with many dependencies is tightly coupled, harder to test, and harder to change without causing side effects.",
      suggestion:
        "Extract responsibilities into smaller classes/modules and inject collaborators rather than creating/using too many different services in one class.",
      code: "class OrderService {\n  checkout(order) {\n    new PaymentGateway().charge(order);\n    new EmailSender().send(order);\n    new SmsSender().send(order);\n    new Analytics().track(order);\n    new AuditLogger().log(order);\n  }\n}\n",
      fix: "class OrderService {\n  constructor({ paymentGateway, notifications, analytics, auditLogger }) {\n    this.paymentGateway = paymentGateway;\n    this.notifications = notifications;\n    this.analytics = analytics;\n    this.auditLogger = auditLogger;\n  }\n\n  checkout(order) {\n    this.paymentGateway.charge(order);\n    this.notifications.send(order);\n    this.analytics.track(order);\n    this.auditLogger.log(order);\n  }\n}\n",
    },
    {
      title: "Method Too Long",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "Single Responsibility Principle",
      why: "Long methods are harder to read and usually do more than one job.",
      suggestion: "Split the method into smaller helpers with clear names.",
      code: "class Report {\n  build(data) {\n    // validate\n    // transform\n    // sort\n    // format\n    // save\n    // email\n    // ... many more lines\n  }\n}\n",
      fix: "class Report {\n  build(data) {\n    this.validate(data);\n    const normalized = this.normalize(data);\n    const report = this.format(normalized);\n    this.save(report);\n    this.notify(report);\n  }\n}\n",
    },
    {
      title: "Large Class / God Class",
      severity: "warning",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "Single Responsibility Principle",
      why: "God classes do too much and become difficult to test, debug, and refactor.",
      suggestion:
        "Split the class into smaller classes by responsibility (e.g., parsing, validation, persistence, UI).",
      code: "class MegaManager {\n  parse() {}\n  validate() {}\n  saveToDb() {}\n  sendEmail() {}\n  renderUi() {}\n  // ... dozens more methods\n}\n",
      fix: "class Parser {}\nclass Validator {}\nclass Repository {}\nclass Notifier {}\nclass UiRenderer {}\n",
    },
    {
      title: "Hardcoded Values",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "KISS (Keep It Simple, Stupid)",
      why: "Hardcoded values hide meaning. When something change, it’s easy to miss where the value is used.",
      suggestion:
        "Replace or store magic numbers/strings on a variable or constants.",
      code: "class RetryPolicy {\n  shouldRetry(attempt) {\n    return attempt < 7 && 1500 > 0;\n  }\n}\n",
      fix: "const MAX_RETRIES = 7;\nconst DEFAULT_DELAY_MS = 1500;\n\nclass RetryPolicy {\n  shouldRetry(attempt) {\n    return attempt < MAX_RETRIES && DEFAULT_DELAY_MS > 0;\n  }\n}\n",
    },
    {
      title: "Too Many Public Methods",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "Separation of Concerns",
      why: "A large public API surface makes the class harder to use and harder to change safely.",
      suggestion:
        "Make helper methods private (or internal) and keep the public API minimal.",
      code: "class UserManager {\n  createUser() {}\n  validateEmail() {}\n  hashPassword() {}\n  normalizeName() {}\n  saveUser() {}\n  // ... all public\n}\n",
      fix: "class UserManager {\n  createUser() {\n    this.#validateEmail();\n    this.#hashPassword();\n    this.#saveUser();\n  }\n\n  #validateEmail() {}\n  #hashPassword() {}\n  #saveUser() {}\n}\n",
    },
    {
      title: "Duplicate Methods",
      severity: "improvement",
      detectableIn: ["javascript", "python", "csharp"],
      principle: "DRY (Don't Repeat Yourself)",
      why: "Duplicate method implementations increase bugs because fixes must be applied in multiple places.",
      suggestion: "Extract shared logic into one helper method and reuse it.",
      code: "class Tax {\n  calcA(amount) {\n    const base = amount * 0.12;\n    return base + 5;\n  }\n\n  calcB(amount) {\n    const base = amount * 0.12;\n    return base + 5;\n  }\n}\n",
      fix: "class Tax {\n  #calc(amount) {\n    const base = amount * 0.12;\n    return base + 5;\n  }\n\n  calcA(amount) {\n    return this.#calc(amount);\n  }\n\n  calcB(amount) {\n    return this.#calc(amount);\n  }\n}\n",
    },
  ],
  titles: [
    "Unused Variable",
    "Unused Function",
    "Use of var",
    "Poor Variable Naming",
    "Naming Convention",
    "Name Reuse",
    "Duplicate Code Blocks",
    "Function Too Long",
    "Too Many Parameters",
    "High Complexity",
    "Deep Nesting",
    "TODO Comment",
    "Commented-out Code",
    "No Constructor",
    "Too Many Dependencies",
    "Method Too Long",
    "Large Class / God Class",
    "Hardcoded Values",
    "Too Many Public Methods",
    "Duplicate Methods",
  ],
};

function toTitleCase(value = "") {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function formatIssueList(issues) {
  const lines = [
    "Here are ArcHone's detectable issues.",
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

export default async function issues({
  screen,
  hasActionByDefault,
  issueTitle,
}) {
  refreshScreen(screen);

  const issuesCatalog = detectableIssues.issues || [];
  const query = issueTitle || process.argv.slice(3).join(" ").trim();

  const container = blessed.box({
    parent: screen,
    left: "center",
    top: "center",
    width: "50%",
    height: "75%",
  });

  putHeader(container, "ArchOne - CLI Code Analyzer", () => {
    backToMenu(hasActionByDefault);
    return;
  });

  const issueDetails = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "50%",
    height: "75%",
    border: "line",
    padding: {
      left: 2,
      right: 2,
      top: 1,
      bottom: 1,
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "grey",
      },
      style: {
        inverse: true,
      },
    },
    mouse: true,
    padding: {
      left: 1,
      right: 1,
    },
    content: query
      ? `Selected Issue: ${query}`
      : "No issue selected. Use the list below to select an issue.",
  });

  const backBtn = blessed.box({
    parent: issueDetails,
    top: 0,
    right: 2,
    border: "line",
    width: 7,
    height: 3,
    mouse: true,
    content: "Back",
  });

  backBtn.on("click", () => {
    showIssueContainer();
  });

  const issueContainer = blessed.box({
    parent: container,
    top: 3,
    left: 0,
    width: "100%",
    height: "100%-3",
    border: "line",
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "grey",
      },
      style: {
        inverse: true,
      },
    },
  });

  function showIssueContainer() {
    issueDetails.hide();
    container.show();
    screen.render();
  }

  function showIssueDetails(issueIndex) {
    const selectedIssue = issuesCatalog[issueIndex];

    const markdownLesson = formatIssueLessonMarkdown(selectedIssue);
    const renderedLesson = renderWithTerminalMarkdown(markdownLesson);

    issueDetails.setContent(
      `Selected Issue: ${selectedIssue.title}\n\n${renderedLesson}`,
    );

    issueDetails.show();
    container.hide();
    screen.render();
  }

  for (const [index, issue] of issuesCatalog.entries()) {
    const issueBox = blessed.box({
      parent: issueContainer,
      top: index * 3,
      left: 1,
      width: "100%-5",
      height: 3,
      border: "line",
      mouse: true,
      padding: {
        left: 1,
        right: 1,
      },
      content: `${index + 1}. ${issue.title}`,
    });

    issueBox.on("click", () => {
      showIssueDetails(index);
    });
  }

  showIssueContainer();
}
