import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-oxide uppercase">
        COM212
      </p>
      <h1 className="mt-2 font-heading text-3xl">That page isn’t in the lab</h1>
      <p className="mt-3 leading-7">
        The guide and the example.com preview are the two pages here. A missing path on the real Apache site is a different 404, served by the virtual host.
      </p>
      <p className="mt-4 flex gap-4 text-sm">
        <Link href="/" className="underline decoration-oxide underline-offset-4">
          Back to the guide
        </Link>
        <Link href="/preview" className="underline decoration-oxide underline-offset-4">
          Site preview
        </Link>
      </p>
    </main>
  );
}
