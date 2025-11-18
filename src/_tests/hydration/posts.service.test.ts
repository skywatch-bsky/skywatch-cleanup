import { describe, it, expect, mock, beforeEach } from "bun:test";
import { PostsService } from "../../hydration/posts.service";

describe("PostsService", () => {
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
                  text: "Hello world",
                  createdAt: "2025-01-01T00:00:00Z",
                  facets: [],
                  langs: ["en"],
                  tags: ["test"],
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

  it("hydrates a valid post", async () => {
    const uri = "at://did123/app.bsky.feed.post/abc123";
    const result = await service.hydratePost(uri);

    expect(result).not.toBeNull();
    expect(result?.uri).toBe(uri);
    expect(result?.text).toBe("Hello world");
    expect(result?.langs).toEqual(["en"]);
    expect(result?.isReply).toBe(false);
  });

  it("extracts reply status from post", async () => {
    mockAgent.tools.ozone.moderation.getRecord = mock(async () => ({
      data: {
        value: {
          text: "Reply text",
          createdAt: "2025-01-01T00:00:00Z",
          reply: {
            root: { uri: "at://...", cid: "..." },
            parent: { uri: "at://...", cid: "..." },
          },
        },
      },
    }));

    const uri = "at://did123/app.bsky.feed.post/abc123";
    const result = await service.hydratePost(uri);

    expect(result?.isReply).toBe(true);
  });

  it("returns null on RecordNotFound error", async () => {
    mockAgent.tools.ozone.moderation.getRecord = mock(async () => {
      throw { error: "RecordNotFound" };
    });

    const uri = "at://did123/app.bsky.feed.post/abc123";
    const result = await service.hydratePost(uri);

    expect(result).toBeNull();
  });

  it("returns null on missing value", async () => {
    mockAgent.tools.ozone.moderation.getRecord = mock(async () => ({
      data: {},
    }));

    const uri = "at://did123/app.bsky.feed.post/abc123";
    const result = await service.hydratePost(uri);

    expect(result).toBeNull();
  });

  it("wraps API call with rate limiter", async () => {
    const uri = "at://did123/app.bsky.feed.post/abc123";
    await service.hydratePost(uri);

    expect(mockLimit).toHaveBeenCalledTimes(1);
  });

  it("extracts embed data correctly", async () => {
    mockAgent.tools.ozone.moderation.getRecord = mock(async () => ({
      data: {
        value: {
          text: "Post with image",
          createdAt: "2025-01-01T00:00:00Z",
          embed: {
            $type: "app.bsky.embed.images",
            images: [{ image: { link: "..." } }],
          },
        },
      },
    }));

    const uri = "at://did123/app.bsky.feed.post/abc123";
    const result = await service.hydratePost(uri);

    expect(result?.embeds).toEqual([
      { $type: "app.bsky.embed.images", images: [{ image: { link: "..." } }] },
    ]);
  });
});
