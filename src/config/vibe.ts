export const VIBE_MARKET = "https://vibechain.com/market";
export const VIBE_INVITE = "VM-3E10281669DDEFE1";

export function vibeHref(path = ""): string {
  const url = new URL(path ? `${VIBE_MARKET}${path}` : VIBE_MARKET);
  url.searchParams.set("invite", VIBE_INVITE);
  return url.toString();
}
