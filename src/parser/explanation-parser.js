export default function parseStructuredResponse(content) {
  const normalized = stripCodeFences((content || "").trim());

  try {
    return JSON.parse(normalized);
  } catch {
    const extractedJson = extractFirstJsonObject(normalized);
    if (!extractedJson) {
      return null;
    }

    try {
      return JSON.parse(extractedJson);
    } catch {
      return null;
    }
  }
}

const stripCodeFences = (text) => {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
};

const extractFirstJsonObject = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
};
