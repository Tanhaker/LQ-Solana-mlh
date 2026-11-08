/**
 * Records the Liquid Pass demo video against the live site.
 *
 *   cd demo && npm install && node record-demo.mjs [sceneNumbers...]
 *
 * Each scene is a fresh 1920x1080 Google Chrome page, captured frame by frame
 * (CDP screencast, JPEG q92) and cut to the length of its voiceover line.
 * Wallet scenes plug in a "Demo Wallet" (Wallet Standard) backed by one of the
 * demo keypairs in app/scripts/.demo-wallets.json, so every transaction on
 * screen is a real Solana devnet transaction with test USDC.
 *
 * Output: out/scene-N.mp4 for each scene, then build-video.mjs joins them
 * with voiceover.mp3.
 */
import { chromium } from "playwright-core";
import { Connection, Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "out");
const SITE = "https://liquidpass-solana.vercel.app";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const FFMPEG =
  "C:/Users/User/AppData/Roaming/Python/Python314/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe";
const W = 1920;
const H = 1080;

// Scene lengths in seconds, from the pauses in voiceover.mp3 (ffmpeg silencedetect).
export const SCENES = [19.21, 16.57, 15.86, 10.73, 12.53, 16.10, 13.20, 6.89];

const PLAN = {
  name: "Pulse Fitness Trial",
  price: "5",
  length: "10", // minutes, so the countdown and falling price are visible on camera
  royalty: "10",
  description: "Try every class and the open gym at any Pulse studio.",
};

const demoKeys = JSON.parse(fs.readFileSync(path.join(DIR, "..", "app", "scripts", ".demo-wallets.json"), "utf8"));
const key = (name) => Keypair.fromSecretKey(Uint8Array.from(demoKeys[name]));
const ISSUER = key("issuerD");
const BUYER = key("maya");
const BUYER2 = key("arjun");
const rpc = new Connection("https://api.devnet.solana.com", "confirmed");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ page setup

/** Wallet Standard wallet that signs with `pubkey`'s keypair on the Node side. */
function walletInit({ address, pubkey }) {
  const publicKey = new Uint8Array(pubkey);
  const chains = ["solana:devnet", "solana:testnet", "solana:mainnet"];
  const account = Object.freeze({
    address,
    publicKey,
    chains,
    features: ["solana:signTransaction", "solana:signAndSendTransaction"],
    label: "Demo wallet",
  });
  const b64e = (u8) => btoa(Array.from(u8, (b) => String.fromCharCode(b)).join(""));
  const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const b58d = (s) => {
    let n = 0n;
    for (const c of s) n = n * 58n + BigInt(B58.indexOf(c));
    const out = [];
    while (n > 0n) {
      out.unshift(Number(n % 256n));
      n /= 256n;
    }
    for (const c of s) {
      if (c !== "1") break;
      out.unshift(0);
    }
    return new Uint8Array(out);
  };
  const icon =
    "data:image/svg+xml;base64," +
    btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#9945FF"/><circle cx="16" cy="16" r="7" fill="#14F195"/></svg>');
  const wallet = {
    version: "1.0.0",
    name: "Demo Wallet",
    icon,
    chains,
    get accounts() {
      return [account];
    },
    features: {
      "standard:connect": { version: "1.0.0", connect: async () => ({ accounts: [account] }) },
      "standard:disconnect": { version: "1.0.0", disconnect: async () => {} },
      "standard:events": { version: "1.0.0", on: () => () => {} },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: (...inputs) =>
          Promise.all(inputs.map(async (i) => ({ signedTransaction: b64d(await window.__lpSign(b64e(i.transaction), false)) }))),
      },
      "solana:signAndSendTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signAndSendTransaction: (...inputs) =>
          Promise.all(inputs.map(async (i) => ({ signature: b58d(await window.__lpSign(b64e(i.transaction), true)) }))),
      },
    },
  };
  const register = ({ register }) => register(wallet);
  try {
    window.dispatchEvent(new CustomEvent("wallet-standard:register-wallet", { detail: register }));
  } catch {}
  window.addEventListener("wallet-standard:app-ready", (e) => register(e.detail));
  try {
    localStorage.setItem("walletName", JSON.stringify("Demo Wallet"));
  } catch {}
}

