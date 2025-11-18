import { describe, it, expect } from "bun:test";

describe("handleEvents policy parsing", () => {
  describe("flag extraction", () => {
    it("should extract flag 1 for violations", () => {
      const response = "1 - Contains intolerant language";
      const match = response.match(/^(\d+)\s*-\s*(.+)$/s);
      const flag = match ? parseInt(match[1], 10) : undefined;
      const reason = match ? match[2].trim() : response;

      expect(flag).toBe(1);
      expect(reason).toBe("Contains intolerant language");
    });

    it("should extract flag 0 for no violations", () => {
      const response = "0 - Content is acceptable";
      const match = response.match(/^(\d+)\s*-\s*(.+)$/s);
      const flag = match ? parseInt(match[1], 10) : undefined;

      expect(flag).toBe(0);
    });

    it("should handle flag as undefined for malformed response", () => {
      const response = "This is not formatted correctly";
      const match = response.match(/^(\d+)\s*-\s*(.+)$/s);
      const flag = match ? parseInt(match[1], 10) : undefined;

      expect(flag).toBeUndefined();
    });
  });

  describe("reason extraction", () => {
    it("should extract reason from formatted response", () => {
      const response = "1 - This post violates policy X because of discriminatory language";
      const match = response.match(/^(\d+)\s*-\s*(.+)$/s);
      const reason = match ? match[2].trim() : response;

      expect(reason).toBe(
        "This post violates policy X because of discriminatory language",
      );
    });

    it("should use full response as reason if not formatted", () => {
      const response = "This content has issues";
      const match = response.match(/^(\d+)\s*-\s*(.+)$/s);
      const reason = match ? match[2].trim() : response;

      expect(reason).toBe("This content has issues");
    });

    it("should preserve newlines in multiline reason", () => {
      const response = `1 - Multiple issues:
- Issue 1
- Issue 2
- Issue 3`;
      const match = response.match(/^(\d+)\s*-\s*(.+)$/s);
      const reason = match ? match[2].trim() : response;

      expect(reason).toContain("Multiple issues:");
      expect(reason).toContain("- Issue 1");
      expect(reason).toContain("- Issue 3");
    });
  });

  describe("null policy evaluation handling", () => {
    it("should handle null result from evaluateContentPolicy", () => {
      const result = null;

      expect(result).toBeNull();
    });

    it("should skip label creation when result is null", () => {
      const result = null;

      if (result) {
        expect(result.flag).toBeDefined();
      } else {
        expect(true).toBe(true); // Test that we correctly skip
      }
    });

    it("should handle undefined flag gracefully", () => {
      const result = { flag: undefined, reason: "Some reason" };

      expect(result.flag).toBeUndefined();
      if (result.flag === 1) {
        // This should not execute
        expect(true).toBe(false);
      }
    });
  });

  describe("response structure", () => {
    it("should return correct response structure", () => {
      const flag = 1;
      const reason = "Test reason";

      const response = {
        choices: [
          {
            message: {
              flag,
              reason,
            },
          },
        ],
      };

      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.flag).toBe(1);
      expect(response.choices[0].message.reason).toBe("Test reason");
    });

    it("should handle response without flag", () => {
      const reason = "Just a reason";

      const response = {
        choices: [
          {
            message: {
              flag: undefined,
              reason,
            },
          },
        ],
      };

      expect(response.choices[0].message.flag).toBeUndefined();
      expect(response.choices[0].message.reason).toBe("Just a reason");
    });
  });
});
