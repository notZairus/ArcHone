export default (fileName, result) => {
  const focusedIssues = result.issues.filter((issue) =>
    [
      "Deep Nesting",
      "Function Too Long",
      "Poor Variable Naming",
      "TODO Comment",
    ].includes(issue.title),
  );

  const prioritizedIssues = prioritizeIssues(focusedIssues);
  const displayedIssues = prioritizedIssues.slice(0, 3);
  const score = calculateOverallScore(focusedIssues);

  const lines = [
    `File: ${fileName}`,
    "",
    `Issues Found: ${displayedIssues.length}`,
    "",
    ...formatIssuesForBeginners(displayedIssues),
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

  const maxItems = 3;
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
  const basePenaltyByTitle = {
    "Deep Nesting": 1.5,
    "Function Too Long": 1.0,
    "Poor Variable Naming": 0.75,
    "TODO Comment": 0.5,
  };

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
