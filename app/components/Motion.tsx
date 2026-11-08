"use client";

import { useEffect } from "react";

/**
 * One tiny motion engine for the whole site.
 *
 * - `[data-reveal]` elements get `data-in` the first time they enter the
 *   viewport (used for fade-ups and letter-by-letter headings).
 * - `[data-scroll]` elements get CSS variables updated on every scroll frame:
 *     --p  progress through the viewport, 0 (just below) → 1 (just above)
 *     --e  entrance, 0 (top edge at the bottom of the screen) → 1 (top edge at 25%)
 *   `data-scroll="pin"` instead reports progress through a tall pinned section,
 *   and `data-scroll="track"` also publishes --shift, the distance its first
 *   child can slide sideways.
 * Respects prefers-reduced-motion by revealing everything and not scrubbing.
 */
export default function Motion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) document.documentElement.classList.add("motion-ready");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    let scrollEls: HTMLElement[] = [];
    const seen = new WeakSet<Element>();

    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-in])").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (reduce) return el.setAttribute("data-in", "");
        // Already on screen when it appears (e.g. the hero's buttons on a short
        // laptop screen): play its entrance now. The observer alone would miss
        // it, because its 48px starting offset can sit below the trigger line.
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top - 48 < window.innerHeight) {
          requestAnimationFrame(() => requestAnimationFrame(() => el.setAttribute("data-in", "")));
        } else io.observe(el);
      });
      scrollEls = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll]"));
      frame();
    };

    let raf = 0;
    const frame = () => {
      raf = 0;
      if (reduce) return;
      const vh = window.innerHeight;
      for (const el of scrollEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        const mode = el.dataset.scroll;
        let p: number;
        if (mode === "pin") {
          p = -r.top / Math.max(1, r.height - vh);
        } else {
          p = (vh - r.top) / (vh + r.height);
        }
        p = Math.min(1, Math.max(0, p));
        const e = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
        el.style.setProperty("--p", p.toFixed(4));
        el.style.setProperty("--e", e.toFixed(4));
        if (mode === "track") {
          const child = el.firstElementChild as HTMLElement | null;
          if (child) el.style.setProperty("--shift", `${Math.max(0, child.scrollWidth - el.clientWidth)}px`);
        }
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    let pending = 0;
    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        scan();
      }, 60);
    });

    scan();
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (pending) clearTimeout(pending);
    };
  }, []);

  return null;
}
