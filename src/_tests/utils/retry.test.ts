import { describe, it, expect, mock } from "bun:test";
import {
  withRetry,
  isRateLimitError,
  isNetworkError,
  isServerError,
  isRecordNotFoundError,
} from "../../utils/retry";

describe("Retry Utility", () => {
  describe("Error Detection Predicates", () => {
    it("detects rate limit errors by status 429", () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
    });

    it("detects rate limit errors by error type", () => {
      expect(isRateLimitError({ error: "RateLimitExceeded" })).toBe(true);
    });

    it("detects rate limit errors by message", () => {
      expect(isRateLimitError({ message: "rate limited" })).toBe(true);
      expect(isRateLimitError({ message: "429 Too Many Requests" })).toBe(true);
    });

    it("detects network errors by code", () => {
      expect(isNetworkError({ code: "ECONNRESET" })).toBe(true);
      expect(isNetworkError({ code: "ETIMEDOUT" })).toBe(true);
      expect(isNetworkError({ code: "ENOTFOUND" })).toBe(true);
    });

    it("detects network errors by message", () => {
      expect(isNetworkError({ message: "socket hang up" })).toBe(true);
      expect(isNetworkError({ message: "timeout" })).toBe(true);
    });

    it("detects server errors by status 5xx", () => {
      expect(isServerError({ status: 500 })).toBe(true);
      expect(isServerError({ status: 502 })).toBe(true);
      expect(isServerError({ status: 503 })).toBe(true);
      expect(isServerError({ status: 599 })).toBe(true);
    });

    it("rejects non-server errors", () => {
      expect(isServerError({ status: 404 })).toBe(false);
      expect(isServerError({ status: 400 })).toBe(false);
    });

    it("detects record not found errors", () => {
      expect(isRecordNotFoundError({ error: "RecordNotFound" })).toBe(true);
      expect(isRecordNotFoundError({ message: "RecordNotFound" })).toBe(true);
    });
  });

  describe("withRetry Function", () => {
    it("succeeds on first attempt", async () => {
      const fn = mock(async () => "success");
      const result = await withRetry(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on transient error and eventually succeeds", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount < 2) {
          throw { status: 500, message: "Server error" };
        }
        return "success";
      };

      const result = await withRetry(fn);
      expect(result).toBe("success");
      expect(callCount).toBe(2);
    });

    it("respects maxAttempts config", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw { status: 500 };
      };

      try {
        await withRetry(fn, { maxAttempts: 2 });
      } catch (e) {
        // Expected to fail
      }

      expect(callCount).toBe(2);
    });

    it("does not retry non-retryable errors", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw { error: "RecordNotFound" };
      };

      try {
        await withRetry(fn, {
          retryableErrors: [isRateLimitError, isNetworkError, isServerError],
        });
      } catch (e) {
        // Expected - RecordNotFound is not retryable
      }

      expect(callCount).toBe(1);
    });

    it("implements exponential backoff timing", async () => {
      const timings: number[] = [];
      let callCount = 0;

      const fn = async () => {
        callCount++;
        timings.push(Date.now());
        if (callCount < 3) {
          throw { status: 500 };
        }
        return "success";
      };

      await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 50,
        maxDelay: 200,
        backoffMultiplier: 2,
      });

      // Check backoff progression
      const delay1 = timings[1] - timings[0];
      const delay2 = timings[2] - timings[1];

      // delay1 should be ~50ms, delay2 should be ~100ms (double)
      expect(delay1).toBeGreaterThanOrEqual(40);
      expect(delay1).toBeLessThan(100);
      expect(delay2).toBeGreaterThanOrEqual(delay1 - 10); // Allow some variance
    });

    it("respects maxDelay cap", async () => {
      const timings: number[] = [];
      let callCount = 0;

      const fn = async () => {
        callCount++;
        timings.push(Date.now());
        if (callCount < 4) {
          throw { status: 500 };
        }
        return "success";
      };

      await withRetry(fn, {
        maxAttempts: 4,
        initialDelay: 100,
        maxDelay: 200,
        backoffMultiplier: 2,
      });

      const delay3 = timings[3] - timings[2];
      // Third delay should be capped at maxDelay (200ms)
      expect(delay3).toBeLessThanOrEqual(250);
    });
  });

  describe("withRetry Edge Cases", () => {
    it("does not retry when maxAttempts is 0", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw { status: 500 };
      };

      try {
        await withRetry(fn, { maxAttempts: 0 });
      } catch (e) {
        // Expected to fail
      }

      expect(callCount).toBe(0);
    });

    it("does not retry when maxAttempts is 1", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw { status: 500 };
      };

      try {
        await withRetry(fn, { maxAttempts: 1 });
      } catch (e) {
        // Expected to fail on first attempt
      }

      expect(callCount).toBe(1);
    });

    it("handles very large maxAttempts (safety test)", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount < 3) {
          throw { status: 500 };
        }
        return "success";
      };

      const result = await withRetry(fn, { maxAttempts: 100 });

      expect(result).toBe("success");
      expect(callCount).toBe(3); // Should succeed on third attempt
    });

    it("handles missing error object gracefully", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw null; // Weird but possible
      };

      try {
        await withRetry(fn, { maxAttempts: 2 });
      } catch (e) {
        // Should fail with the null error
      }

      expect(callCount).toBeGreaterThan(0);
    });

    it("handles undefined error gracefully", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw undefined;
      };

      try {
        await withRetry(fn, { maxAttempts: 2 });
      } catch (e) {
        // Should fail with the undefined error
      }

      expect(callCount).toBeGreaterThan(0);
    });

    it("preserves original error through retry chain", async () => {
      const originalError = new Error("Original error message");
      let callCount = 0;

      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw { status: 500 }; // Retryable
        }
        throw originalError; // Non-retryable on second attempt
      };

      try {
        await withRetry(fn, {
          maxAttempts: 3,
          retryableErrors: [isServerError],
        });
      } catch (e) {
        expect((e as any).message).toBe("Original error message");
      }
    });

    it("respects custom retryableErrors predicates", async () => {
      let callCount = 0;

      const isCustomRetryable = (error: any) => error?.code === "CUSTOM_TEMP_ERROR";

      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw { code: "CUSTOM_TEMP_ERROR" };
        }
        return "success";
      };

      const result = await withRetry(fn, {
        maxAttempts: 3,
        retryableErrors: [isCustomRetryable],
      });

      expect(result).toBe("success");
      expect(callCount).toBe(2);
    });

    it("stops retrying when all predicates return false", async () => {
      let callCount = 0;

      const fn = async () => {
        callCount++;
        throw { code: "UNKNOWN_ERROR" };
      };

      try {
        await withRetry(fn, {
          maxAttempts: 5,
          retryableErrors: [isRateLimitError, isNetworkError, isServerError],
        });
      } catch (e) {
        // Should fail on first attempt
      }

      expect(callCount).toBe(1);
    });

    it("handles initialDelay of 0", async () => {
      let callCount = 0;

      const fn = async () => {
        callCount++;
        if (callCount < 2) {
          throw { status: 500 };
        }
        return "success";
      };

      const result = await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 0,
        maxDelay: 0,
      });

      expect(result).toBe("success");
      expect(callCount).toBe(2);
    });

    it("handles initialDelay > maxDelay", async () => {
      let callCount = 0;

      const fn = async () => {
        callCount++;
        if (callCount < 2) {
          throw { status: 500 };
        }
        return "success";
      };

      const result = await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 5000, // 5 seconds
        maxDelay: 1000,     // 1 second
      });

      expect(result).toBe("success");
      expect(callCount).toBe(2);
    });

    it("handles backoffMultiplier of 1 (no backoff)", async () => {
      let callCount = 0;
      const timings: number[] = [];

      const fn = async () => {
        callCount++;
        timings.push(Date.now());
        if (callCount < 3) {
          throw { status: 500 };
        }
        return "success";
      };

      await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 50,
        backoffMultiplier: 1, // No exponential increase
      });

      expect(callCount).toBe(3);
      // With multiplier=1, delays should be similar
      if (timings.length >= 3) {
        const delay1 = timings[1] - timings[0];
        const delay2 = timings[2] - timings[1];
        expect(Math.abs(delay1 - delay2)).toBeLessThan(50);
      }
    });

    it("handles backoffMultiplier > 1 correctly", async () => {
      let callCount = 0;
      const timings: number[] = [];

      const fn = async () => {
        callCount++;
        timings.push(Date.now());
        if (callCount < 4) {
          throw { status: 500 };
        }
        return "success";
      };

      await withRetry(fn, {
        maxAttempts: 4,
        initialDelay: 25,
        maxDelay: 500,
        backoffMultiplier: 3,
      });

      expect(callCount).toBe(4);
      if (timings.length >= 4) {
        // Delays should increase
        const delay1 = timings[1] - timings[0];
        const delay2 = timings[2] - timings[1];
        const delay3 = timings[3] - timings[2];

        expect(delay2).toBeGreaterThan(delay1);
        expect(delay3).toBeGreaterThan(delay2);
      }
    });

    it("emits descriptive error on final failure", async () => {
      const fn = async () => {
        throw new Error("Persistent failure");
      };

      let caughtError: any = null;

      try {
        await withRetry(fn, { maxAttempts: 2 });
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toBe("Persistent failure");
    });
  });
});
