# Hydration Refactoring: Moderated Service Pattern Design

## Overview

Refactor skywatch-cleanup's post and profile hydration logic to adopt robust patterns from skywatch-tail while maintaining cleanup's straightforward main loop architecture. The goal is to eliminate code duplication, improve error resilience through built-in retry logic, and align with proven patterns across the skywatch ecosystem.

**Success Criteria:**
- Extract and reuse post/profile hydration code from skywatch-tail
- Implement retry mechanism with exponential backoff for transient failures
- Adopt skywatch-tail's rate-limiting strategy (5-minute intervals, 3000 req/5min)
- Maintain backwards-compatible API surface (no changes to `getPosts()`/`getProfiles()` callers)
- Improve error handling: graceful degradation with comprehensive logging
- Add unit and integration tests for new services
- All existing tests continue to pass

## Architecture

### High-Level Design

The refactoring adopts a **Moderated Service Pattern** that extracts hydration concerns into reusable, testable service classes while preserving the main loop's simplicity.

**Key Components:**

1. **Hydration Services** - New class-based modules for post and profile fetching
   - `PostsService` (`src/hydration/posts.service.ts`)
   - `ProfilesService` (`src/hydration/profiles.service.ts`)
   - Encapsulate API calls, field extraction, error handling
   - Single responsibility: fetch data for a given URI/DID, return hydrated object or null

2. **Retry Utility** - Generic error handling with exponential backoff
   - `withRetry()` function (`src/utils/retry.ts`)
   - Configurable retry predicates for rate limits, network errors, server errors
   - Composes with rate limiting: `await limit(() => withRetry(...))`

3. **Per-Service Rate Limiting** - Dedicated rate limiter per concern
   - `postsServiceLimit` and `profilesServiceLimit` in `src/rateLimit.ts`
   - Each uses: 5-minute interval, 3000 req/5min (10 req/sec), 48 concurrent, 60-sec max delay
   - Provides flexibility for future differentiated limits per service

4. **Enhanced Error Handling** - Graceful degradation throughout
   - Services catch and log errors, return null on failure
   - Main loop continues processing other events on individual failures
   - Distinguishes retryable errors (429, 5xx, network) from permanent (404 "RecordNotFound")

**Data Flow (unchanged):**
```
main.ts loop
  ├→ getStatus() → handleRepoStatus()
  ├→ getEvents() → handleRepoReport() or handlePostReport()
  │    ├→ getPosts() → PostsService.hydratePost()
  │    │    ├→ postsServiceLimit() wrapper
  │    │    ├→ withRetry() wrapper
  │    │    └→ agent.tools.ozone.moderation.getRecord()
  │    └→ getProfiles() → ProfilesService.hydrateProfile()
  │         ├→ profilesServiceLimit() wrapper
  │         ├→ withRetry() wrapper
  │         └→ agent.tools.ozone.moderation.getRecord()
  └→ Apply moderation actions
```

## Existing Patterns

