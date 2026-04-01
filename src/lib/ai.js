import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey:
    "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",
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

////////////////////////////////////////////////////////////
// calls the serverless function to get the explanation for a specific issue
// export async function explainIssue(issue) {
//   try {
//     const response = await axios.post(
//       "https://69ca6ce30003822d6cdc.sgp.appwrite.run",
//       { issue: issue },
//     );

//     const data = response.data;
//     return JSON.stringify(data.output);
//   } catch (error) {
//     console.error("Error fetching explanation:", error);
//   }
// }
