# skywatch-cleanup

Automated moderation service for Bluesky that processes moderation reports and queue status updates through the Ozone API.

## Overview

skywatch-cleanup is a continuous moderation service that:

- Polls the Ozone moderation queue for pending reports
- Hydrates post and profile content from Bluesky
- Applies automated moderation actions based on configurable rules
- Handles transient failures with automatic retry logic
- Rate-limits API calls to stay within platform constraints

## Architecture

The service uses a **Moderated Service Pattern** that encapsulates hydration concerns into reusable, testable service classes while preserving a straightforward main loop.

### Key Components

#### Hydration Services

Dedicated services handle fetching and processing of Bluesky content:

- **PostsService** (`src/hydration/posts.service.ts`)
  - Fetches post records via Ozone API
  - Extracts text, facets, embeds, metadata
  - Handles reply threading context
  - Returns `HydratedPost` or null on error

- **ProfilesService** (`src/hydration/profiles.service.ts`)
  - Fetches profile data via Bluesky API
  - Resolves handles, display names, descriptions
  - Processes avatar and banner URLs
  - Detects account suspension/takedown
  - Returns `HydratedProfile` or null on error

#### Retry Mechanism

The retry utility (`src/utils/retry.ts`) provides automatic error recovery:

- **Error Classification**:
  - Rate limits (429, "rate limited" messages)
  - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)
  - Server errors (5xx status codes)
  - Non-retryable errors (RecordNotFound, AccountTakedown)

- **Exponential Backoff**: 1s → 2s → 4s (configurable)
- **Max Attempts**: 3 by default
- **Graceful Degradation**: Returns null after exhaustion, doesn't crash main loop

#### Rate Limiting

Per-service rate limiters using `p-ratelimit`:

- **Configuration**: 3000 requests per 5 minutes (10 req/sec)
- **Concurrency**: 48 concurrent requests
- **Max Delay**: 60 seconds of queueing tolerance
- **Separate Limits**: Posts and profiles use independent limiters for flexibility

### Data Flow

```
main.ts polling loop
  ├→ getStatus() → handleRepoStatus()
  │    └→ Process account-level reports
  │
  ├→ getEvents() → handleRepoReport() / handlePostReport()
  │    ├→ getPostContent() → PostsService.hydratePost()
  │    │    ├→ postsServiceLimit wrapper
  │    │    ├→ withRetry wrapper
  │    │    └→ agent.tools.ozone.moderation.getRecord()
  │    │
  │    └→ getProfiles() → ProfilesService.hydrateProfile()
  │         ├→ profilesServiceLimit wrapper
  │         ├→ withRetry wrapper
  │         └→ agent.app.bsky.actor.getProfile()
  │
  └→ Apply moderation actions via Ozone API
```

## Configuration

Required environment variables:

```bash
# Bluesky credentials
BSKY_USERNAME=your.username.bsky.social
BSKY_PASSWORD=your-app-password

# Moderator DID (required for Ozone API access)
MOD_DID=did:plc:your-moderator-did

# Logging level (optional, default: info)
LOG_LEVEL=info
```

## Installation

Install dependencies using Bun:

```bash
bun install
```

## Running the Service

### Development

```bash
bun run src/main.ts
```

### Production

```bash
NODE_ENV=production bun run src/main.ts
```

The service runs continuously, polling for new moderation events every cycle.

## Testing

### Run All Tests

```bash
bun test
```

### Run Specific Test Suites

```bash
# Retry utility tests
bun test src/_tests/utils/retry.test.ts

# Hydration service tests
bun test src/_tests/hydration/

# Integration tests
bun test src/_tests/hydration/integration.test.ts
```

### TypeScript Type Checking

```bash
npx tsc --noEmit
```

## Development Patterns

### Adding New Moderation Rules

1. Update event handlers in `src/handleEvents.ts`
2. Use `getPostContent()` and `getProfiles()` for content access
3. Add tests to `src/_tests/handleEvents.test.ts`
4. Services handle retries and rate limiting automatically

### Error Handling Philosophy

- **Services return null on failure** - Never throw errors to the main loop
- **Log at appropriate levels**:
  - `WARN`: Expected failures (RecordNotFound, AccountTakedown)
  - `ERROR`: Unexpected failures after retries exhausted
  - `INFO`: Successful operations
- **Main loop continues** - Individual failures don't stop processing

### Testing Services

Services accept injected dependencies for easy mocking:

```typescript
const mockAgent = {
  app: {
    bsky: {
      actor: {
        getProfile: mock(async () => ({ success: true, data: mockProfile })),
      },
    },
  },
};

const mockLimit = mock(async (fn) => fn());
const service = new ProfilesService(mockAgent, mockLimit);
```

## Troubleshooting

### Rate Limiting Issues

**Symptom**: Seeing 429 errors in logs

**Solution**: The retry mechanism handles this automatically. If persistent:

- Check `postsServiceLimit` and `profilesServiceLimit` configuration
- Verify `maxDelay` allows sufficient queueing (default: 60s)
- Reduce concurrency if hitting global platform limits

### Network Errors

**Symptom**: ECONNRESET, ETIMEDOUT errors

**Solution**: Automatic retry with exponential backoff handles transient issues. If persistent:

- Check network connectivity to Bluesky API
- Verify DNS resolution
- Review proxy/firewall rules

### Missing Content

**Symptom**: Posts or profiles returning null

**Possible causes**:

- Content deleted (logged as WARN "RecordNotFound")
- Account suspended (logged as WARN "AccountTakedown")
- API failures after retry exhaustion (logged as ERROR)

Check logs for specific error messages to diagnose.

### TypeScript Errors

**Symptom**: Type errors during development

**Solution**:

```bash
npx tsc --noEmit
```

Review error output. Common issues:

- Missing imports from `@atproto/api`
- Type mismatches in service responses
- Incorrect optional chaining on hydrated objects

## Contributing

When contributing:

1. Ensure all tests pass: `bun test`
2. Run type checking: `npx tsc --noEmit`
3. Follow existing patterns for error handling and logging
4. Add tests for new functionality
5. Update documentation if adding features

## License

[Your License Here]

## Project Structure

```
src/
├── hydration/              # Hydration services
│   ├── posts.service.ts    # Post fetching and processing
│   └── profiles.service.ts # Profile fetching and processing
├── utils/
│   └── retry.ts            # Retry mechanism with exponential backoff
├── _tests/
│   ├── hydration/          # Service tests
│   │   ├── posts.service.test.ts
│   │   ├── profiles.service.test.ts
│   │   └── integration.test.ts
│   └── utils/
│       └── retry.test.ts   # Retry utility tests
├── agent.ts                # AtpAgent initialization
├── config.ts               # Configuration management
├── getPosts.ts             # Post hydration entry point
├── getProfiles.ts          # Profile hydration entry point
├── handleEvents.ts         # Event processing and moderation logic
├── logger.ts               # Pino logger configuration
├── main.ts                 # Main polling loop
├── rateLimit.ts            # Rate limiter configuration
└── types.ts                # TypeScript type definitions
```

---

Built with [Bun](https://bun.sh)
