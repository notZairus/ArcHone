import { GoogleGenAI } from "@google/genai";
import { getAiConfig } from "./local.js";
import OpenAI from "openai";
import { log } from "../utils/helpers.js";
import { OPENAI_MODEL } from "../constants.js";

export async function explainIssueWithAI(issue) {
  const aiConfig = getAiConfig();

  const aiEnabled = aiConfig.enabled;
  const provider = aiConfig.provider;

  if (!aiEnabled) {
    log("AI is not enabled in the configuration.");
    process.exit(1);
  }

  function getExplainIssueFunction(provider) {
    switch (provider) {
      case "gemini":
        return explainIssueWithGemini;
      case "openai":
        return explainIssueWithOpenAI;
      default:
        return explainIssueWithDefaultAI;
    }
  }

  const explainIssue = getExplainIssueFunction(provider);

  return await explainIssue(issue);
}

// TODO: default ai of this function is not implemented yet, so it will throw an error if the provider is set to "default"
export async function explainComplexityWithAI({
  filePath,
  language,
  mode,
  fn,
}) {
  const aiConfig = getAiConfig();

  const aiEnabled = aiConfig.enabled;
  const provider = aiConfig.provider;

  if (!aiEnabled) {
    log("AI is not enabled in the configuration.");
    process.exit(1);
  }

  function getExplainComplexityFunction(provider) {
    switch (provider) {
      case "gemini":
        return explainComplexityWithGemini;
      case "openai":
        return explainComplexityWithOpenAI;
      default:
        return explainComplexityWithDefaultAI;
    }
  }

  const explainComplexity = getExplainComplexityFunction(provider);

  return await explainComplexity({ filePath, language, mode, fn });
}

// GOOGLE GEMINI

async function explainIssueWithGemini(issue) {
  const aiConfig = getAiConfig();
  if (!aiConfig.enabled) {
    log("AI is not enabled in the configuration.");
    process.exit(1);
  }

  const prompt = `You are a programming instructor and you teach student how to write a cleaner code. The student provide you the code information and you explain it in a way that a 15yrs old student with no prior programming knowledge can understand. You should only tackle the issue that the student provide you. You should not provide any other information that is not related to the issue. You should only explain the following points:
  - Why this issue matters 
  - What part of the code caused it 
  - Beginner-friendly explanation 
  - Suggested fixed code 
  - What changed and why

  below is the information about the code issue:
  ${JSON.stringify(issue)}
`;

  const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });

  // Use generateContent instead of generateContentStream
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          whyThisIssueMatters: {
            type: "STRING",
            description: "A brief explanation of why this issue is important.",
          },
          whatPartOfTheCodeCausedIt: {
            type: "STRING",
            description:
              "A brief explanation of what part of the code caused this issue.",
          },
          beginnerFriendlyExplanation: {
            type: "STRING",
            description:
              "A plain text beginner-friendly explanation of the issue.",
          },
          suggestedFixedCode: {
            type: "STRING",
            description:
              "The suggested fixed code snippet. Keep only necessary changes, no comments/logs, and maintain standard line breaks and formatting. Return strictly raw code with real newlines (\\n). Do NOT compress into a single line.",
          },
          whatChanged: {
            type: "ARRAY",
            items: {
              type: "STRING",
            },
          },
        },
        required: [
          "whyThisIssueMatters",
          "whatPartOfTheCodeCausedIt",
          "beginnerFriendlyExplanation",
          "suggestedFixedCode",
          "whatChanged",
        ],
      },
    },
  });

  const output = JSON.parse(response.text);

  return {
    ...output,
    title: issue.title,
    type: issue.type,
    line: issue.line,
    message: issue.message,
    principle: issue.principle,
  };
}

