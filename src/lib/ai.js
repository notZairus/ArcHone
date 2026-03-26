import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey:
    "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",
});

export async function explainIssue(issue) {
  const completion = await openai.chat.completions.create({
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
            why: {
              type: "string",
              description: "Explanation of why the issue matters",
            },
            current_code: {
              type: "string",
              description:
                "The original problematic code. Each line of code should start with this symbol '|'",
            },
            fixed_code: {
              type: "string",
              description:
                "The improved version of the code. Each line of code should start with this symbol '|'",
            },
            changes: {
              type: "string",
              description: "Summary of what was changed",
            },
          },
          required: ["why", "current_code", "fixed_code", "changes"],
          additionalProperties: false,
        },
      },
    },
  });

  return completion.choices?.[0]?.message?.content || "";
}
