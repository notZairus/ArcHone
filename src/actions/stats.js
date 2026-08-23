import boxen from "boxen";
import Database from "../lib/db.js";
import { boxError, boxSuccess } from "../ui/box.js";
import { CONSOLE_MAX_WIDTH } from "../constants.js";
import chalk from "chalk";
import { getSession } from "../utils/session.js";
import { box } from "../ui/box.js";
import { refreshScreen, showNotification } from "../utils/helpers.js";
import blessed from "blessed";

export default async function stats({ screen }) {
  refreshScreen(screen);
  console.clear();

  const { userId } = await getSession();
  if (!userId) {
    await showNotification({
      screen,
      message:
        "You need to be logged in to view your stats. Please run 'archone login' first.",
    });

    process.exit(0);
  }

  const analyses = await Database.getUserAnalyses(userId);

  if (!analyses || analyses.length === 0) {
    boxError("No analyses found yet. Run 'archone analyze <file>' first.");
    await showNotification({
      screen,
      message: "No analyses found yet. Run 'archone analyze <file>' first.",
    });

    process.exit(0);
  }

  const analytics = buildAnalytics(analyses);

  const container = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "60%",
    height: "75%",
    mouse: true,
    vi: true,
    keys: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      style: {
        inverse: true,
      },
    },
    padding: {
      top: 1,
      bottom: 1,
      left: 2,
      right: 1,
    },
    border: {
      type: "line",
    },
    content: formatAnalytics(analytics),
  });

  const closeBtn = blessed.button({
    parent: container,
    top: 0,
    right: 5,
    shrink: true,
    mouse: true,
    content: "X",
  });

  closeBtn.on("press", () => {
    process.exit(0);
  });

  screen.render();
}

function buildAnalytics(analyses) {
  const issueTypeCounts = {};
  const issueTitleCounts = {};
  const fileTypeCounts = {};
  const variableTypeCounts = {};
  const jsVariableKindCounts = {};
  const filesSummary = [];
  const functionRecords = [];
  const datedAnalyses = [];

  let totalIssues = 0;
  let totalFunctions = 0;
  let totalVariables = 0;
  let totalComments = 0;
  let estimatedTotalLines = 0;

  for (const analysis of analyses) {
    const issues = analysis.issues || [];
    const functions = analysis.functions || [];
    const variables = analysis.variables || [];
    const comments = analysis.comments || [];
    const estimatedLines = estimateFileLines(analysis);

    totalIssues += issues.length;
    totalFunctions += functions.length;
    totalVariables += variables.length;
    totalComments += comments.length;
    estimatedTotalLines += estimatedLines;

    fileTypeCounts[analysis.fileType] =
      (fileTypeCounts[analysis.fileType] || 0) + 1;

    for (const issue of issues) {
      issueTypeCounts[issue.type] = (issueTypeCounts[issue.type] || 0) + 1;
      issueTitleCounts[issue.title] = (issueTitleCounts[issue.title] || 0) + 1;
    }

    for (const variable of variables) {
      const dataType = variable.dataType || "unknown";
      variableTypeCounts[dataType] = (variableTypeCounts[dataType] || 0) + 1;

      if (analysis.fileType === "js") {
        const kind = variable.kind || "unknown";
        jsVariableKindCounts[kind] = (jsVariableKindCounts[kind] || 0) + 1;
      }
    }

    for (const fn of functions) {
      functionRecords.push({
        ...fn,
        fileName: analysis.fileName,
      });
    }

    filesSummary.push({
      fileName: analysis.fileName,
      fileType: analysis.fileType,
      issues: issues.length,
      warnings: issues.filter((i) => i.type === "warning").length,
      improvements: issues.filter((i) => i.type === "improvement").length,
      functions: functions.length,
      variables: variables.length,
      comments: comments.length,
      estimatedLines,
      createdAt: analysis.createdAt,
    });

    datedAnalyses.push({
      createdAt: analysis.createdAt,
      issuesCount: issues.length,
      estimatedLines,
      avgNesting: average(functions.map((fn) => fn.maxNesting || 0)),
    });
  }

  const analysesByType = toSortedCountEntries(fileTypeCounts);
  const issueTypes = toSortedCountEntries(issueTypeCounts);
  const variableTypes = toSortedCountEntries(variableTypeCounts);
  const jsVariableKinds = toSortedCountEntries(jsVariableKindCounts);
  const topIssueTitles = toSortedIssuePercentages(
    issueTitleCounts,
    totalIssues,
    3,
  );
  const filesByIssues = [...filesSummary]
    .sort((a, b) => b.issues - a.issues || b.warnings - a.warnings)
    .slice(0, 5);

  const mostComplexFunction = maxBy(functionRecords, "complexity");
  const deepestNestedFunction = maxBy(functionRecords, "maxNesting");
  const longestFunction = maxBy(functionRecords, "lines");

  const avgComplexity = average(
    functionRecords.map((fn) => fn.complexity || 0),
  );
  const maxComplexity = mostComplexFunction
    ? mostComplexFunction.complexity || 0
    : 0;
  const avgNesting = average(functionRecords.map((fn) => fn.maxNesting || 0));

  const warnings = issueTypeCounts.warning || 0;
  const improvements = issueTypeCounts.improvement || 0;
  const infos = issueTypeCounts.info || 0;
  const issueDensity = totalIssues / Math.max(1, estimatedTotalLines);

  const modernJsUsage = computeModernJsUsage(jsVariableKinds);
  const styleConsistency = computeStyleConsistency(
    issueTitleCounts,
    totalIssues,
  );
  const qualityScore = computeQualityScore({
    issueDensity,
    avgComplexity,
    avgNesting,
  });

  const trend = computeTrend(datedAnalyses);
  const insights = buildInsights({
    trend,
    modernJsUsage,
    datedAnalyses,
    jsVariableKinds,
  });

  const recommendations = buildRecommendations({
    topIssueTitles,
  });

  const skillLevel = getSkillLevel(qualityScore, trend.direction);

  return {
    totalAnalyses: analyses.length,
    totalIssues,
    warnings,
    improvements,
    infos,
    totalFunctions,
    totalVariables,
    totalComments,
    estimatedTotalLines,
    issueDensity,
    avgComplexity,
    maxComplexity,
    avgNesting,
    styleConsistency,
    modernJsUsage,
    qualityScore,
    trend,
    insights,
    recommendations,
    skillLevel,
    analysesByType,
    issueTypes,
    topIssueTitles,
    variableTypes,
    jsVariableKinds,
    filesByIssues,
    mostComplexFunction,
    deepestNestedFunction,
    longestFunction,
  };
}

