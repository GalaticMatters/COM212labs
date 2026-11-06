"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Blocks, type Filter } from "@/components/blocks";
import { Topology } from "@/components/topology";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { steps } from "@/lib/guide";
import type { LabFileKey } from "@/lib/targets";

const STORAGE_KEY = "com212-web-lab-v1";

type Bench = {
  checks: Record<string, boolean>;
  ubuntuIp: string;
  kaliIp: string;
};

const emptyBench: Bench = { checks: {}, ubuntuIp: "", kaliIp: "" };

let benchCache: Bench = emptyBench;
let benchRaw = "";

function parseBench(raw: string): Bench {
  if (!raw) return emptyBench;
  try {
    const parsed = JSON.parse(raw) as Partial<Bench>;
    return {
      checks: parsed.checks ?? {},
      ubuntuIp: parsed.ubuntuIp ?? "",
      kaliIp: parsed.kaliIp ?? "",
    };
  } catch {
    return emptyBench;
  }
}

function readBench(): Bench {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "";
  if (raw === benchRaw) return benchCache;
  benchRaw = raw;
  benchCache = parseBench(raw);
  return benchCache;
}

function writeBench(value: Bench) {
  const raw = JSON.stringify(value);
  localStorage.setItem(STORAGE_KEY, raw);
  benchRaw = raw;
  benchCache = value;
}

function subscribeBench(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

const nav = [
  { id: "overview", label: "Overview" },
  { id: "bench", label: "Addresses" },
  ...steps.map((step) => ({
    id: step.id,
    label: step.n ? `${step.n}. ${step.title}` : step.title,
  })),
];

function ipv4Hint(value: string) {
  if (!value.trim()) return "";
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value.trim())) return "";
  return "Use the IPv4 address from ip addr: four numbers separated by dots.";
}

