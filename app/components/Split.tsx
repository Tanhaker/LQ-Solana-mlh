import { Fragment } from "react";

/**
 * Splits a line of text into letters that rise in one after another, from
 * light grey to full ink, the first time the line scrolls into view.
 * Words stay unbroken so lines still wrap naturally.
 */
export default function Split({
  text,
  className = "",
  delay = 0,
  step = 32,
}: {
  text: string;
  className?: string;
  /** Delay before the first letter, in ms. */
  delay?: number;
  /** Delay between letters, in ms. */
  step?: number;
}) {
  let i = 0;
  const words = text.split(" ");
  return (
    <span className={`split ${className}`} data-reveal>
      <span className="sr-only">{text}</span>
      {words.map((w, wi) => (
        <Fragment key={wi}>
          <span className="split-word" aria-hidden>
            {Array.from(w).map((ch, ci) => {
              const d = delay + i++ * step;
              return (
                <span key={ci} className="ch" style={{ transitionDelay: `${d}ms, ${d}ms, ${d + 140}ms` }}>
                  {ch}
                </span>
              );
            })}
          </span>
          {wi < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
