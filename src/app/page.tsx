"use client";

import { useState } from "react";
import { products, vendors } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import VendorFilter from "@/components/VendorFilter";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import { Shield, Zap, Store, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  const filtered = selectedVendor
    ? products.filter((p) => p.vendorId === selectedVendor)
    : products;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1">
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">
                Powered by Verum Protocol
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Shop everywhere.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Checkout once.
              </span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-zinc-400">
              Add items from multiple vendors into a single cart and process
              everything in one shot. Every transaction step is cryptographically
              signed and verified through the Verum protocol — no trust
              required, only proof.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12 grid gap-4 sm:grid-cols-3"
          >
            {[
              {
                icon: Store,
                title: "Multi-Vendor Cart",
                desc: "Browse products from 6+ vendors. One cart holds them all.",
              },
              {
                icon: CreditCard,
                title: "Single Checkout",
                desc: "Pay once. We split and route orders to each vendor automatically.",
              },
              {
                icon: Zap,
                title: "Verum Verified",
                desc: "Every step — payment, confirmation, fulfillment — is a signed claim.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5"
              >
                <card.icon className="mb-3 h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">
                  {card.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {card.desc}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Vendor Showcase */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Featured Vendors
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {vendors.map((vendor) => (
              <button
                key={vendor.id}
                onClick={() =>
                  setSelectedVendor(
                    selectedVendor === vendor.id ? null : vendor.id
                  )
                }
                className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                  selectedVendor === vendor.id
                    ? "border-indigo-500/30 bg-indigo-500/5"
                    : "border-white/[0.06] bg-zinc-900/30 hover:border-white/10 hover:bg-zinc-900/60"
                }`}
              >
                <span className="text-2xl">{vendor.logo}</span>
                <span className="text-xs font-semibold text-zinc-300 text-center">
                  {vendor.name}
                </span>
                <div className="flex items-center gap-1 text-amber-400">
                  <span className="text-[10px] font-medium">
                    {vendor.rating}
                  </span>
                  <span className="text-[10px]">★</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">All Products</h2>
            <p className="text-sm text-zinc-500">
              {filtered.length} items
              {selectedVendor
                ? ` from ${vendors.find((v) => v.id === selectedVendor)?.name}`
                : " across all vendors"}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <VendorFilter
            selected={selectedVendor}
            onSelect={setSelectedVendor}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white">
                Universal<span className="text-indigo-400">Cart</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              <Shield className="h-3 w-3" />
              Transactions verified by Verum Protocol
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
