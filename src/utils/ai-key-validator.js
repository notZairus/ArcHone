import { GoogleGenAI } from "@google/genai";
import clack from "../lib/clack.js";

export const validateGeminiApiKey = async (apiKey) => {
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    config: {
      responseMimeType: "application/json",
    },
    contents: `
      {
        isValid: boolean,
      }
    `,
  });

  if (response && JSON.parse(response.text).isValid) {
    clack.note("API key is valid.");
    return true;
  }

  return false;
};
