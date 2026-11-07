"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

/**
 * Wraps every page in a view transition keyed by the route, so a navigation
 * plays the old page falling away and the new one flying in (see globals.css).
 * Inner pages sit on one white sheet; the home page lays out its own sheets.
 */
export default function PageFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <ViewTransition key={path} enter="page-in" exit="page-out" default="none">
      {path === "/" ? (
        <div>{children}</div>
      ) : (
        <section className="sheet page rise">
          <div className="max-w-[1180px] mx-auto px-5 sm:px-10 pt-[104px] sm:pt-[120px] pb-24">{children}</div>
        </section>
      )}
    </ViewTransition>
  );
}
