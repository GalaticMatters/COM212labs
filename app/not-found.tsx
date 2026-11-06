import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-heading text-3xl">That page isn’t in the lab</h1>
      <p className="mt-3">
        <Link href="/" className="underline underline-offset-4">
          Back to the guide
        </Link>
      </p>
    </main>
  );
}
