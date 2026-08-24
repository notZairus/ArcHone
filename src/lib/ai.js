import { GoogleGenAI } from "@google/genai";
import { getAiConfig } from "./local.js";

// GOOGLE GEMINI

export async function explainIssueWithGemini(issue) {
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

export async function explainComplexityWithGemini({
  filePath,
  language,
  mode,
  fn,
}) {
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