function formatAnalytics(analytics) {
  const { name } = getSession() || {};
  const topIssue = analytics.topIssueTitles[0];

  const lines = [
    chalk.bold(
      `Archone Developer Stats:     ${name ? chalk.cyan(name) : chalk.yellow("Unknown User")}`,
    ),
    "",
    boxen(chalk.bold("User Summary"), {
      padding: 0,
      margin: 0,
      borderStyle: "singleDouble",
      width: CONSOLE_MAX_WIDTH - 20,
    }),
    chalk.dim(
      `This section gives a quick snapshot of your overall progress and code activity.`,
    ),
    `Code Quality Score : ${analytics.qualityScore} / 100`,
    `Trend              : ${formatTrend(analytics.trend)}`,
    `Files Analyzed     : ${analytics.totalAnalyses}`,
    `Total Lines        : ${formatNumber(analytics.estimatedTotalLines)}`,
    "",
    boxen(chalk.bold("Issues Overview"), {
      padding: 0,
      margin: 0,
      borderStyle: "singleDouble",
      width: CONSOLE_MAX_WIDTH - 20,
    }),
    chalk.dim(
      "This section shows how many problems were found and how serious they are.",
    ),
    `Total Issues       : ${analytics.totalIssues}`,
    `Warnings           : ${analytics.warnings}`,
    `Improvements       : ${analytics.improvements}`,
    `Info               : ${analytics.infos}`,
    "",
    chalk.bold("Top Issues:"),
    chalk.dim(
      topIssue
        ? `These are your most frequent issue types. Right now, \"${topIssue.title}\" appears the most.`
        : "These are your most frequent issue types based on your analyzed files.",
    ),
    ...formatTopIssues(analytics.topIssueTitles),
  ];

  lines.push(
    "",
    boxen(chalk.bold("Progress Insights"), {
      padding: 0,
      margin: 0,
      borderStyle: "singleDouble",
      width: CONSOLE_MAX_WIDTH - 20,
    }),
    chalk.dim(
      "This section highlights recent patterns so you can see if you are improving week by week.",
    ),
    ...analytics.insights,
    "",
    boxen(chalk.bold("Recommendations"), {
      padding: 0,
      margin: 0,
      borderStyle: "singleDouble",
      width: CONSOLE_MAX_WIDTH - 20,
    }),
    chalk.dim(
      "Start with these small next steps to improve your code quality faster.",
    ),
    ...analytics.recommendations,
  );

  return lines.join("\n");
}

