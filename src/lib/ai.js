import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { getAiConfig } from "./local.js";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "???",
});

export async function explainIssue(issue) {
  const stream = await openai.chat.completions.stream({
    model: "arcee-ai/trinity-mini:free",
    messages: [
      {
        role: "user",
        content:
          "Analyze this issue and return structured output. Keep code indentation and line breaks intact. In fixed_code, use the same indentation style as current_code (spaces/tabs and nesting).\n make sure that the code output has the right indentation." +
          JSON.stringify(issue),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "analysis_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            why: { type: "string" },
            current_code: { type: "string" },
            fixed_code: { type: "string" },
            changes: { type: "string" },
          },
          required: ["why", "current_code", "fixed_code", "changes"],
          additionalProperties: false,
        },
      },
    },
  });

  let fullText = "";

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;

    if (delta) {
      console.log(delta);
      fullText += delta;
    }
  }

  return fullText;
}

// GOOGLE GEMINI

// export async function explainIssueWithGemini(issue) {
//   const aiConfig = getAiConfig();
//   if (!aiConfig.enabled) {
//     console.log("AI is not enabled in the configuration.");
//     process.exit(1);
//   }

//   const prompt = `You are a programming instructor and you teach student how to write a cleaner code. The student provide you the code information and you explain it in a way that a 15yrs old student with no prior programming knowledge can understand. You should only tackle the issue that the student provide you. You should not provide any other information that is not related to the issue. You should only explain the following points:
//   - Why this issue matters
//   - What part of the code caused it
//   - Beginner-friendly explanation
//   - Suggested fixed code
//   - What changed and why

//   below is the information about the code issue:
//   ${JSON.stringify(issue)}
// `;

//   const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });

//   const responseStream = await ai.models.generateContentStream({
//     model: "gemini-2.5-flash",
//     contents: prompt,
//     config: {
//       responseMimeType: "application/json",
//       responseSchema: {
//         type: "OBJECT",
//         properties: {
//           whyThisIssueMatters: {
//             type: "STRING",
//             description: "A brief explanation of why this issue is important.",
//           },
//           whatPartOfTheCodeCausedIt: {
//             type: "STRING",
//             description:
//               "A brief explanation of what part of the code caused this issue.",
//           },
//           beginnerFriendlyExplanation: {
//             type: "STRING",
//             description:
//               "A plain text beginner-friendly explanation of the issue.",
//           },
//           suggestedFixedCode: {
//             type: "STRING",
//             description:
//               "The suggested fixed code snippet without any comments in it. make sure that the whole code is ready to be rendered using markdown.",
//           },
//           whatChanged: {
//             type: "ARRAY",
//             items: {
//               type: "STRING",
//             },
//           },
//         },
//         required: [
//           "whyThisIssueMatters",
//           "whatPartOfTheCodeCausedIt",
//           "beginnerFriendlyExplanation",
//           "suggestedFixedCode",
//           "whatChanged",
//         ],
//       },
//     },
//   });

//   let completeOutput = "";

//   for await (const chunk of responseStream) {
//     const chunkText = chunk.text;
//     completeOutput += chunkText;

//     console.log(chunkText);
//   }

//   const output = JSON.parse(completeOutput);

//   return {
//     ...output,
//     title: issue.title,
//     type: issue.type,
//     line: issue.line,
//     message: issue.message,
//     principle: issue.principle,
//   };
// }

export async function explainIssueWithGemini(issue) {
  const aiConfig = getAiConfig();
  if (!aiConfig.enabled) {
    console.log("AI is not enabled in the configuration.");
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
              "The suggested fixed code snippet without any comments in it. make sure that the whole code is ready to be rendered using markdown.",
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
