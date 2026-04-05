const ISSUE_PRINCIPLE_BY_TITLE = {
  "Unused Variable": "YAGNI (You Aren't Gonna Need It)",
  "Unused Function": "YAGNI (You Aren't Gonna Need It)",
  "Use of var": "POLA (Principle of Least Astonishment)",
  "Poor Variable Naming": "Clean Code (Meaningful Names)",
  "Naming Convention": "Clean Code (Consistent Naming)",
  "Name Reuse": "DRY (Don't Repeat Yourself)",
  "Function Too Long": "SRP (Single Responsibility Principle)",
  "Too Many Parameters": "KISS (Keep It Simple, Stupid)",
  "High Complexity": "KISS (Keep It Simple, Stupid)",
  "Deep Nesting": "KISS (Keep It Simple, Stupid)",
  "TODO Comment": "None (TODOs should be resolved, not ignored)",
  "Commented-out Code": "YAGNI (You Aren't Gonna Need It)",
};

const DEFAULT_PRINCIPLE = "Clean Code";

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
