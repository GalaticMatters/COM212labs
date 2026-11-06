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
      <h1 className="font-heading text-3xl">The guide didn’t load</h1>
      <Button type="button" className="mt-5" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
