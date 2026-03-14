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

  const projectTree = {
    structure: {
      label: "ArcHone",
      nodes: [
        ".env",
        ".gitignore",
        "archone.config.json",
        "package-lock.json",
        "package.json",
        {
          label: "src",
          nodes: [
            {
              label: "actions",
              nodes: ["initialize.js", "scan.js"],
            },
            "constants.js",
            "index.js",
            {
              label: "lib",
              nodes: ["ai.js", "clack.js"],
            },
            {
              label: "ui",
              nodes: ["displays.js"],
            },
            {
              label: "utils",
              nodes: [
                "ai-key-validator.js",
                "config.js",
                "env.js",
                "helpers.js",
              ],
            },
          ],
        },
      ],
    },
    state: {
      fileCount: 11,
      folderCount: 5,
      level: 3,
    },
  };

  const prompt = `
    You are a strict project architecture analyzer. Do NOT assume the project is good just because files exist.
    Analyze the following ExpressJS backend project structure and provide a detailed report. 
    Be critical and identify issues with folder structure, file organization, modularity, and maintainability.
    Analyze the project solely based on the provided structure and state. Do NOT make assumptions about code quality or content.

    Provide the output as JSON with the following keys:
    - "projectName": name of the project
    - "analysisVersion": version of your analysis
    - "health": "good", "poor", or "average"
    - "summary": overview of the project
    - "issues": list of identified problems with severity (low, medium, high), file paths, and suggested fixes
    - "recommendations": practical suggestions to improve architecture and maintainability
    - "bestPractices": which best practices are missing or partially implemented

    Project structure:
    ${JSON.stringify(projectTree)}
  `;

  const response = await ollama.chat({
    model: "qwen3.5:4b",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    format: jsonSchema,
    stream: true,
    think: false,
  });

  for await (const part of response) {
    process.stdout.write(part.message.content);
  }
};