**From skywatch-tail adopted:**
- Service class pattern for hydration (robust encapsulation)
- `withRetry()` utility with configurable backoff (proven exponential backoff: 1s→2s→4s)
- Retry predicates for error classification (rate limit, network, server)
- Per-service rate limiting with p-ratelimit
- Graceful error handling (log, return null, don't throw)
- Structured logging via Pino (already used in cleanup)

**From skywatch-cleanup preserved:**
- Main loop polling architecture (no queue)
- AtpAgent as central API client
- Rate-limited wrapper pattern (already uses p-ratelimit)
- Configuration via environment variables
- Direct moderation action emission (no async processing)

**Divergence from skywatch-tail:**
- No DuckDB persistence (cleanup fetches fresh each cycle)
- No blob processing (cleanup doesn't handle embedded media)
- No PDS resolution (cleanup uses hardcoded PDS endpoint)
- Simpler service initialization (no dependency injection container)
- No profile re-hydration on missing avatar/banner

## Implementation Phases

### Phase 1: Create Retry Utility
**Goal:** Establish the retry mechanism that services will use

**Components:**
- Create `src/utils/retry.ts` with `withRetry()` function
- Define error predicates: `isRateLimitError()`, `isNetworkError()`, `isServerError()`, `isRecordNotFoundError()`
- Extract from skywatch-tail, adapt for cleanup's context (remove blob-specific logic)
- Default config: maxAttempts=3, initialDelay=1000ms, maxDelay=10000ms, backoffMultiplier=2

**Testing:** Unit tests for retry logic (backoff timing, max attempts, error detection)

**Dependencies:** None (pure utility)

### Phase 2: Extend Rate Limiting Configuration
**Goal:** Add per-service rate limiters while maintaining backwards compatibility

**Components:**
- Modify `src/rateLimit.ts` to add `postsServiceLimit` and `profilesServiceLimit`
- Each configured: interval=300000ms, rate=3000, concurrency=48, maxDelay=60000ms
- Keep existing global `limit` for backwards compatibility

**Testing:** Verify rate limiter exports are available, configuration is correct

**Dependencies:** None (uses existing p-ratelimit)

### Phase 3: Create PostsService
**Goal:** Extract and encapsulate post hydration logic into a reusable service

**Components:**
- Create `src/hydration/posts.service.ts` as a class
- Constructor: accepts `agent` (AtpAgent) and `limit` (pRateLimit instance)
- Method: `hydratePost(uri: string): Promise<HydratedPost | null>`
- Implementation:
  - Parse AT URI format
  - Rate-limited + retry-wrapped API call to `agent.tools.ozone.moderation.getRecord()`
  - Extract fields: text, facets, embeds, langs, tags, createdAt, isReply
  - Log success/failure
  - Return hydrated object or null on error

**Testing:**
- Unit tests: happy path, retry on 429/5xx, graceful 404 handling, field extraction
- Mock agent with prepared responses

**Dependencies:** `@atproto/api` (AtpAgent), `src/utils/retry.ts`

### Phase 4: Create ProfilesService
**Goal:** Extract and encapsulate profile hydration logic into a reusable service

**Components:**
- Create `src/hydration/profiles.service.ts` as a class
- Constructor: accepts `agent` (AtpAgent) and `limit` (pRateLimit instance)
- Method: `hydrateProfile(did: string): Promise<HydratedProfile | null>`
- Implementation:
  - Rate-limited + retry-wrapped API calls:
    - `agent.com.atproto.repo.getRecord()` for raw profile record
    - `agent.getProfile()` for handle/metadata
  - Extract fields: displayName, description, avatarCid, bannerCid, handle
  - Log success/failure
  - Return hydrated object or null on error

**Testing:**
- Unit tests: happy path, retry logic, graceful 404 handling, handle resolution
- Mock agent with prepared responses

**Dependencies:** `@atproto/api` (AtpAgent), `src/utils/retry.ts`

### Phase 5: Refactor getPosts() and getProfiles()
**Goal:** Update existing entry points to use new services

**Components:**
- Modify `src/getPosts.ts`:
  - Instantiate `PostsService` with `agent` and `postsServiceLimit`
  - Update `getPosts(uris: string[])` to call `postService.hydratePost()` for each
  - Preserve function signature (API unchanged for callers)

- Modify `src/getProfiles.ts`:
  - Instantiate `ProfilesService` with `agent` and `profilesServiceLimit`
  - Update `getProfiles(dids: string[])` to call `profileService.hydrateProfile()` for each
  - Preserve function signature (API unchanged for callers)

**Testing:**
- Existing tests in `src/_tests/getPosts.test.ts` should still pass
- No changes needed to `handleEvents.test.ts` (API unchanged)

**Dependencies:** `src/hydration/posts.service.ts`, `src/hydration/profiles.service.ts`, `src/rateLimit.ts`

### Phase 6: Add Service Integration Tests
**Goal:** Verify services integrate correctly with rate limiting and error handling

**Components:**
- Create `src/_tests/hydration/integration.test.ts`
- Test scenarios:
  - Services compose correctly with rate limiter
  - Concurrent requests stay within rate limits
  - Retry and rate-limit wrapping work together
  - Error logging occurs as expected

**Testing:** Integration-level tests with mocked agent

**Dependencies:** Services from phases 3-4, rate limiter from phase 2

### Phase 7: Add Unit Tests for Retry Utility
**Goal:** Comprehensive coverage of retry logic

**Components:**
- Create `src/_tests/utils/retry.test.ts`
- Test scenarios:
  - Exponential backoff timing (1s→2s→4s with 2x multiplier)
  - Max retries enforced (stop after maxAttempts)
  - Retryable errors trigger retry (429, 5xx, network)
  - Non-retryable errors return immediately (404 RecordNotFound)
  - Success on first attempt (no unnecessary retries)
  - Success after retry (failure then success)

**Testing:** Pure unit tests with no external dependencies

**Dependencies:** `src/utils/retry.ts`

### Phase 8: Update Documentation & Run Full Test Suite
**Goal:** Verify all tests pass, document changes

**Components:**
- Update `README.md` with new architecture (services, retry, rate-limiting)
- Run full test suite: `bun test`
- Verify all existing tests still pass
- Verify new tests pass
- Check for type errors: `tsc --noEmit`

**Testing:** Full integration test run

**Dependencies:** All phases 1-7

## Additional Considerations

### Error Recovery Strategy

The retry mechanism handles three categories of errors:

1. **Retryable errors** (automatic retry with backoff):
   - Rate limit (429 status or "rate limited" message)
   - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND, etc.)
   - Server errors (5xx status codes)
   - Backoff: 1s → 2s → 4s (max 3 attempts)

2. **Non-retryable errors** (log & return null):
   - Record not found (404-like "RecordNotFound")
   - Account suspended ("AccountTakedown" or "AccountNotFound")
   - Invalid input (malformed URI/DID)
   - These are logged at WARN level, don't cause main loop to fail

3. **Unexpected errors** (log & return null):
   - Any error after max retries exhausted
   - Logged at ERROR level with full error context
   - Caller gets null, main loop continues

### Rate Limiting Rationale

**5-minute interval** (vs cleanup's current 30-second):
- Aligns with skywatch-tail's proven strategy
- Provides more breathing room for bursts
- 3000 req/5min = 10 req/sec (vs 9.33 req/sec currently)

**60-second max delay** (vs cleanup's 0ms):
- Allows moderate queueing for legitimate spikes
- Prevents cascading timeouts under load
- Strict policy: reject if delayed > 60s

### Backwards Compatibility

**No breaking changes:**
- `getPosts()` and `getProfiles()` function signatures unchanged
- Callers in `handleEvents.ts` require zero modifications
- Main loop in `main.ts` unaffected
- All existing tests continue to pass

**Gradual adoption possible:**
- New services can coexist with old implementation during transition
- Can migrate module-by-module if preferred
- Current design allows instant cutover (low risk)

### Future Extensibility

This design enables:
- **Caching layer** - Services can add optional caching without affecting callers
- **Metrics/tracing** - Service wrappers can emit telemetry
- **Queue-based processing** - Services can be adapted to async event model
- **Custom retry strategies** - Different backoff per service if needed
- **Blob processing** - ProfilesService can be extended to handle avatar/banner blobs
