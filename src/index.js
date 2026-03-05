#!/usr/bin/env node

import { mainBanner } from "./ui/displays.js";
import { Ollama } from "ollama";

//ACTIONS
import initialize from "./actions/initialize.js";
import scan from "./actions/scan.js";

const tryAi = async () => {
  const ollama = new Ollama();

  const jsonSchema = {
    type: "object",
    required: ["meta", "summary", "issues", "recommendations", "bestPractices"],
    properties: {
      meta: {
        type: "object",
        required: ["projectName", "analysisVersion", "score"],
        properties: {
          projectName: { type: "string" },
          analysisVersion: { type: "string" },
          score: { type: "number", minimum: 0 },
        },
      },
      summary: {
        type: "object",
        required: ["overview", "health", "keyFindings"],
        properties: {
          overview: { type: "string" },
          health: { type: "string", enum: ["good", "moderate", "poor"] },
          keyFindings: { type: "array", items: { type: "string" } },
        },
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          required: [
            "id",
            "title",
            "severity",
            "category",
            "filePaths",
            "description",
            "impact",
            "suggestedFix",
          ],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            category: {
              type: "string",
              enum: [
                "structure",
                "naming",
                "documentation",
                "testing",
                "architecture",
              ],
            },
            filePaths: { type: "array", items: { type: "string" } },
            description: { type: "string" },
            impact: { type: "string" },
            suggestedFix: { type: "string" },
          },
        },
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          required: [
            "id",
            "priority",
            "title",
            "description",
            "expectedBenefit",
          ],
          properties: {
            id: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            title: { type: "string" },
            description: { type: "string" },
            expectedBenefit: { type: "string" },
          },
        },
      },
      bestPractices: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "status", "notes"],
          properties: {
            title: { type: "string" },
            status: {
              type: "string",
              enum: ["implemented", "missing", "partial"],
            },
            notes: { type: "string" },
          },
        },
      },
    },
  };

  const projectTree = `
bad-express-backend/
  index.js
  app.js
  user.js
  config.js
  utils.js
  database.js
  auth.js
  routes.js
  controllers.js
  services.js
  models.js
  middleware.js
  README.md
  package.json
  package-lock.json
  .env
  node_modules/
  tests/
    test1.js
    test2.js
`;

  const prompt = `
    You are a strict code architecture analyzer. Do NOT assume the project is good just because files exist.
    Analyze the following ExpressJS backend project structure and provide a detailed report. 
    Be critical and identify issues with folder structure, file organization, modularity, and maintainability.

    Provide the output as JSON with the following keys:
    - "projectName": name of the project
    - "analysisVersion": version of your analysis
    - "health": "good", "poor", or "average"
    - "summary": overview of the project
    - "issues": list of identified problems with severity (low, medium, high), file paths, and suggested fixes
    - "recommendations": practical suggestions to improve architecture and maintainability
    - "bestPractices": which best practices are missing or partially implemented

    Project structure:
    ${projectTree}
  `;

  const response = await ollama.chat({
    model: "qwen2.5-coder:7b",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    format: jsonSchema,
    stream: true,
  });

  for await (const part of response) {
    process.stdout.write(part.message.content);
  }
};

const commands = [
  {
    triggers: ["init", "initialize", "--init", "-init"],
    function: initialize,
  },
  {
    triggers: ["scan", "--scan", "-s"],
    function: scan,
  },
  {
    triggers: ["report", "--report", "-r"],
    function: () => {
      console.log("Generating report...");
    },
  },
  {
    triggers: ["analyze", "--analyze", "-a"],
    function: () => {
      console.log("Analyzing...");
    },
  },
  {
    triggers: ["help", "--help", "-h"],
    function: () => {
      console.log("Available commands:");
    },
  },
  {
    triggers: ["version", "--version", "-v"],
    function: async () => {
      console.log("Checking version...");
    },
  },
  {
    triggers: ["exit", "quit", "--exit", "-e"],
    function: () => {
      console.log("Exiting...");
    },
  },
];

const main = async () => {
  console.clear();
  mainBanner();

  const action = process.argv[2];

  for (const command of commands) {
    if (command.triggers.includes(action)) {
      await command.function();
    }
  }
};

main().catch((err) => {
  console.error("An error occurred:", err);
});
