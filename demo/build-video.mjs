/**
 * Joins out/scene-1..8.mp4 and voiceover.mp3 into out/liquid-pass-demo.mp4
 * (1920x1080, 30 fps, H.264 + AAC), with a short fade in and out.
 *
 *   node build-video.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FFMPEG, SCENES } from "./record-demo.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "out");
const list = path.join(OUT, "scenes.txt");
fs.writeFileSync(list, SCENES.map((_, i) => `file '${path.join(OUT, `scene-${i + 1}.mp4`).replace(/\\/g, "/")}'`).join("\n"));

const total = SCENES.reduce((a, b) => a + b, 0);
const fadeOut = (total - 0.6).toFixed(2);
const file = path.join(OUT, "liquid-pass-demo.mp4");
execFileSync(FFMPEG, [
  "-y", "-loglevel", "error",
  "-f", "concat", "-safe", "0", "-i", list,
  "-i", path.join(DIR, "voiceover.mp3"),
  "-filter_complex",
  `[0:v]scale=in_range=pc:out_range=tv,format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=${fadeOut}:d=0.6[v];[1:a]afade=t=out:st=${fadeOut}:d=0.6,apad[a]`,
  "-map", "[v]", "-map", "[a]", "-t", total.toFixed(3),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
  "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
  file,
]);
console.log("wrote", file, (fs.statSync(file).size / 1e6).toFixed(1), "MB,", total.toFixed(1), "s");
