"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function writeClipboard(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  document.body.append(area);
  area.focus();
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => undefined);
  }
  return ok;
}

export function CopyButton({ text }: { text: string }) {
  const [label, setLabel] = useState("Copy");

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      aria-label={label}
      onClick={() => {
        const next = writeClipboard(text) ? "Copied" : "Select the text";
        setLabel(next);
        window.setTimeout(() => setLabel("Copy"), 1600);
      }}
    >
      {label}
    </Button>
  );
}