async function explainComplexityWithGemini({ filePath, language, mode, fn }) {
  const aiConfig = getAiConfig();
  if (!aiConfig.enabled) {
    log("AI is not enabled in the configuration.");
    process.exit(1);
  }

  const prompt = `You are a programming instructor teaching students how to improve algorithm efficiency.
  Explain one function's complexity result in simple terms suitable for a 15-year-old beginner.
  Focus only on this function.

  Return JSON only and explain these points:
  - Why this function got the complexity
  - What part of the function likely causes the complexity
  - Beginner-friendly explanation
  - Whether the function can be meaningfully optimized to improve its time or space complexity
  - Suggested optimized code
  - What changed and why

  Set isOptimizable to true only when you can provide a real optimization that improves
  the function's time or space complexity. Set it to false when the complexity cannot
  be meaningfully improved or when the suggested code would be equivalent to the original.

  Context:
  ${JSON.stringify({
    filePath,
    language,
    mode,
    function: fn,
  })}
`;

  const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          isOptimizable: {
            type: "BOOLEAN",
            description:
              "Whether a meaningful optimization can improve this function's time or space complexity.",
          },
          whatPartOfTheFunctionCausedIt: {
            type: "STRING",
            description:
              "A brief explanation of what part of the function caused this complexity.",
          },
          beginnerFriendlyExplanation: {
            type: "STRING",
            description:
              "A plain-text beginner-friendly explanation of this complexity result.",
          },
          suggestedOptimizedCode: {
            type: "STRING",
            description:
              "The suggested optimized code snippet. Make sure that the space or time complexity improved. make sure that the function take the same input and return the same output. Keep only necessary changes and return strictly raw code with real newlines (\\n).",
          },
        },
        required: [
          "isOptimizable",
          "whatPartOfTheFunctionCausedIt",
          "beginnerFriendlyExplanation",
          "suggestedOptimizedCode",
        ],
      },
    },
  });

  const output = JSON.parse(response.text);

  return {
    ...output,
    name: fn.name,
    line: fn.line,
    time: fn.time,
    space: fn.space,
  };
}

// OPENAI

