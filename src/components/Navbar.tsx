"use client";

import Link from "next/link";
import { ShoppingCart, Package, Shield, Menu, X, FlaskConical, Terminal, Radio } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { getVerumMode, VERUM_MODE_DISPLAY } from "@/lib/verum";
import type { VerumMode } from "@/lib/verum";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const modeIcons: Record<VerumMode, typeof Shield> = {
  mock: FlaskConical,
  cli: Terminal,
  mcp: Radio,
};

const modeColors: Record<VerumMode, string> = {
  mock: "text-amber-400 bg-amber-500/10",
  cli: "text-emerald-400 bg-emerald-500/10",
  mcp: "text-indigo-400 bg-indigo-500/10",
};

export default function Navbar() {
  const { getCartCount, toggleCart } = useCartStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = getCartCount();
  const mode = getVerumMode();
  const display = VERUM_MODE_DISPLAY[mode];
  const ModeIcon = modeIcons[mode];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Universal<span className="text-indigo-400">Cart</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Shop
          </Link>
          <Link
            href="/orders"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Package className="h-4 w-4" />
            Orders
          </Link>
          <div
            className={`ml-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${modeColors[mode]}`}
            title={display.description}
          >
            <ModeIcon className="h-4 w-4" />
            {display.label}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleCart}
            className="relative rounded-lg p-2 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ShoppingCart className="h-5 w-5" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-bold text-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-zinc-300 transition-colors hover:bg-white/5 sm:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 sm:hidden"
          >
            <div className="flex flex-col gap-1 p-3">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5"
              >
                Shop
              </Link>
              <Link
                href="/orders"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5"
              >
                <Package className="h-4 w-4" />
                Orders
              </Link>
              <div
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium ${modeColors[mode]}`}
              >
                <ModeIcon className="h-4 w-4" />
                {display.label}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
