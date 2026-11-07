import { gatewayUrl, isCid, MAX_DESCRIPTION, type PlanMetadata } from "@/lib/ipfs";

/**
 * Reads a plan's metadata JSON from IPFS and returns a cleaned copy.
 * A CID names fixed content, so answers are cached for a year.
 */

const cache = new Map<string, PlanMetadata>();
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

export async function GET(req: Request) {
  const cid = new URL(req.url).searchParams.get("cid") ?? "";
  if (!isCid(cid)) return Response.json({ error: "Bad CID" }, { status: 400 });

  let meta = cache.get(cid);
  if (!meta) {
    try {
      const res = await fetch(gatewayUrl(`ipfs://${cid}`)!, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(String(res.status));
      const raw = (await res.json()) as Record<string, unknown>;
      const image = text(raw.image, 140);
      meta = {
        name: text(raw.name, 32),
        description: text(raw.description, MAX_DESCRIPTION),
        image: image && gatewayUrl(image) ? image : undefined,
      };
      if (cache.size > 1000) cache.clear();
      cache.set(cid, meta);
    } catch {
      return Response.json({ error: "Couldn't read that file from IPFS yet." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
  }
  return Response.json(meta, {
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
  });
}
