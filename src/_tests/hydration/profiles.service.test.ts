import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ProfilesService } from "../../hydration/profiles.service";

describe("ProfilesService", () => {
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
                handle: "user.bsky.social",
                displayName: "Test User",
                description: "A test profile",
                avatar: "https://example.com/avatar.jpg",
                banner: "https://example.com/banner.jpg",
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

  it("hydrates a valid profile", async () => {
    const did = "did:plc:test123";
    const result = await service.hydrateProfile(did);

    expect(result).not.toBeNull();
    expect(result?.did).toBe(did);
    expect(result?.handle).toBe("user.bsky.social");
    expect(result?.displayName).toBe("Test User");
    expect(result?.description).toBe("A test profile");
    expect(result?.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(result?.bannerUrl).toBe("https://example.com/banner.jpg");
  });

  it("returns null on suspended account", async () => {
    mockAgent.app.bsky.actor.getProfile = mock(async () => {
      throw { error: "AccountTakedown" };
    });

    const did = "did:plc:test123";
    const result = await service.hydrateProfile(did);

    expect(result).toBeNull();
  });

  it("returns null on account not found", async () => {
    mockAgent.app.bsky.actor.getProfile = mock(async () => {
      throw { message: "Account has been suspended" };
    });

    const did = "did:plc:test123";
    const result = await service.hydrateProfile(did);

    expect(result).toBeNull();
  });

  it("returns null when success is false", async () => {
    mockAgent.app.bsky.actor.getProfile = mock(async () => ({
      success: false,
      data: null,
    }));

    const did = "did:plc:test123";
    const result = await service.hydrateProfile(did);

    expect(result).toBeNull();
  });

  it("wraps API call with rate limiter", async () => {
    const did = "did:plc:test123";
    await service.hydrateProfile(did);

    expect(mockLimit).toHaveBeenCalledTimes(1);
  });

  it("handles optional profile fields", async () => {
    mockAgent.app.bsky.actor.getProfile = mock(async () => ({
      success: true,
      data: {
        did: "did:plc:test123",
        handle: "user.bsky.social",
        labels: [],
      },
    }));

    const did = "did:plc:test123";
    const result = await service.hydrateProfile(did);

    expect(result?.displayName).toBeUndefined();
    expect(result?.description).toBeUndefined();
    expect(result?.avatarUrl).toBeUndefined();
    expect(result?.bannerUrl).toBeUndefined();
  });

  it("detects profile labels", async () => {
    const profileWithLabels = {
      did: "did:plc:test123",
      handle: "user.bsky.social",
      labels: [
        { val: "spam" },
        { val: "nsfw" },
      ],
    };

    expect(service.hasLabel(profileWithLabels, "spam")).toBe(true);
    expect(service.hasLabel(profileWithLabels, "nsfw")).toBe(true);
    expect(service.hasLabel(profileWithLabels, "other")).toBe(false);
  });

  it("handles profile without labels array", async () => {
    const profileWithoutLabels = {
      did: "did:plc:test123",
      handle: "user.bsky.social",
    };

    expect(service.hasLabel(profileWithoutLabels, "spam")).toBe(false);
  });
});
