"use client";

import { RichText } from "@/components/rich-text";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Block, Machine } from "@/lib/guide";
import {
  FILE_TARGETS,
  SITE_FILE_KEYS,
  teeCommand,
  type LabFileKey,
} from "@/lib/targets";

export type Filter = "all" | "ubuntu" | "kali";

function machineVisible(machine: Machine, filter: Filter) {
  if (filter === "all" || machine === "either") return true;
  return machine === filter;
}

function machineLabel(machine: Machine) {
  if (machine === "ubuntu") return "Ubuntu";
  if (machine === "kali") return "Kali";
  return "Either";
}

function machineClass(machine: Machine) {
  if (machine === "ubuntu") return "bg-oxide text-paper";
  if (machine === "kali") return "bg-sea text-paper";
  return "bg-paper text-ink";
}

function fileKeys(which: "site" | "apache" | "dnsmasq"): LabFileKey[] {
  if (which === "site") return [...SITE_FILE_KEYS];
  if (which === "apache") return ["apache/example.com.conf"];
  return ["dnsmasq/example.com.conf"];
}

export function Blocks({
  blocks,
  files,
  filter,
}: {
  blocks: Block[];
  files: Record<LabFileKey, string>;
  filter: Filter;
}) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} files={files} filter={filter} />
      ))}
    </div>
  );
}

function BlockView({
  block,
  files,
  filter,
}: {
  block: Block;
  files: Record<LabFileKey, string>;
  filter: Filter;
}) {
  if (block.kind === "p") {
    return (
      <p className="text-[1.02rem] leading-7 text-ink/90">
        <RichText text={block.text} />
      </p>
    );
  }

  if (block.kind === "ul") {
    return (
      <ul className="list-disc space-y-2 pl-5 text-[1.02rem] leading-7">
        {block.items.map((item) => (
          <li key={item}>
            <RichText text={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "command") {
    if (!machineVisible(block.machine, filter)) return null;
    return (
      <div className="overflow-hidden rounded-lg border border-ink/15 bg-[#241e1a] text-[#f6f0e6]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Badge className={machineClass(block.machine)}>
              {machineLabel(block.machine)}
            </Badge>
            <span className="truncate text-sm">{block.title}</span>
          </div>
          <CopyButton text={block.code} label="Copy command" />
        </div>
        {block.note ? (
          <p className="px-3 pt-2 text-xs leading-5 text-[#efd3b8]">{block.note}</p>
        ) : null}
        <pre className="overflow-x-auto px-3 py-3 font-mono text-[0.82rem] leading-6 whitespace-pre-wrap">
          {block.code}
        </pre>
      </div>
    );
  }

  if (block.kind === "expect") {
    return (
      <div className="rounded-lg border border-moss/30 bg-moss/10 px-3 py-3">
        <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-moss uppercase">
          Expected
        </p>
        <pre className="mt-1 font-mono text-[0.82rem] leading-6 whitespace-pre-wrap text-ink">
          {block.text}
        </pre>
      </div>
    );
  }

  if (block.kind === "callout") {
    const tone = {
      note: "border-sea/40 bg-sea/8",
      warning: "border-oxide/50 bg-oxide/8",
      ok: "border-moss/40 bg-moss/10",
    }[block.tone];
    return (
      <aside className={`rounded-lg border px-3 py-3 ${tone}`}>
        <p className="font-medium">{block.title}</p>
        <p className="mt-1 text-sm leading-6">
          <RichText text={block.text} />
        </p>
      </aside>
    );
  }

  if (block.kind === "table") {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              {block.headers.map((header) => (
                <th key={header} className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row[0]} className="border-t border-border odd:bg-card">
                {row.map((cell, cellIndex) => (
                  <td key={`${row[0]}-${cellIndex}`} className="px-3 py-2 align-top leading-6">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.kind === "files") {
    if (filter === "kali") {
      return (
        <p className="text-sm text-muted-foreground">
          These files are written on Ubuntu. Switch the bench filter to All or Ubuntu.
        </p>
      );
    }
    const keys = fileKeys(block.keys);
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {block.keys === "dnsmasq" ? (
          <p className="border-b border-border bg-oxide/10 px-3 py-2 text-sm leading-6">
            Reference only. This copy uses 10.212.0.1. The command in this step writes the address you measured. Do not paste this file over that one unless the address is actually yours.
          </p>
        ) : (
          <p className="border-b border-border px-3 py-2 text-sm leading-6 text-muted-foreground">
            Copy each command onto Ubuntu. It creates the file with sudo tee.
          </p>
        )}
        {keys.map((key) => {
          const contents = files[key];
          const target = FILE_TARGETS[key];
          const command =
            block.keys === "dnsmasq" ? contents : teeCommand(target, contents ?? "");
          return (
            <Collapsible key={key} className="border-b border-border last:border-b-0">
              <div className="flex items-center gap-2 px-3 py-2">
                <CollapsibleTrigger className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-mono text-xs">{target}</span>
                  <span className="block text-xs text-muted-foreground">lab/{key}</span>
                </CollapsibleTrigger>
                <CopyButton
                  text={command}
                  label={block.keys === "dnsmasq" ? "Copy file" : "Copy command"}
                />
              </div>
              <CollapsibleContent>
                <pre className="max-h-80 overflow-auto border-t border-border bg-paper px-3 py-3 font-mono text-xs leading-5 whitespace-pre-wrap">
                  {contents ?? "This file is missing from the lab folder."}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  }

  return (
    <Collapsible className="rounded-lg border border-dashed border-oxide/40">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium">
        <span>{block.title}</span>
        <span className="text-xs font-normal text-muted-foreground">Open</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-3 py-3">
        <Blocks blocks={block.blocks} files={files} filter={filter} />
      </CollapsibleContent>
    </Collapsible>
  );
}