export function LabManual({ files }: { files: Record<LabFileKey, string> }) {
  const stored = useSyncExternalStore(subscribeBench, readBench, () => emptyBench);
  const [override, setOverride] = useState<Bench | null>(null);
  const bench = override ?? stored;
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState("overview");

  function setBench(next: Bench | ((current: Bench) => Bench)) {
    const value = typeof next === "function" ? next(bench) : next;
    writeBench(value);
    setOverride(value);
  }

  useEffect(() => {
    const nodes = nav
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => node !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const counted = steps.filter((step) => step.n);
  const done = counted.filter((step) => bench.checks[step.id]).length;

  function toggle(id: string, checked: boolean) {
    setBench((current) => ({
      ...current,
      checks: { ...current.checks, [id]: checked },
    }));
  }

  return (
    <div className="lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="no-print hidden lg:block">
        <nav
          aria-label="Lab steps"
          className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-5"
        >
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            {done} of {counted.length} checked
          </p>
          <ol className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={active === item.id ? "true" : undefined}
                  className={`block rounded-md px-2 py-1.5 text-sm leading-5 ${
                    active === item.id
                      ? "bg-ink text-paper"
                      : "text-ink/80 hover:bg-ink/5"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

      <div className="min-w-0">
        <div className="no-print sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 lg:px-8">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger
                  render={<Button variant="outline" size="sm" className="lg:hidden" />}
                >
                  Steps
                </SheetTrigger>
                <SheetContent side="left" className="w-80 bg-background">
                  <SheetHeader>
                    <SheetTitle>Steps</SheetTitle>
                  </SheetHeader>
                  <nav aria-label="Lab steps" className="overflow-y-auto px-4 pb-6">
                    <ol className="space-y-1">
                      {nav.map((item) => (
                        <li key={item.id}>
                          <SheetClose
                            render={
                              <a
                                href={`#${item.id}`}
                                className="block rounded-md px-2 py-1.5 text-sm hover:bg-ink/5"
                              />
                            }
                          >
                            {item.label}
                          </SheetClose>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </SheetContent>
              </Sheet>
              <p className="text-sm text-muted-foreground lg:hidden">
                {done} of {counted.length} steps checked
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tabs
                value={filter}
                onValueChange={(value) => setFilter((value as Filter) ?? "all")}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="ubuntu">Ubuntu</TabsTrigger>
                  <TabsTrigger value="kali">Kali</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBench((current) => ({ ...current, checks: {} }))}
              >
                Reset checks
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-8 lg:px-8 lg:py-10">
          <section id="overview" className="scroll-mt-32">
            <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-oxide uppercase">
              example.com on the bench
            </p>
            <h1 className="mt-2 font-heading text-4xl leading-[1.05] text-ink sm:text-5xl">
              Serve a local site from Ubuntu. Open it on Kali.
            </h1>
            <div className="mt-4 space-y-3 text-[1.05rem] leading-7">
              <p>
                Ubuntu and Kali already share the interface <code className="font-mono text-[0.92em]">veth-peer</code>. Ubuntu is already Kali’s DNS server, via dnsmasq. You will add one web site and one DNS name.
              </p>
              <p>
                When you are done, <code className="font-mono text-[0.92em]">http://example.com</code> on Kali shows North Pier Provisions, and the Apache log on Ubuntu shows Kali’s address.
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card px-3 py-3">
                <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Already in place
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6">
                  <li>veth-peer on Ubuntu and on Kali</li>
                  <li>dnsmasq on Ubuntu, answering Kali</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-3">
                <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  You will add
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6">
                  <li>Apache, listening on port 80</li>
                  <li>A virtual host named example.com</li>
                  <li>A dnsmasq record for that name</li>
                </ul>
              </div>
            </div>
            <div className="mt-5">
              <Topology />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Run Ubuntu commands on Ubuntu and Kali commands on Kali. The filter above hides the other machine. Checks stay in this browser only. Nothing here logs into your VMs. The site preview shows the pages before you copy them.
            </p>
          </section>

          <section id="bench" className="scroll-mt-32 rounded-lg border border-border bg-card px-4 py-4">
            <h2 className="font-heading text-2xl">Addresses from step 1</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Record them when the printf lines run. The hand-in compares these with dig and the access log. The shell commands still use your own variables. These boxes do not rewrite them.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">Ubuntu veth-peer</span>
                <Input
                  value={bench.ubuntuIp}
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="decimal"
                  placeholder="10.212.0.1"
                  className="mt-1 font-mono"
                  onChange={(event) =>
                    setBench((current) => ({ ...current, ubuntuIp: event.target.value }))
                  }
                />
                <span className="mt-1 block text-xs text-oxide">{ipv4Hint(bench.ubuntuIp)}</span>
              </label>
              <label className="block text-sm">
                <span className="font-medium">Kali veth-peer</span>
                <Input
                  value={bench.kaliIp}
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="decimal"
                  placeholder="10.212.0.2"
                  className="mt-1 font-mono"
                  onChange={(event) =>
                    setBench((current) => ({ ...current, kaliIp: event.target.value }))
                  }
                />
                <span className="mt-1 block text-xs text-oxide">{ipv4Hint(bench.kaliIp)}</span>
              </label>
            </div>
          </section>

          {steps.map((step) => (
            <section key={step.id} id={step.id} className="scroll-mt-32">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {step.n ? (
                  <Badge className="bg-oxide text-paper">Step {step.n}</Badge>
                ) : (
                  <Badge variant="outline">Reference</Badge>
                )}
                <Badge variant="secondary">{step.layer}</Badge>
              </div>
              <h2 className="font-heading text-3xl leading-tight">{step.title}</h2>
              <p className="mt-2 text-[1.02rem] leading-7">{step.goal}</p>
              <div className="mt-4">
                <Blocks blocks={step.blocks} files={files} filter={filter} />
              </div>
              {step.id === "handin" ? (
                <dl className="mt-4 grid gap-3 rounded-lg border border-border bg-card px-3 py-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Ubuntu address you recorded</dt>
                    <dd className="font-mono text-base">{bench.ubuntuIp.trim() || "Not recorded yet"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Kali address you recorded</dt>
                    <dd className="font-mono text-base">{bench.kaliIp.trim() || "Not recorded yet"}</dd>
                  </div>
                </dl>
              ) : null}
              {step.n ? (
                <label className="mt-4 flex items-start gap-3 text-sm leading-6">
                  <Checkbox
                    className="mt-1"
                    checked={Boolean(bench.checks[step.id])}
                    onCheckedChange={(checked) => toggle(step.id, checked === true)}
                  />
                  <span>This step matches the expected result</span>
                </label>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
