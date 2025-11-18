import OpenAI from "openai";
import { OLLAMA_BASE_URL, MODEL } from "./config.js";

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      flag?: number;
      reason: string;
    };
  }>;
}

export const openai = new OpenAI({
  baseURL: `http://${OLLAMA_BASE_URL}/v1/`,
  apiKey: "ollama",
});

// Wrapper to parse responses into our format
export const createChatCompletion = async (
  config: ChatCompletionRequest,
): Promise<ChatCompletionResponse> => {
  const response = await openai.chat.completions.create({
    model: config.model,
    messages: config.messages,
  });

  const content = response.choices[0].message.content || "";

  // Parse {number} - {reason} format
  const match = content.match(/^(\d+)\s*-\s*(.+)$/s);
  const flag = match ? parseInt(match[1], 10) : undefined;
  const reason = match ? match[2].trim() : content;

  return {
    choices: [
      {
        message: {
          flag,
          reason,
        },
      },
    ],
  };
};
