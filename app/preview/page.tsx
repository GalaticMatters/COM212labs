import type { Metadata } from "next";
import Link from "next/link";
import { GuideHeader } from "@/components/guide-header";

export const metadata: Metadata = {
  title: "Site preview",
  description: "North Pier Provisions, the example.com site Kali should load from Apache.",
};

export default function PreviewPage() {
  return (
    <>
      <GuideHeader current="preview" />
      <main id="overview" className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-oxide uppercase">
          Document root
        </p>
        <h1 className="mt-2 font-heading text-4xl leading-tight">
          North Pier Provisions
        </h1>
        <p className="mt-3 max-w-2xl text-[1.05rem] leading-7">
          This is the site you copy to <code className="font-mono text-[0.92em]">/var/www/example.com/public</code>.
          The frame serves those files from this guide so you can read them before the lab.
          Kali does not use this frame. Kali loads <code className="font-mono text-[0.92em]">http://example.com</code> from Apache on Ubuntu.
        </p>
        <div className="mt-6 overflow-hidden rounded-lg border border-ink/15 bg-[#2a241f] shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="size-2.5 rounded-full bg-[#a24d2e]" />
            <span className="size-2.5 rounded-full bg-[#c6a15b]" />
            <span className="size-2.5 rounded-full bg-[#1d4740]" />
            <p className="ml-2 truncate rounded bg-black/30 px-3 py-1 font-mono text-xs text-[#f3ecdf]">
              http://example.com/
            </p>
          </div>
          <iframe
            title="North Pier Provisions, the example.com lab site"
            src="/example-site/index.html"
            className="h-[780px] w-full bg-[#f3ecdf]"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          If the frame is blank, open{" "}
          <Link className="underline decoration-oxide underline-offset-4" href="/example-site/index.html">
            the site files
          </Link>{" "}
          directly. A page titled Example Domain is not this preview.
        </p>
      </main>
    </>
  );
}
