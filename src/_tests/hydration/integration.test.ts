import { describe, it, expect, mock, beforeEach } from "bun:test";
import { PostsService } from "../../hydration/posts.service";
import { ProfilesService } from "../../hydration/profiles.service";
import { withRetry } from "../../utils/retry";

describe("Hydration Integration Tests", () => {
  describe("PostsService with Rate Limiting and Retry", () => {
    let mockAgent: any;
    let mockLimit: any;
    let service: PostsService;

    beforeEach(() => {
      mockAgent = {
        tools: {
          ozone: {
            moderation: {
              getRecord: mock(async () => ({
                data: {
                  value: {
                    text: "Integration test post",
                    createdAt: "2025-01-01T00:00:00Z",
                    facets: [],
                    langs: ["en"],
                  },
                },
              })),
            },
          },
        },
      };

      mockLimit = mock(async (fn: () => Promise<any>) => fn());
      service = new PostsService(mockAgent, mockLimit);
    });

    it("composes rate limiter with retry mechanism", async () => {
      const uri = "at://did123/app.bsky.feed.post/abc123";
      const result = await service.hydratePost(uri);

      expect(result).not.toBeNull();
      expect(result?.text).toBe("Integration test post");
      expect(mockLimit).toHaveBeenCalledTimes(1);
    });

    it("retries on transient errors within rate-limited context", async () => {
      let callCount = 0;
      mockAgent.tools.ozone.moderation.getRecord = mock(async () => {
        callCount++;
        if (callCount === 1) {
          throw { status: 500, message: "Server error" };
        }
        return {
          data: {
            value: {
              text: "Success after retry",
              createdAt: "2025-01-01T00:00:00Z",
            },
          },
        };
      });

      const uri = "at://did123/app.bsky.feed.post/abc123";
      const result = await service.hydratePost(uri);

      expect(result).not.toBeNull();
      expect(result?.text).toBe("Success after retry");
      expect(callCount).toBe(2);
      expect(mockLimit).toHaveBeenCalledTimes(1);
    });

    it("handles multiple concurrent requests", async () => {
      const uris = [
        "at://did1/app.bsky.feed.post/post1",
        "at://did2/app.bsky.feed.post/post2",
        "at://did3/app.bsky.feed.post/post3",
      ];

      const results = await Promise.all(
        uris.map((uri) => service.hydratePost(uri)),
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r !== null)).toBe(true);
      expect(mockLimit).toHaveBeenCalledTimes(3);
    });
  });

  describe("ProfilesService with Rate Limiting and Retry", () => {
    let mockAgent: any;
    let mockLimit: any;
    let service: ProfilesService;

    beforeEach(() => {
      mockAgent = {
        app: {
          bsky: {
            actor: {
              getProfile: mock(async () => ({
                success: true,
                data: {
                  did: "did:plc:test123",
                  handle: "integration.test",
                  displayName: "Integration Test User",
                  labels: [],
                },
              })),
            },
          },
        },
      };

      mockLimit = mock(async (fn: () => Promise<any>) => fn());
      service = new ProfilesService(mockAgent, mockLimit);
    });

    it("composes rate limiter with retry mechanism", async () => {
      const did = "did:plc:test123";
      const result = await service.hydrateProfile(did);

      expect(result).not.toBeNull();
      expect(result?.displayName).toBe("Integration Test User");
      expect(mockLimit).toHaveBeenCalledTimes(1);
    });

    it("retries on transient errors within rate-limited context", async () => {
      let callCount = 0;
      mockAgent.app.bsky.actor.getProfile = mock(async () => {
        callCount++;
        if (callCount === 1) {
          throw { status: 503, message: "Service unavailable" };
        }
        return {
          success: true,
          data: {
            did: "did:plc:test123",
            handle: "retry.test",
            displayName: "Success after retry",
            labels: [],
          },
        };
      });

      const did = "did:plc:test123";
      const result = await service.hydrateProfile(did);

      expect(result).not.toBeNull();
      expect(result?.displayName).toBe("Success after retry");
      expect(callCount).toBe(2);
      expect(mockLimit).toHaveBeenCalledTimes(1);
    });

    it("handles multiple concurrent requests", async () => {
      const dids = ["did:plc:user1", "did:plc:user2", "did:plc:user3"];

      const results = await Promise.all(
        dids.map((did) => service.hydrateProfile(did)),
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r !== null)).toBe(true);
      expect(mockLimit).toHaveBeenCalledTimes(3);
    });
  });

  describe("Cross-service Integration", () => {
    it("handles concurrent requests across multiple services", async () => {
      const mockAgent = {
        tools: {
          ozone: {
            moderation: {
              getRecord: mock(async () => ({
                data: {
                  value: {
                    text: "Post from cross-service test",
                    createdAt: "2025-01-01T00:00:00Z",
                  },
                },
              })),
            },
          },
        },
        app: {
          bsky: {
            actor: {
              getProfile: mock(async () => ({
                success: true,
                data: {
                  did: "did:plc:test123",
                  handle: "cross.test",
                  labels: [],
                },
              })),
            },
          },
        },
      };

      const mockPostsLimit = mock(async (fn: () => Promise<any>) => fn());
      const mockProfilesLimit = mock(async (fn: () => Promise<any>) => fn());

      const postsService = new PostsService(mockAgent, mockPostsLimit);
      const profilesService = new ProfilesService(mockAgent, mockProfilesLimit);

      const [postResult, profileResult] = await Promise.all([
        postsService.hydratePost("at://did123/app.bsky.feed.post/abc123"),
        profilesService.hydrateProfile("did:plc:test123"),
      ]);

      expect(postResult).not.toBeNull();
      expect(profileResult).not.toBeNull();
      expect(mockPostsLimit).toHaveBeenCalledTimes(1);
      expect(mockProfilesLimit).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling Integration", () => {
    it("logs and handles errors gracefully in PostsService", async () => {
      const mockAgent = {
        tools: {
          ozone: {
            moderation: {
              getRecord: mock(async () => {
                throw { error: "RecordNotFound" };
              }),
            },
          },
        },
      };

      const mockLimit = mock(async (fn: () => Promise<any>) => fn());
      const service = new PostsService(mockAgent, mockLimit);

      const result = await service.hydratePost(
        "at://did123/app.bsky.feed.post/abc123",
      );

      expect(result).toBeNull();
      expect(mockLimit).toHaveBeenCalledTimes(1);
    });

    it("logs and handles errors gracefully in ProfilesService", async () => {
      const mockAgent = {
        app: {
          bsky: {
            actor: {
              getProfile: mock(async () => {
                throw { error: "AccountTakedown" };
              }),
            },
          },
        },
      };

      const mockLimit = mock(async (fn: () => Promise<any>) => fn());
      const service = new ProfilesService(mockAgent, mockLimit);

      const result = await service.hydrateProfile("did:plc:test123");

      expect(result).toBeNull();
      expect(mockLimit).toHaveBeenCalledTimes(1);
    });
  });
});
