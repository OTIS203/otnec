"use client";

import { useEffect, useState } from "react";

export function ClientTime({
  isoString,
  format = "time",
}: {
  isoString: string;
  format?: "time" | "datetime" | "date";
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className="opacity-40">--:--</span>;
  }

  try {
    const d = new Date(isoString);
    if (format === "time") {
      return <span>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
    }
    if (format === "date") {
      return <span>{d.toLocaleDateString([], { dateStyle: "medium" })}</span>;
    }
    return <span>{d.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>;
  } catch {
    return <span>{isoString}</span>;
  }
}

