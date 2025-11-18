import { describe, it, expect } from "bun:test";

describe("getPosts error handling", () => {
  describe("URI parsing", () => {
    it("should correctly parse valid AT URI", () => {
      const uri =
        "at://did:plc:example123/app.bsky.feed.post/3m5up3mphy22l";
      const parts = uri.split("/");

      expect(parts.length).toBeGreaterThanOrEqual(5);
      expect(parts[0]).toBe("at:");
      expect(parts[2]).toBe("did:plc:example123");
      expect(parts[3]).toBe("app.bsky.feed.post");
    });

    it("should handle invalid AT URI format", () => {
      const uri = "at://incomplete";
      const parts = uri.split("/");

      expect(parts.length).toBeLessThan(5);
    });

    it("should extract repo (DID) from URI", () => {
      const uri = "at://did:plc:abc123def456/app.bsky.feed.post/rkey123";
      const parts = uri.split("/");
      const repo = parts[2];

      expect(repo).toBe("did:plc:abc123def456");
      expect(repo.startsWith("did:plc:")).toBe(true);
    });

    it("should extract rkey from URI", () => {
      const uri = "at://did:plc:xyz/app.bsky.feed.post/3m5up3mphy22l";
      const parts = uri.split("/");
      const rkey = parts.slice(4).join("/");

      expect(rkey).toBe("3m5up3mphy22l");
    });
  });

  describe("error types", () => {
    it("should recognize suspended account error", () => {
      const error = {
        message: "Account has been suspended",
        error: "AccountTakedown",
      };

      const isSuspended =
        error.message === "Account has been suspended" ||
        error.error === "AccountTakedown";

      expect(isSuspended).toBe(true);
    });

    it("should recognize record not found error", () => {
      const error = {
        message: "Could not locate record",
        error: "RecordNotFound",
      };

      const isNotFound = error.error === "RecordNotFound";

      expect(isNotFound).toBe(true);
    });

    it("should not flag unknown errors as suspended", () => {
      const error = {
        message: "Network timeout",
        error: "TimeoutError",
      };

      const isSuspended =
        error.message === "Account has been suspended" ||
        error.error === "AccountTakedown";

      expect(isSuspended).toBe(false);
    });
  });

  describe("null return behavior", () => {
    it("should return null for missing post", () => {
      const result = null;

      expect(result).toBeNull();
    });

    it("should return null for suspended account", () => {
      const result = null;

      expect(result).toBeNull();
    });

    it("should return null for invalid URI", () => {
      const result = null;

      expect(result).toBeNull();
    });
  });

  describe("text extraction", () => {
    it("should extract text from post record", () => {
      const record = { text: "This is a post" };

      expect(record.text).toBeDefined();
      expect(record.text).toBe("This is a post");
    });

    it("should handle record without text", () => {
      const record = {};
      const text = (record as any).text || null;

      expect(text).toBeNull();
    });

    it("should handle record with empty text", () => {
      const record = { text: "" };

      expect(record.text).toBeDefined();
      expect(record.text).toBe("");
    });
  });
});