function estimateFileLines(analysis) {
  const comments = analysis.comments || [];
  const issues = analysis.issues || [];
  const variables = analysis.variables || [];
  const functions = analysis.functions || [];

  let maxLine = 0;

  for (const comment of comments) {
    maxLine = Math.max(maxLine, comment.line || 0);
  }

  for (const issue of issues) {
    maxLine = Math.max(maxLine, issue.line || 0);
  }

  for (const variable of variables) {
    maxLine = Math.max(maxLine, variable.line || 0);
  }

  for (const fn of functions) {
    const fnStart = fn.line || 0;
    const fnLength = fn.lines || 0;
    const fnEnd = fnLength > 0 ? fnStart + fnLength - 1 : fnStart;
    maxLine = Math.max(maxLine, fnEnd);
  }

  return maxLine;
}

function toSortedIssuePercentages(countsMap, totalCount, limit = Infinity) {
  return Object.entries(countsMap)
    .map(([title, count]) => ({
      title,
      count,
      percent: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function formatTopIssues(topIssues) {
  if (!topIssues.length) {
    return ["1. None (0%)"];
  }

  return topIssues.map(
    (item, index) => `${index + 1}. ${item.title} (${item.percent}%)`,
  );
}

function computeModernJsUsage(jsVariableKinds) {
  const counts = Object.fromEntries(jsVariableKinds);
  const varCount = counts.var || 0;
  const letCount = counts.let || 0;
  const constCount = counts.const || 0;
  const total = varCount + letCount + constCount;

  if (total === 0) {
    return 0;
  }

  return Math.round(((letCount + constCount) / total) * 100);
}

function computeStyleConsistency(issueTitleCounts, totalIssues) {
  const styleIssueTitles = [
    "Poor Variable Naming",
    "Naming Convention",
    "Commented-out Code",
    "TODO Comment",
    "Use of var",
  ];

  const styleIssues = styleIssueTitles.reduce(
    (sum, title) => sum + (issueTitleCounts[title] || 0),
    0,
  );

  if (totalIssues === 0) {
    return 100;
  }

  return clamp(Math.round(100 - (styleIssues / totalIssues) * 100), 0, 100);
}

function computeQualityScore({ issueDensity, avgComplexity, avgNesting }) {
  const densityPenalty = Math.min(60, issueDensity * 350);
  const complexityPenalty = Math.max(0, avgComplexity - 5) * 6;
  const nestingPenalty = Math.max(0, avgNesting - 3) * 8;

  return clamp(
    Math.round(100 - densityPenalty - complexityPenalty - nestingPenalty),
    1,
    100,
  );
}

function computeTrend(datedAnalyses) {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const recent = [];
  const previous = [];

  for (const analysis of datedAnalyses) {
    const createdAt = new Date(analysis.createdAt).getTime();
    if (Number.isNaN(createdAt)) {
      continue;
    }

    if (createdAt >= now - sevenDays) {
      recent.push(analysis);
      continue;
    }

    if (createdAt >= now - sevenDays * 2) {
      previous.push(analysis);
    }
  }

  const recentDensity = averageDensity(recent);
  const previousDensity = averageDensity(previous);

  if (!recent.length || !previous.length || previousDensity === 0) {
    return {
      direction: "stable",
      percent: 0,
      hasEnoughData: false,
      recent,
      previous,
    };
  }

  const improvementPercent = Math.round(
    ((previousDensity - recentDensity) / previousDensity) * 100,
  );

  if (improvementPercent > 0) {
    return {
      direction: "improving",
      percent: improvementPercent,
      hasEnoughData: true,
      recent,
      previous,
    };
  }

  if (improvementPercent < 0) {
    return {
      direction: "declining",
      percent: Math.abs(improvementPercent),
      hasEnoughData: true,
      recent,
      previous,
    };
  }

  return {
    direction: "stable",
    percent: 0,
    hasEnoughData: true,
    recent,
    previous,
  };
}

function averageDensity(group) {
  if (!group.length) {
    return 0;
  }

  const totalIssues = group.reduce((sum, item) => sum + item.issuesCount, 0);
  const totalLines = group.reduce((sum, item) => sum + item.estimatedLines, 0);

  return totalIssues / Math.max(1, totalLines);
}

function buildInsights({
  trend,
  modernJsUsage,
  datedAnalyses,
  jsVariableKinds,
}) {
  const insights = [];

  if (trend.hasEnoughData && trend.direction === "improving") {
    insights.push("+ Fewer issues in recent submissions");
  } else if (trend.hasEnoughData && trend.direction === "declining") {
    insights.push("- Issue density increased in recent submissions");
  } else {
    insights.push("= Need more weekly history to compute trend");
  }

  const recentNesting = average(
    trend.recent.map((item) => item.avgNesting || 0),
  );
  const previousNesting = average(
    trend.previous.map((item) => item.avgNesting || 0),
  );

  if (trend.hasEnoughData && recentNesting < previousNesting) {
    insights.push("+ Slight decrease in nesting depth");
  } else if (trend.hasEnoughData && recentNesting > previousNesting) {
    insights.push("- Nesting depth increased recently");
  } else {
    insights.push("= Nesting depth trend is stable");
  }

  const jsKinds = Object.fromEntries(jsVariableKinds);
  const jsTotal =
    (jsKinds.var || 0) + (jsKinds.let || 0) + (jsKinds.const || 0);

  if (jsTotal > 0 && modernJsUsage < 70) {
    insights.push("- Still using 'var' frequently");
  } else if (jsTotal > 0) {
    insights.push("+ Good modern JS declaration usage");
  } else if (datedAnalyses.some((item) => item.estimatedLines > 0)) {
    insights.push("= No JavaScript declaration data available yet");
  }

  return insights;
}

function buildRecommendations({ topIssueTitles }) {
  const recommendations = topIssueTitles.map((issue) => {
    const action = getRecommendationForIssueTitle(issue.title);
    return `- ${issue.title} (${issue.percent}%): ${action}`;
  });

  if (!recommendations.length) {
    return ["- Keep the current pace and maintain consistency"];
  }

  return recommendations;
}

function getRecommendationForIssueTitle(title) {
  const recommendationsByTitle = {
    "Poor Variable Naming": "Use clearer, intention-revealing variable names.",
    "Naming Convention":
      "Apply one naming style consistently across your code.",
    "Use of var": "Replace 'var' with 'const' or 'let'.",
    "Deep Nesting":
      "Refactor nested logic with early returns or helper functions.",
    "Commented-out Code":
      "Remove dead commented code to keep files clean and maintainable.",
    "TODO Comment":
      "Convert TODO comments into tracked tasks and resolve them regularly.",
  };

  return (
    recommendationsByTitle[title] ||
    "Review this issue pattern and apply the suggested fix consistently."
  );
}

function getSkillLevel(qualityScore, trendDirection) {
  if (qualityScore >= 85) {
    return trendDirection === "improving" ? "Advanced (Improving)" : "Advanced";
  }

  if (qualityScore >= 60) {
    return trendDirection === "improving"
      ? "Intermediate (Improving)"
      : "Intermediate";
  }

  return trendDirection === "improving" ? "Beginner (Improving)" : "Beginner";
}

function formatTrend(trend) {
  if (!trend.hasEnoughData) {
    return "Stable (not enough data this week)";
  }

  if (trend.direction === "improving") {
    return `Up Improving (+${trend.percent}% this week)`;
  }

  if (trend.direction === "declining") {
    return `Down Declining (-${trend.percent}% this week)`;
  }

  return "Stable (0% this week)";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toSortedCountEntries(countsMap, limit = Infinity) {
  return Object.entries(countsMap)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function formatCountEntries(entries) {
  if (!entries.length) {
    return ["- None"];
  }

  return entries.map(([name, count]) => `- ${name}: ${count}`);
}

function formatFileRows(files) {
  if (!files.length) {
    return ["- None"];
  }

  return files.map(
    (file, index) =>
      `${index + 1}. ${file.fileName} (.${file.fileType}) - issues: ${file.issues}, warnings: ${file.warnings}, functions: ${file.functions}, variables: ${file.variables}`,
  );
}

function formatFunctionMetric(label, fn, metric) {
  if (!fn) {
    return `- ${label}: None`;
  }

  return `- ${label}: ${fn.name}() in ${fn.fileName} (${metric}: ${fn[metric]})`;
}

function maxBy(items, key) {
  if (!items.length) {
    return null;
  }

  return items.reduce((best, current) => {
    if (!best || (current[key] || 0) > (best[key] || 0)) {
      return current;
    }

    return best;
  }, null);
}
