import Link from "next/link";

export function GuideHeader({ current }: { current: "guide" | "preview" }) {
  const linkClass = (on: boolean) =>
    on
      ? "bg-paper text-ink"
      : "text-paper/80 hover:bg-white/10 hover:text-paper";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-paper">
      <a
        href="#overview"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-paper focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to the lab
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="min-w-0">
          <p className="text-[0.68rem] font-medium tracking-[0.18em] text-oxide uppercase">
            COM212
          </p>
          <p className="truncate font-heading text-xl leading-none">Web server lab</p>
        </Link>
        <nav aria-label="Guide" className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            aria-current={current === "guide" ? "page" : undefined}
            className={`rounded-md px-2.5 py-1.5 ${linkClass(current === "guide")}`}
          >
            Guide
          </Link>
          <Link
            href="/preview"
            aria-current={current === "preview" ? "page" : undefined}
            className={`rounded-md px-2.5 py-1.5 ${linkClass(current === "preview")}`}
          >
            Site preview
          </Link>
        </nav>
      </div>
    </header>
  );
}
