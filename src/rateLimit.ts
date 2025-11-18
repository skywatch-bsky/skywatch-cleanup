import { pRateLimit } from "p-ratelimit";

// Global limiter - maintained for backwards compatibility
// 280 requests per 30 seconds, max 48 concurrent
export const limit = pRateLimit({
  interval: 30000,
  rate: 280,
  concurrency: 48,
  maxDelay: 0,
});

// Posts service limiter
// 3000 requests per 5 minutes (10 req/sec), max 48 concurrent
// Allows up to 60 seconds of queueing before rejection
export const postsServiceLimit = pRateLimit({
  interval: 300000, // 5 minutes
  rate: 3000,
  concurrency: 48,
  maxDelay: 60000, // 60 second tolerance for delays
});

// Profiles service limiter
// 3000 requests per 5 minutes (10 req/sec), max 48 concurrent
// Allows up to 60 seconds of queueing before rejection
export const profilesServiceLimit = pRateLimit({
  interval: 300000, // 5 minutes
  rate: 3000,
  concurrency: 48,
  maxDelay: 60000, // 60 second tolerance for delays
});
