"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-oxide uppercase">
        COM212
      </p>
      <h1 className="mt-2 font-heading text-3xl">The guide didn’t load</h1>
      <p className="mt-3 leading-7">
        The lab steps or the site files under <code className="font-mono">lab/</code> could not be read. Reload the page. If you just cloned the repo, confirm <code className="font-mono">lab/site</code> is present and start the dev server again.
      </p>
      <Button type="button" className="mt-5" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