/** A visible mouse pointer with a click ripple (headless Chrome draws none). */
function cursorInit() {
  const add = () => {
    if (document.getElementById("__demo_cursor")) return;
    const c = document.createElement("div");
    c.id = "__demo_cursor";
    c.innerHTML =
      '<svg width="30" height="34" viewBox="0 0 30 34"><path d="M3 2 L3 27 L9.5 21 L14 31.5 L18.5 29.5 L14 19.5 L23 19.5 Z" fill="#000" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, {
      position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none",
      transform: "translate(-100px,-100px)", filter: "drop-shadow(2px 3px 2px rgba(0,0,0,.35))",
    });
    document.documentElement.appendChild(c);
    addEventListener("mousemove", (e) => (c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`), true);
    addEventListener(
      "mousedown",
      (e) => {
        const r = document.createElement("div");
        Object.assign(r.style, {
          position: "fixed", left: `${e.clientX - 22}px`, top: `${e.clientY - 22}px`, width: "44px", height: "44px",
          borderRadius: "50%", border: "3px solid #9945FF", zIndex: "2147483646", pointerEvents: "none",
          transition: "transform .45s ease-out, opacity .45s ease-out", transform: "scale(.3)", opacity: "1",
        });
        document.documentElement.appendChild(r);
        requestAnimationFrame(() => {
          r.style.transform = "scale(1.4)";
          r.style.opacity = "0";
        });
        setTimeout(() => r.remove(), 500);
      },
      true,
    );
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", add);
  else add();
}

async function openScene(browser, signer) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  if (signer) {
    await context.exposeFunction("__lpSign", async (b64, send) => {
      const raw = Buffer.from(b64, "base64");
      let signed;
      try {
        const tx = Transaction.from(raw);
        tx.partialSign(signer);
        signed = tx.serialize();
      } catch {
        const vtx = VersionedTransaction.deserialize(raw);
        vtx.sign([signer]);
        signed = Buffer.from(vtx.serialize());
      }
      if (!send) return signed.toString("base64");
      return rpc.sendRawTransaction(signed, { preflightCommitment: "confirmed" });
    });
    await context.addInitScript(walletInit, {
      address: signer.publicKey.toBase58(),
      pubkey: Array.from(signer.publicKey.toBytes()),
    });
  }
  await context.addInitScript(cursorInit);
  const page = await context.newPage();
  return { context, page };
}

// ------------------------------------------------------------------ capture

async function capture(page, dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  const cdp = await page.context().newCDPSession(page);
  cdp.on("Page.screencastFrame", ({ data, sessionId }) => {
    const t = Date.now();
    const file = path.join(dir, `f${String(frames.length).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ t, file });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  return {
    frames,
    stop: () => cdp.send("Page.stopScreencast").catch(() => {}),
  };
}

/** Frames in [t0, t0 + seconds] -> constant 30 fps H.264 clip. */
function encode(frames, t0, seconds, file) {
  const end = t0 + seconds * 1000;
  let i = frames.findLastIndex((f) => f.t <= t0);
  if (i < 0) i = 0;
  const lines = [];
  for (let k = i; k < frames.length && frames[k].t < end; k++) {
    const from = Math.max(frames[k].t, t0);
    const to = Math.min(k + 1 < frames.length ? frames[k + 1].t : end, end);
    if (to <= from) continue;
    lines.push(`file '${frames[k].file.replace(/\\/g, "/")}'`, `duration ${((to - from) / 1000).toFixed(4)}`);
  }
  const last = lines.length - 2;
  lines.push(lines[last]); // concat demuxer needs the last file repeated
  const list = file.replace(/\.mp4$/, ".txt");
  fs.writeFileSync(list, lines.join("\n"));
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-vf", `fps=30,scale=${W}:${H},format=yuv420p`, "-t", seconds.toFixed(3),
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", file,
  ]);
}

