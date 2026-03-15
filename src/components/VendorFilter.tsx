"use client";

import { vendors } from "@/lib/data";
import { motion } from "framer-motion";

export default function VendorFilter({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
          selected === null
            ? "bg-white text-zinc-900"
            : "border border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
        }`}
      >
        All Vendors
      </button>
      {vendors.map((vendor) => (
        <motion.button
          key={vendor.id}
          whileTap={{ scale: 0.97 }}
          onClick={() =>
            onSelect(selected === vendor.id ? null : vendor.id)
          }
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
            selected === vendor.id
              ? "text-white"
              : "border border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
          }`}
          style={
            selected === vendor.id
              ? { backgroundColor: vendor.accentColor }
              : undefined
          }
        >
          <span>{vendor.logo}</span>
          {vendor.name}
        </motion.button>
      ))}
    </div>
  );
}
