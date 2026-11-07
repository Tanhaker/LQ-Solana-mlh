/**
 * Plan metadata on IPFS (pinned through Pinata).
 *
 * On chain, a plan's PlanMeta account stores `ipfs://<cid>` of a JSON file:
 *   { "name": "...", "description": "...", "image": "ipfs://<image cid>" }
 * Content on IPFS is addressed by its hash, so a CID always means the same bytes.
 */

export type PlanMetadata = {
  name?: string;
  description?: string;
  /** ipfs:// link to the logo. */
  image?: string;
};

export const MAX_DESCRIPTION = 200;
export const MAX_LOGO_BYTES = 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const GATEWAY = (process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

/** A plain CID: letters and digits, the same rule the program enforces. */
export const isCid = (s: string) => /^[A-Za-z0-9]{46,121}$/.test(s);

export const cidOf = (uri: string | undefined | null) => {
  const cid = uri?.startsWith("ipfs://") ? uri.slice(7) : null;
  return cid && isCid(cid) ? cid : null;
};

/** HTTPS address of an ipfs:// link: our Pinata gateway, or a public one. */
export function gatewayUrl(uri: string | undefined | null): string | null {
  const cid = cidOf(uri);
  if (!cid) return null;
  return GATEWAY ? `https://${GATEWAY}/ipfs/${cid}` : `https://ipfs.io/ipfs/${cid}`;
}

/**
 * Uploads a plan's logo and description through /api/ipfs (which pins them on
 * Pinata) and returns the ipfs:// link to store on chain. `keepImage` reuses
 * an existing logo when only the description changes.
 */
export async function uploadPlanMetadata(args: {
  name: string;
  description: string;
  logo: File | null;
  keepImage?: string;
}): Promise<string> {
  const form = new FormData();
  form.set("name", args.name);
  form.set("description", args.description);
  if (args.logo) form.set("logo", args.logo);
  else if (args.keepImage) form.set("image", args.keepImage);
  const res = await fetch("/api/ipfs", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { uri?: string; error?: string };
  if (!res.ok || !json.uri) throw new Error(json.error ?? `Upload failed (${res.status}).`);
  return json.uri;
}

/** Same checks as the server, so problems show before uploading. */
export function logoProblem(file: File | null): string | null {
  if (!file) return null;
  if (!LOGO_TYPES.includes(file.type)) return "The logo must be a PNG, JPG, WebP or GIF.";
  if (file.size > MAX_LOGO_BYTES) return "The logo must be 1 MB or smaller.";
  return null;
}
