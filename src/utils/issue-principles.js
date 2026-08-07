// YAGNI
// KISS
// DRY
// Single Responsibility Principle
// Separation of Concerns

const ISSUE_PRINCIPLE_BY_TITLE = {
  "Unused Variable": "YAGNI (You Aren't Gonna Need It)",
  "Unused Function": "YAGNI (You Aren't Gonna Need It)",
  "Use of var": "KISS (Keep It Simple, Stupid)",
  "Poor Variable Naming": "KISS (Keep It Simple, Stupid)",
  "Naming Convention": "KISS (Keep It Simple, Stupid)",
  "Name Reuse": "DRY (Don't Repeat Yourself)",
  "Function Too Long": "Single Responsibility Principle",
  "Too Many Parameters": "KISS (Keep It Simple, Stupid)",
  "High Complexity": "Separation of Concerns",
  "Duplicate Code Blocks": "DRY (Don't Repeat Yourself)",
  "Deep Nesting": "KISS (Keep It Simple, Stupid)",
  "TODO Comment": "N/A",
  "Commented-out Code": "YAGNI (You Aren't Gonna Need It)",
  "Mixed Language Syntax": "KISS (Keep It Simple, Stupid)",

  // OOP mode
  "No Constructor": "KISS (Keep It Simple, Stupid)",
  "Too Many Dependencies": "Separation of Concerns",
  "Method Too Long": "Single Responsibility Principle",
  "Large Class / God Class": "Single Responsibility Principle",
  "Hardcoded Values": "KISS (Keep It Simple, Stupid)",
  "Too Many Public Methods": "Separation of Concerns",
  "Duplicate Methods": "DRY (Don't Repeat Yourself)",
};

const DEFAULT_PRINCIPLE = "N/A";

export const getViolatedPrinciple = (issue = {}) => {
  if (issue.principle && typeof issue.principle === "string") {
    return issue.principle;
  }

  if (issue.title && ISSUE_PRINCIPLE_BY_TITLE[issue.title]) {
    return ISSUE_PRINCIPLE_BY_TITLE[issue.title];
  }

  return DEFAULT_PRINCIPLE;
};

export const withIssuePrinciple = (issue = {}) => {
  return {
    ...issue,
    principle: getViolatedPrinciple(issue),
  };
};
