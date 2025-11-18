export function isRecordNotFoundError(error: any): boolean {
  return (
    error?.error === "RecordNotFound" ||
    error?.message?.includes("RecordNotFound")
  );
}

export function isRateLimitError(error: any): boolean {
  if (error?.status === 429) return true;
  if (error?.error === "RateLimitExceeded") return true;
  const msg = error?.message || "";
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("rate limited")
  );
}

export function isNetworkError(error: any): boolean {
  const code = error?.code || error?.errno || "";
  const msg = error?.message || "";

  const networkErrorCodes = [
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "ERR_HTTP2_STREAM_CANCEL",
    "ERR_TLS_CERT_HAS_EXPIRED",
    "EPROTO",
  ];

  if (networkErrorCodes.includes(code)) return true;
  if (msg.includes("timeout") || msg.includes("socket hang up")) return true;
  if (
    msg.includes("connect ECONNREFUSED") ||
    msg.includes("getaddrinfo ENOTFOUND")
  )
    return true;

  return false;
}

export function isServerError(error: any): boolean {
  const status = error?.status || 0;
  return status >= 500 && status < 600;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: ((error: any) => boolean)[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [isRateLimitError, isNetworkError, isServerError],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable =
        finalConfig.retryableErrors?.some((predicate) => predicate(error)) ??
        true;

      if (!isRetryable || attempt === finalConfig.maxAttempts) {
        throw error;
      }

      const delayMs = Math.min(
        finalConfig.initialDelay *
          Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelay,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
