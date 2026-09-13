import initialize from "./initialize.js";
import help from "./help.js";
import register from "./register.js";
import login from "./login.js";
import logout from "./logout.js";
import about from "./about.js";
import analyze from "./analyze.js";
import stats from "./stats.js";
import scan from "./scan.js";
import whoami from "./whoami.js";
import issues from "./issues.js";
import classrooms from "./classrooms.js";
import archive from "./archive.js";

const commands = [
  {
    triggers: ["init"],
    category: "Getting Started",
    description:
      "Set up ArcHone on this machine by creating its local configuration, saved results file, and optional AI settings.",
    function: initialize,
  },
  {
    triggers: ["register"],
    category: "Account & Access",
    description:
      "Create an ArcHone account and sign in to save analyses, view statistics, and join classrooms.",
    function: register,
  },
  {
    triggers: ["login"],
    category: "Account & Access",
    description:
      "Sign in to connect this CLI to your ArcHone account and unlock cloud features such as saved analyses and classrooms.",
    function: login,
  },
  {
    triggers: ["who"],
    category: "Account & Access",
    description:
      "Show the ArcHone account currently signed in on this machine.",
    function: whoami,
  },
  {
    triggers: ["scan"],
    category: "Code Analysis",
    description:
      "Scan a folder for supported source files and summarize issues across them. Add a folder path and optionally --mode general or oop.",
    function: scan,
  },
  {
    triggers: ["analyze"],
    category: "Code Analysis",
    description:
      "Analyze one JavaScript, Python, or C# file for issues and complexity. Provide a file path and optional --mode general, oop, or complexity.",
    function: analyze,
  },
  {
    triggers: ["archive"],
    category: "Results & Learning",
    description:
      "Browse your saved analyses, grouped by file, and reopen earlier code-quality and complexity results.",
    function: archive,
  },
  {
    triggers: ["stats"],
    category: "Results & Learning",
    description:
      "Review analysis metrics, including issue totals and the languages, files, functions, and variables found.",
    function: stats,
  },
  {
    triggers: ["issues"],
    category: "Results & Learning",
    description:
      "Browse the issue catalog for examples, explanations, and student-friendly suggestions for fixing each problem.",
    function: issues,
  },
  {
    triggers: ["classrooms"],
    category: "Account & Access",
    description:
      "View your classrooms or join one with a classroom code. Requires an ArcHone login.",
    function: classrooms,
  },
  {
    triggers: ["about"],
    category: "Getting Started",
    description:
      "Learn what ArcHone analyzes, which languages it supports, and how its feedback helps improve your code.",
    function: about,
  },
  {
    triggers: ["logout"],
    category: "Account & Access",
    description:
      "Sign out of ArcHone on this machine by removing the saved local session. Your account and cloud data stay unchanged.",
    function: logout,
  },
];

export default commands;
