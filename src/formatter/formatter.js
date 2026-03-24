const POSSIBLE_ISSUES = [
  {
    title: "High Complexity",
    penalty: 2.0,
  },
  {
    title: "Deep Nesting",
    penalty: 1.5,
  },
  {
    title: "Function Too Long",
    penalty: 1.25,
  },
  {
    title: "Too Many Parameters",
    penalty: 1.0,
  },
  {
    title: "Name Reuse",
    penalty: 0.75,
  },
  {
    title: "Poor Variable Naming",
    penalty: 0.75,
  },
  {
    title: "Naming Convention",
    penalty: 0.75,
  },
  {
    title: "Commented-out Code",
    penalty: 0.5,
  },
  {
    title: "TODO Comment",
    penalty: 0.2,
  },
  {
    title: "Use of var",
    penalty: 0.25,
  },
];

export default (fileName, result) => {
  const prioritizedIssues = prioritizeIssues(result.issues || []);

  const score = calculateOverallScore(prioritizedIssues);

  const lines = [
    `Analysis of the file ${fileName}`,
    "",
    `Issues Found: ${prioritizedIssues.length}`,
    "",
    ...formatIssuesForBeginners(prioritizedIssues),
    "",
    `Overall Score: ${score}/10`,
  ];

  return lines.join("\n");
};

const prioritizeIssues = (issues) => {
  const severityRank = {
    warning: 1,
    improvement: 2,
    info: 3,
  };

  return [...issues].sort((a, b) => {
    const bySeverity = severityRank[a.type] - severityRank[b.type];
    if (bySeverity !== 0) {
      return bySeverity;
    }

    return a.line - b.line;
  });
};

const formatIssuesForBeginners = (issues) => {
  if (!issues.length) {
    return ["No major issues found. Nice work."];
  }

  const maxItems = issues.length;
  const output = issues.slice(0, maxItems).map((issue, index) => {
    const block = [`${index + 1}. ${issue.title || "Issue"}`];

    if (issue.functionName) {
      block.push(`   Function: ${issue.functionName}()`);
    }

    if (issue.functionLines) {
      block.push(`   Lines: ${issue.functionLines}`);
    }

    if (issue.title === "TODO Comment") {
      block.push(`   Line: ${issue.line}`);
    } else {
      block.push(`   Location: line ${issue.line}`);
    }

    block.push(`   Advice: ${issue.suggestion}\n`);

    return block.join("\n");
  });

  if (issues.length > maxItems) {
    output.push(
      `${maxItems + 1}. More Issues\n   Advice: ...and ${issues.length - maxItems} more findings.`,
    );
  }

  return output;
};

const calculateOverallScore = (issues) => {
  if (!issues.length) {
    return 10;
  }

  // Weighted penalties by issue type with diminishing returns per category.
  const basePenaltyByTitle = {};

  POSSIBLE_ISSUES.forEach((issue) => {
    basePenaltyByTitle[issue.title] = issue.penalty;
  });

  const countsByTitle = new Map();
  for (const issue of issues) {
    const title = issue.title || "Other";
    countsByTitle.set(title, (countsByTitle.get(title) || 0) + 1);
  }

  let totalPenalty = 0;
  for (const [title, count] of countsByTitle.entries()) {
    const base = basePenaltyByTitle[title] || 1;
    totalPenalty += base * (1 + Math.log2(count));
  }

  const score = Math.max(1, 10 - totalPenalty);
  return Math.floor(score);
};
