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
    triggers: ["analyze"],
    description:
      "Run ArcHone analysis on a specific source file and return insights about code quality, structure, and issues.",
    function: analyze,
  },
  {
    triggers: ["init"],
    description:
      "Set up ArcHone in the current project by creating the required local configuration and startup files.",
    function: initialize,
  },
  {
    triggers: ["login"],
    description:
      "Authenticate with your ArcHone account so this CLI can access your saved profile and cloud features.",
    function: login,
  },
  {
    triggers: ["logout"],
    description:
      "Sign out on this machine by clearing your local ArcHone session file.",
    function: logout,
  },
  {
    triggers: ["register"],
    description:
      "Create a new ArcHone account and connect it to this CLI so you can start analyzing files right away.",
    function: register,
  },
  {
    triggers: ["archive"],
    description: "View past code analysis results.",
    function: archive,
  },
  {
    triggers: ["about"],
    description:
      "Show an overview of ArcHone, including what the tool does and how it helps with code analysis.",
    function: about,
  },
  {
    triggers: ["stats"],
    description:
      "Display your personal analysis metrics, such as scan activity and usage patterns from previous runs.",
    function: stats,
  },
  {
    triggers: ["who"],
    description: "Show the authenticated ArcHone user.\n",
    function: whoami,
  },
  {
    triggers: ["issues"],
    description:
      "Show student-friendly lessons for each detectable issue, including why it matters and how to fix it.",
    function: issues,
  },
  {
    triggers: ["help"],
    description:
      "Open Archone assistant mode to see command explanations, practical hints, and quick-start guidance.",
    function: help,
  },
  {
    triggers: ["scan"],
    description:
      "Analyze all supported source files in a directory and show an aggregated issue summary.",
    function: scan,
  },
  {
    triggers: ["classrooms"],
    description: "View classrooms you are a member of.",
    function: classrooms,
  },
];

export default commands;
