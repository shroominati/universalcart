"use client";

import { Product } from "@/lib/types";
import { getVendor } from "@/lib/data";
import { useCartStore } from "@/lib/store";
import { ShoppingCart, Check, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function ProductCard({ product }: { product: Product }) {
  const vendor = getVendor(product.vendorId);
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/50 transition-all hover:border-white/10 hover:bg-zinc-900/80"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-800">
        {/* Product URLs are dynamic; keep native img rendering here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {vendor && (
          <div
            className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md"
            style={{ backgroundColor: `${vendor.accentColor}cc` }}
          >
            <span>{vendor.logo}</span>
            {vendor.name}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center gap-0.5 text-amber-400">
            <Star className="h-3 w-3 fill-current" />
            <span className="text-xs font-medium">{product.rating}</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-zinc-400 line-clamp-2">
          {product.description}
        </p>

        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="text-lg font-bold text-white">
            ${product.price.toFixed(2)}
          </span>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAdd}
            disabled={added}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              added
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-indigo-500 text-white hover:bg-indigo-400"
            }`}
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Added
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                Add
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