async function askOpenAI(prompt, schemaName, schema) {
  const aiConfig = getAiConfig();

  const client = new OpenAI({
    apiKey: aiConfig.apiKey,
  });

  const start = performance.now();

  const response = await client.responses.create({
    model: OPENAI_MODEL,

    reasoning: {
      effort: "low",
    },

    input: prompt,

    text: {
      verbosity: "medium",

      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });

  log(`${schemaName}: ${((performance.now() - start) / 1000).toFixed(2)}s`);

  return JSON.parse(response.output_text);
}

async function explainIssueWithOpenAI(issue) {
  const aiConfig = getAiConfig();

  if (!aiConfig.enabled) {
    log("AI is not enabled in the configuration.");
    process.exit(1);
  }

  const issueContext = JSON.stringify(issue);

  const [
    whyThisIssueMatters,
    whatPartOfTheCodeCausedIt,
    beginnerFriendlyExplanation,
    fix,
  ] = await Promise.all([
    // 1. Why the issue matters
    askOpenAI(
      `You are a programming instructor teaching a 15-year-old beginner.

Explain ONLY why the reported code issue matters.

Keep the explanation concise and easy to understand.
Do not discuss unrelated issues or improvements.

Code issue:
${issueContext}`,
      "issue_importance",
      {
        type: "object",
        properties: {
          answer: {
            type: "string",
            description:
              "A concise beginner-friendly explanation of why this issue matters.",
          },
        },
        required: ["answer"],
        additionalProperties: false,
      },
    ),

    // 2. What caused the issue
    askOpenAI(
      `You are a programming instructor teaching a 15-year-old beginner.

Identify ONLY the part of the provided code that caused the reported issue.

Clearly explain what part of the code is responsible.
Do not discuss unrelated problems.

Code issue:
${issueContext}`,
      "issue_cause",
      {
        type: "object",
        properties: {
          answer: {
            type: "string",
            description:
              "A concise explanation of what part of the code caused the issue.",
          },
        },
        required: ["answer"],
        additionalProperties: false,
      },
    ),

    // 3. Beginner-friendly explanation
    askOpenAI(
      `You are a programming instructor teaching a 15-year-old
student with no prior programming knowledge.

Explain ONLY the reported code issue in very simple terms.

Use simple language and an analogy or example when helpful.
Do not discuss unrelated programming concepts.

Code issue:
${issueContext}`,
      "beginner_explanation",
      {
        type: "object",
        properties: {
          answer: {
            type: "string",
            description:
              "A simple explanation of the issue suitable for a beginner with no programming experience.",
          },
        },
        required: ["answer"],
        additionalProperties: false,
      },
    ),

    // 4. Fixed code + what changed
    askOpenAI(
      `You are a programming instructor.

Fix ONLY the reported code issue.

Rules:
- Preserve the original functionality.
- Preserve the expected input and output.
- Make only the necessary changes.
- Do not improve unrelated code.
- Do not add comments.
- Do not add logs.
- Return complete, runnable code.
- Keep the code properly formatted.

After producing the fixed code, explain exactly what you changed
and why each change was necessary.

Do not claim changes that were not actually made.

Code issue:
${issueContext}`,
      "issue_fix",
      {
        type: "object",
        properties: {
          suggestedFixedCode: {
            type: "string",
            description:
              "The corrected code with only the necessary changes. Preserve the original functionality, inputs, and outputs. Return properly formatted raw code.",
          },

          whatChanged: {
            type: "array",
            items: {
              type: "string",
            },
            description:
              "A list of the actual changes made to the fixed code and why each change was necessary.",
          },
        },
        required: ["suggestedFixedCode", "whatChanged"],
        additionalProperties: false,
      },
    ),
  ]);

  return {
    whyThisIssueMatters: whyThisIssueMatters.answer,

    whatPartOfTheCodeCausedIt: whatPartOfTheCodeCausedIt.answer,

    beginnerFriendlyExplanation: beginnerFriendlyExplanation.answer,

    suggestedFixedCode: fix.suggestedFixedCode,

    whatChanged: fix.whatChanged,

    title: issue.title,
    type: issue.type,
    line: issue.line,
    message: issue.message,
    principle: issue.principle,
  };
}

async function explainComplexityWithOpenAI({ filePath, language, mode, fn }) {
  const aiConfig = getAiConfig();

  if (!aiConfig.enabled) {
    log("AI is not enabled in the configuration.");
    process.exit(1);
  }

  const client = new OpenAI({
    apiKey: aiConfig.apiKey,
  });

  const prompt = `You are a programming instructor teaching students how to improve algorithm efficiency.

Explain one function's complexity result in simple terms suitable for a 15-year-old beginner.

Focus ONLY on this function.

Explain:
- Why this function got the complexity
- What part of the function likely causes the complexity
- Beginner-friendly explanation
- Whether the function can be meaningfully optimized to improve its time or space complexity
- Suggested optimized code
- What changed and why

IMPORTANT RULES:

- Set isOptimizable to true ONLY when you can provide a real optimization that improves
  the function's asymptotic time or space complexity.
- Do not consider cleaner syntax, fewer lines, different variable names, or minor
  constant-factor improvements as meaningful optimizations.
- If the complexity cannot be meaningfully improved, set isOptimizable to false.
- If isOptimizable is false, return the original function unchanged as suggestedOptimizedCode.
- The optimized function must take the same input and return the same output.
- Preserve the original behavior.
- Make only the necessary changes.
- Do not optimize unrelated parts of the function.
- Do not add comments or logs.
- Return properly formatted code.
- Keep explanations concise and beginner-friendly.

Context:
${JSON.stringify({
  filePath,
  language,
  mode,
  function: fn,
})}
`;

  const response = await client.responses.create({
    model: "gpt-5.6-luna",

    reasoning: {
      effort: "low",
    },

    input: prompt,

    text: {
      verbosity: "low",

      format: {
        type: "json_schema",
        name: "complexity_explanation",
        strict: true,

        schema: {
          type: "object",

          properties: {
            isOptimizable: {
              type: "boolean",
              description:
                "Whether a meaningful optimization can improve the function's asymptotic time or space complexity.",
            },

            whatPartOfTheFunctionCausedIt: {
              type: "string",
              description:
                "A brief explanation of what part of the function caused this complexity.",
            },

            beginnerFriendlyExplanation: {
              type: "string",
              description:
                "A plain-text beginner-friendly explanation of this complexity result.",
            },

            suggestedOptimizedCode: {
              type: "string",
              description:
                "The optimized function. It must preserve the same input, output, and behavior. If no meaningful optimization exists, return the original function unchanged. Return properly formatted raw code.",
            },

            whatChanged: {
              type: "array",
              items: {
                type: "string",
              },
              description:
                "A concise list explaining the actual changes made to the optimized code and why they were necessary. If no optimization was made, return an empty array.",
            },
          },

          required: [
            "isOptimizable",
            "whatPartOfTheFunctionCausedIt",
            "beginnerFriendlyExplanation",
            "suggestedOptimizedCode",
            "whatChanged",
          ],

          additionalProperties: false,
        },
      },
    },
  });

  const output = JSON.parse(response.output_text);

  return {
    ...output,
    name: fn.name,
    line: fn.line,
    time: fn.time,
    space: fn.space,
  };
}

// DEFAULT

async function explainIssueWithDefaultAI(issue) {
  const response = await fetch(
    "https://archone-default-ai.appwrite.network/explain-issue",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(issue),
    },
  );

  const data = await response.json();

  return data;
}

async function explainComplexityWithDefaultAI({
  filePath,
  language,
  mode,
  fn,
}) {
  const response = await fetch(
    "https://archone-default-ai.appwrite.network/explain-complexity",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filePath,
        language,
        mode,
        fn,
      }),
    },
  );

  const data = await response.json();

  return data;
}
