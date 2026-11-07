"use client";

import { usePathname } from "next/navigation";

/** Inner pages sit on one white sheet; the home page lays out its own sheets. */
export default function PageFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/") return <>{children}</>;
  return (
    <section className="sheet page">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-10 pt-[104px] sm:pt-[120px] pb-24">{children}</div>
    </section>
  );
}
