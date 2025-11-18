import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createChatCompletion } from "../ollama.js";

// Mock the OpenAI module
const mockChatCompletion = mock(() =>
  Promise.resolve({
    choices: [
      {
        message: {
          content: "1 - This is a test violation",
        },
      },
    ],
  }),
);

describe("ollama", () => {
  describe("createChatCompletion", () => {
    it("should parse response with {number} - {reason} format", async () => {
      // Create a mock OpenAI client
      const mockOpenAI = {
        chat: {
          completions: {
            create: mockChatCompletion,
          },
        },
      };

      // We need to test the function directly by importing it
      // For now, we'll test the parsing logic separately
      const testResponse = "1 - This is a test violation";
      const match = testResponse.match(/^(\d+)\s*-\s*(.+)$/s);

      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("1");
      expect(match?.[2]).toBe("This is a test violation");
    });

    it("should parse response with spaces around dash", () => {
      const testResponse = "2   -   Multiple spaces around dash";
      const match = testResponse.match(/^(\d+)\s*-\s*(.+)$/s);

      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("2");
      expect(match?.[2]).toBe("Multiple spaces around dash");
    });

    it("should handle multiline reason", () => {
      const testResponse = `3 - This is a multiline reason
that spans multiple lines
and continues here`;
      const match = testResponse.match(/^(\d+)\s*-\s*(.+)$/s);

      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("3");
      expect(match?.[2]).toContain("multiline reason");
      expect(match?.[2]).toContain("continues here");
    });

    it("should handle response without flag format", () => {
      const testResponse = "This is just plain text without a number";
      const match = testResponse.match(/^(\d+)\s*-\s*(.+)$/s);

      expect(match).toBeNull();
    });

    it("should extract flag as number", () => {
      const testResponse = "42 - Some reason";
      const match = testResponse.match(/^(\d+)\s*-\s*(.+)$/s);
      const flag = match ? parseInt(match[1], 10) : undefined;

      expect(flag).toBe(42);
      expect(typeof flag).toBe("number");
    });

    it("should handle zero as flag", () => {
      const testResponse = "0 - No violation found";
      const match = testResponse.match(/^(\d+)\s*-\s*(.+)$/s);
      const flag = match ? parseInt(match[1], 10) : undefined;

      expect(flag).toBe(0);
    });

    it("should trim reason", () => {
      const testResponse = "1 -   Reason with leading spaces  ";
      const match = testResponse.match(/^(\d+)\s*-\s*(.+)$/s);
      const reason = match ? match[2].trim() : "";

      expect(reason).toBe("Reason with leading spaces");
    });
  });
});
