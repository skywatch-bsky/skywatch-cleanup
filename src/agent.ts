import { setGlobalDispatcher, Agent as Agent } from "undici";
import { BSKY_HANDLE, BSKY_PASSWORD, OZONE_PDS } from "./config.js";
import { AtpAgent } from "@atproto/api";

setGlobalDispatcher(new Agent({ connect: { timeout: 20_000 } }));

export const agent = new AtpAgent({
  service: `https://${OZONE_PDS}`,
});
export const login = () =>
  agent.login({
    identifier: BSKY_HANDLE,
    password: BSKY_PASSWORD,
  });

export const isLoggedIn = login()
  .then((res) => {
    console.log("Access token:", res.data.accessJwt);
    true;
  })
  .catch(() => false);
