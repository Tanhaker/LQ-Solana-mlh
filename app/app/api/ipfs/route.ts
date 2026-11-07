import { cidOf, LOGO_TYPES, MAX_DESCRIPTION, MAX_LOGO_BYTES, type PlanMetadata } from "@/lib/ipfs";

/**
 * Pins a plan's logo and metadata JSON on IPFS through Pinata, and returns the
 * `ipfs://` link the issuer then stores on chain with `set_plan_metadata`.
 * The Pinata key stays on the server (PINATA_JWT).
 */

const PINATA_UPLOAD = "https://uploads.pinata.cloud/v3/files";

// A light per-address limit, so the public endpoint can't drain the Pinata quota.
const WINDOW_MS = 10 * 60_000;
const MAX_UPLOADS = 12;
const recent = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.size > 2000) recent.clear();
  recent.set(ip, [...hits, now]);
  return hits.length >= MAX_UPLOADS;
}

/** Checks the file really is the image type it claims (magic bytes). */
function looksLike(type: string, b: Uint8Array) {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (type === "image/png") return at(0, 0x89, 0x50, 0x4e, 0x47);
  if (type === "image/jpeg") return at(0, 0xff, 0xd8, 0xff);
  if (type === "image/gif") return at(0, 0x47, 0x49, 0x46, 0x38);
  if (type === "image/webp") return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
  return false;
}

async function pin(jwt: string, file: Blob, name: string): Promise<string> {
  const body = new FormData();
  body.append("file", file, name);
  body.append("network", "public");
  body.append("name", name);
  const res = await fetch(PINATA_UPLOAD, { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body });
  const json = (await res.json().catch(() => null)) as { data?: { cid?: string }; error?: unknown } | null;
  if (!res.ok || !json?.data?.cid) {
    throw new Error(res.status === 401 || res.status === 403 ? "Pinata rejected the API key." : `Pinata upload failed (${res.status}).`);
  }
  return json.data.cid;
}

export async function POST(req: Request) {
  const jwt = process.env.PINATA_JWT?.trim();
  if (!jwt) return Response.json({ error: "IPFS uploads aren't set up on this server." }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Send the logo and description as a form." }, { status: 400 });
  }
  const name = String(form.get("name") ?? "").trim().slice(0, 32);
  const description = String(form.get("description") ?? "").trim();
  const logo = form.get("logo");
  if (!name) return Response.json({ error: "The plan needs a name." }, { status: 400 });
  if (description.length > MAX_DESCRIPTION) {
    return Response.json({ error: `Keep the description under ${MAX_DESCRIPTION} characters.` }, { status: 400 });
  }
  const file = logo instanceof File && logo.size > 0 ? logo : null;
  // An edit that only changes the description keeps the logo already on IPFS.
  const kept = String(form.get("image") ?? "");
  const keepImage = !file && cidOf(kept) ? kept : null;
  if (!file && !keepImage && !description) {
    return Response.json({ error: "Add a logo or a description." }, { status: 400 });
  }

  try {
    const meta: PlanMetadata = { name };
    if (description) meta.description = description;
    if (keepImage) meta.image = keepImage;
    if (file) {
      if (!LOGO_TYPES.includes(file.type)) {
        return Response.json({ error: "The logo must be a PNG, JPG, WebP or GIF." }, { status: 400 });
      }
      if (file.size > MAX_LOGO_BYTES) return Response.json({ error: "The logo must be 1 MB or smaller." }, { status: 400 });
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!looksLike(file.type, bytes)) return Response.json({ error: "That file isn't a valid image." }, { status: 400 });
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      meta.image = `ipfs://${await pin(jwt, new Blob([bytes], { type: file.type }), `liquid-pass-logo.${ext}`)}`;
    }
    const json = new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" });
    const cid = await pin(jwt, json, "liquid-pass-plan.json");
    return Response.json({ uri: `ipfs://${cid}`, metadata: meta });
  } catch (err) {
    return Response.json({ error: (err as Error).message || "Upload failed." }, { status: 502 });
  }
}
