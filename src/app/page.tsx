"use client";

import { vendors, getProductsByVendor } from "@/lib/data";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import { Shield, Zap, Store, CreditCard, ArrowRight, Star, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
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
              Visit different stores, add items to one universal cart, and check
              out in a single transaction. Every order step produces a typed
              claim envelope you can inspect.
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
                title: "Visit Stores",
                desc: "Browse 6 independent vendors. Each has its own identity, catalog, and brand.",
              },
              {
                icon: CreditCard,
                title: "One Cart, One Checkout",
                desc: "Add from any store. Pay once. Orders split and route to each vendor.",
              },
              {
                icon: Zap,
                title: "Claim-Tracked",
                desc: "Payment, confirmation, fulfillment — each step is a typed, inspectable claim envelope.",
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

      {/* Store Directory */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Browse Stores</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Visit a store, add items, then open your cart. It all goes in one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor, i) => {
            const productCount = getProductsByVendor(vendor.id).length;
            return (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href={`/vendors?id=${vendor.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/40 transition-all hover:border-white/15 hover:bg-zinc-900/70"
                >
                  {/* Color bar */}
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: vendor.accentColor }}
                  />

                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                          style={{ backgroundColor: `${vendor.accentColor}22` }}
                        >
                          {vendor.logo}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {vendor.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-0.5 text-amber-400">
                              <Star className="h-3 w-3 fill-current" />
                              <span className="text-[11px] font-medium">
                                {vendor.rating}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-600">
                              {productCount} products
                            </span>
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1" />
                    </div>

                    <p className="text-xs leading-relaxed text-zinc-400">
                      {vendor.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="font-mono text-[10px] text-zinc-600 truncate max-w-[200px]">
                        {vendor.verumDid}
                      </span>
                      <span
                        className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
                        style={{ color: vendor.accentColor }}
                      >
                        Visit Store
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
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
              Claim architecture powered by Verum Protocol
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
