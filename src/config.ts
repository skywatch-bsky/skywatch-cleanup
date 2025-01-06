import "dotenv/config";

export const MOD_DID = process.env.DID ?? "";
export const OZONE_PDS = process.env.OZONE_PDS ?? "";
export const BSKY_HANDLE = process.env.BSKY_HANDLE ?? "";
export const BSKY_PASSWORD = process.env.BSKY_PASSWORD ?? "";
export const CURSOR_UPDATE_INTERVAL = process.env.CURSOR_UPDATE_INTERVAL
  ? Number(process.env.CURSOR_UPDATE_INTERVAL)
  : 60000;
export const LABEL_LIMIT = process.env.LABEL_LIMIT;
export const LABEL_LIMIT_WAIT = process.env.LABEL_LIMIT_WAIT;
export const AUTOACK_PERIOD = process.env.AUTOACK_PERIOD
  ? Number(process.env.AUTOACK_PERIOD)
  : 600000;