// ------------------------------------------------------------------ helpers

let mouse = { x: W / 2, y: H / 2 };
async function moveTo(page, x, y, ms = 450) {
  const steps = Math.max(8, Math.round(ms / 16));
  const from = { ...mouse };
  for (let s = 1; s <= steps; s++) {
    const p = s / steps;
    const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(ms / steps);
  }
  mouse = { x, y };
}
async function click(page, locator, ms = 450) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  if (!b) throw new Error("not visible: " + locator);
  await moveTo(page, b.x + b.width / 2, b.y + b.height / 2, ms);
  await page.mouse.down();
  await sleep(60);
  await page.mouse.up();
}
async function type(page, locator, text, delay = 28) {
  await click(page, locator, 350);
  await locator.pressSequentially(text, { delay });
}
/** Smooth scroll so `y` is at the top, over `ms`. */
const smoothScroll = (page, y, ms) =>
  page.evaluate(
    ([y, ms]) =>
      new Promise((done) => {
        const y0 = scrollY;
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / ms);
          const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
          scrollTo(0, y0 + (y - y0) * e);
          p < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [y, ms],
  );
const scrollToEl = async (page, locator, offset = 140, ms = 700) => {
  const y = await locator.evaluate((el, off) => el.getBoundingClientRect().top + scrollY - off, offset);
  await smoothScroll(page, y, ms);
};
const waitText = (page, text, timeout = 20_000) => page.getByText(text).first().waitFor({ timeout });
const short = (k) => k.publicKey.toBase58();
/** The nav pills hide once the page is scrolled, so return to the top first. */
async function navClick(page, name) {
  await smoothScroll(page, 0, 450);
  await sleep(350);
  await click(page, page.getByRole("link", { name, exact: true }).first(), 450);
}
/** Load once to warm the cache, then show a black frame until the recorded load. */
async function warm(page, url) {
  await page.goto(url, { waitUntil: "load" });
  await sleep(1500);
  await page.goto("about:blank");
  await page.setContent('<html style="background:#000"></html>');
}

// ------------------------------------------------------------------ scenes

/** Each scene: prepare (not recorded), then act (recorded from t0). */
const scenes = {
  // 1. Hero
  1: {
    signer: null,
    prepare: (page) => warm(page, SITE),
    act: async (page) => {
      await page.goto(SITE, { waitUntil: "domcontentloaded" });
      await sleep(6500);
      await moveTo(page, 1300, 470, 1400);
      await sleep(1800);
      await moveTo(page, 760, 820, 1400);
      await sleep(9000);
    },
  },
  // 2. Pinned Buy / Resell / Settle
  2: {
    signer: null,
    prepare: async (page) => {
      await page.goto(SITE, { waitUntil: "load" });
      await sleep(1500);
      const top = await page.locator(".pin").evaluate((el) => el.getBoundingClientRect().top + scrollY);
      await page.evaluate((y) => scrollTo(0, y - 40), top);
      await sleep(1200);
    },
    act: async (page) => {
      const [top, height] = await page.locator(".pin").evaluate((el) => [el.getBoundingClientRect().top + scrollY, el.offsetHeight]);
      await sleep(700);
      await smoothScroll(page, top + (height - H) * 0.94, 15200);
      await sleep(1000);
    },
  },
  // 3. Issuer creates a plan with a logo (IPFS) — one transaction
  3: {
    signer: ISSUER,
    prepare: async (page) => {
      await page.goto(`${SITE}/issuer`, { waitUntil: "load" });
      await waitText(page, "Your plans");
      await page.locator("#name").waitFor();
      await page.evaluate(() => scrollTo(0, 210));
      await sleep(2500); // wallet connects, plans load
    },
    act: async (page) => {
      await sleep(500);
      await type(page, page.locator("#name"), PLAN.name, 30);
      await type(page, page.locator("#price"), PLAN.price, 60);
      await page.locator("#length").fill("");
      await type(page, page.locator("#length"), PLAN.length, 60);
      await page.locator('select[aria-label="Length unit"]').selectOption("minutes");
      await sleep(250);
      const chooser = page.waitForEvent("filechooser");
      await click(page, page.getByText("Choose image"), 400);
      await (await chooser).setFiles(path.join(DIR, "pulse-fitness.png"));
      await type(page, page.locator("#new-desc"), PLAN.description, 14);
      await click(page, page.getByRole("button", { name: "Create plan" }), 400);
      await waitText(page, `Create ${PLAN.name}: confirmed on Solana devnet.`, 25_000);
      await sleep(800);
      const card = page.locator("article", { hasText: PLAN.name }).first();
      await card.waitFor({ timeout: 15_000 });
      await scrollToEl(page, card, 260, 900);
      await moveTo(page, 1100, 700, 600);
    },
  },
  // 4. Buyer buys a pass, sees it in My Passes
  4: {
    signer: BUYER,
    prepare: async (page) => {
      await page.goto(`${SITE}/market`, { waitUntil: "load" });
      const card = page.locator("article", { hasText: PLAN.name }).filter({ hasText: "Buy pass" }).first();
      await card.waitFor({ timeout: 30_000 });
      const y = await card.evaluate((el) => el.getBoundingClientRect().top + scrollY - 260);
      await page.evaluate((y) => scrollTo(0, y), y);
      await sleep(2500);
    },
    act: async (page) => {
      await sleep(600);
      const card = page.locator("article", { hasText: PLAN.name }).filter({ hasText: "Buy pass" }).first();
      await click(page, card.getByRole("button", { name: "Buy pass" }), 700);
      await waitText(page, `Buy ${PLAN.name}: confirmed on Solana devnet.`, 25_000);
      await sleep(900);
      await navClick(page, "My Passes");
      const pass = page.locator("article.ticket", { hasText: PLAN.name }).first();
      await pass.waitFor({ timeout: 15_000 });
      await sleep(700);
      await scrollToEl(page, pass, 200, 800);
      await moveTo(page, 1250, 760, 600);
    },
  },
  // 5. Sell the remaining time; price falling on the market
  5: {
    signer: BUYER,
    prepare: async (page) => {
      await page.goto(`${SITE}/passes`, { waitUntil: "load" });
      const pass = page.locator("article.ticket", { hasText: PLAN.name }).first();
      await pass.waitFor({ timeout: 30_000 });
      const y = await pass.evaluate((el) => el.getBoundingClientRect().top + scrollY - 200);
      await page.evaluate((y) => scrollTo(0, y), y);
      await sleep(2000);
    },
    act: async (page) => {
      await sleep(700);
      const pass = page.locator("article.ticket", { hasText: PLAN.name }).first();
      await click(page, pass.getByRole("button", { name: "Sell remaining time" }), 600);
      await sleep(1300);
      await click(page, pass.getByRole("button", { name: /^Fair/ }), 500);
      await sleep(700);
      await click(page, pass.getByRole("button", { name: "List for sale" }), 450);
      await waitText(page, "List pass: confirmed on Solana devnet.", 25_000);
      await sleep(600);
      await navClick(page, "Market");
      const listing = page.locator("article.ticket", { hasText: PLAN.name }).first();
      await listing.waitFor({ timeout: 15_000 });
      await sleep(500);
      await scrollToEl(page, listing, 220, 800);
      await moveTo(page, 1300, 640, 500);
    },
  },
  // 6. Second buyer buys on resale; Verify access
  6: {
    signer: BUYER2,
    prepare: async (page) => {
      await page.goto(`${SITE}/market`, { waitUntil: "load" });
      const listing = page.locator("article.ticket", { hasText: PLAN.name }).first();
      await listing.waitFor({ timeout: 30_000 });
      const y = await listing.evaluate((el) => el.getBoundingClientRect().top + scrollY - 220);
      await page.evaluate((y) => scrollTo(0, y), y);
      await sleep(2000);
    },
    act: async (page) => {
      await sleep(500);
      const listing = page.locator("article.ticket", { hasText: PLAN.name }).first();
      await click(page, listing.getByRole("button", { name: "Buy", exact: true }), 600);
      await waitText(page, "Buy resale pass: confirmed on Solana devnet.", 25_000);
      await sleep(2300);
      await navClick(page, "Verify");
      await page.locator("#wallet").waitFor();
      await sleep(400);
      await page.locator("#plan").selectOption({ label: PLAN.name });
      await click(page, page.getByRole("button", { name: "Use my connected wallet" }), 450);
      await waitText(page, "Access granted", 10_000);
      await sleep(1800);
      await page.locator("#wallet").fill("");
      await type(page, page.locator("#wallet"), short(BUYER), 4);
      await click(page, page.getByRole("button", { name: "Check access" }), 400);
      await waitText(page, "Access denied", 10_000);
      await sleep(2000);
    },
  },
  // 7. Pass assistant + Liquidity AI
  7: {
    signer: BUYER2,
    prepare: async (page) => {
      await page.goto(`${SITE}/passes`, { waitUntil: "load" });
      await page.getByLabel("Message to the pass assistant").waitFor({ timeout: 30_000 });
      const y = await page.getByText("Pass assistant").first().evaluate((el) => el.getBoundingClientRect().top + scrollY - 160);
      await page.evaluate((y) => scrollTo(0, y), y);
      await sleep(1500);
    },
    act: async (page) => {
      await sleep(200);
      await type(page, page.getByLabel("Message to the pass assistant"), "I'm done with my Pulse pass, sell it at a fair price", 9);
      await click(page, page.getByRole("button", { name: "Ask", exact: true }), 250);
      await page.getByRole("button", { name: "Confirm & sign" }).waitFor({ timeout: 15_000 });
      await moveTo(page, mouse.x - 260, mouse.y + 120, 350); // point at the proposal
      await sleep(500);
      await click(page, page.getByRole("button", { name: "Open Liquidity AI" }), 450);
      await sleep(450);
      await click(page, page.getByRole("button", { name: "What's on resale right now?" }), 350);
      await sleep(5500);
    },
  },
  // 8. Close on the hero
  8: {
    signer: null,
    prepare: (page) => warm(page, SITE),
    act: async (page) => {
      await page.goto(SITE, { waitUntil: "domcontentloaded" });
      await sleep(7500);
    },
  },
};

async function runScene(browser, n) {
  const scene = scenes[n];
  const seconds = SCENES[n - 1];
  const { context, page } = await openScene(browser, scene.signer);
  mouse = { x: W / 2, y: H / 2 };
  try {
    await scene.prepare(page);
    const cap = await capture(page, path.join(OUT, `frames-${n}`));
    const t0 = Date.now();
    await scene.act(page);
    const used = (Date.now() - t0) / 1000;
    const remaining = seconds - used;
    if (remaining > 0) await sleep(remaining * 1000 + 300);
    await cap.stop();
    encode(cap.frames, t0, seconds, path.join(OUT, `scene-${n}.mp4`));
    console.log(`scene ${n}: actions took ${used.toFixed(1)}s of ${seconds}s${used > seconds ? "  (OVERRAN, end is cut)" : ""}, ${cap.frames.length} frames`);
  } finally {
    await context.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  fs.mkdirSync(OUT, { recursive: true });
  const which = process.argv.slice(2).map(Number).filter(Boolean);
  const list = which.length ? which : [1, 2, 3, 4, 5, 6, 7, 8];
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"] });
  try {
    for (const n of list) await runScene(browser, n);
  } finally {
    await browser.close();
  }
}
