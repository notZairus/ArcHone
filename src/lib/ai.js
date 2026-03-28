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
