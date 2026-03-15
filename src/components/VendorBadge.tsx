"use client";

import { Vendor } from "@/lib/types";
import Link from "next/link";

export default function VendorBadge({
  vendor,
  size = "md",
}: {
  vendor: Vendor;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { icon: "h-6 w-6 text-xs", text: "text-xs", gap: "gap-1.5" },
    md: { icon: "h-8 w-8 text-sm", text: "text-sm", gap: "gap-2" },
    lg: { icon: "h-10 w-10 text-base", text: "text-base", gap: "gap-2.5" },
  };

  const s = sizes[size];

  return (
    <Link
      href={`/vendors?id=${vendor.id}`}
      className={`inline-flex items-center ${s.gap} rounded-xl border border-white/[0.06] bg-zinc-900/50 px-3 py-2 transition-all hover:border-white/10 hover:bg-zinc-900`}
    >
      <span
        className={`flex items-center justify-center rounded-lg ${s.icon}`}
        style={{ backgroundColor: `${vendor.accentColor}22` }}
      >
        {vendor.logo}
      </span>
      <span className={`font-semibold text-white ${s.text}`}>
        {vendor.name}
      </span>
    </Link>
  );
}
