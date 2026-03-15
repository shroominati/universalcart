"use client";

import { useCartStore } from "@/lib/store";
import { getVendor } from "@/lib/data";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import VerumBadge from "@/components/VerumBadge";
import {
  Shield,
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CheckoutPhase = "review" | "processing" | "verifying" | "complete";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getItemsByVendor, getCartTotal, checkout } = useCartStore();
  const [phase, setPhase] = useState<CheckoutPhase>("review");
  const [order, setOrder] = useState<ReturnType<typeof checkout> | null>(null);

  const vendorGroups = getItemsByVendor();
  const total = getCartTotal();

  const handleCheckout = async () => {
    setPhase("processing");
    await new Promise((r) => setTimeout(r, 1500));

    setPhase("verifying");
    await new Promise((r) => setTimeout(r, 2000));

    const newOrder = checkout();
    setOrder(newOrder);
    setPhase("complete");
  };

  if (items.length === 0 && phase === "review") {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <CartDrawer />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
          <div className="rounded-full bg-zinc-900 p-5">
            <CreditCard className="h-8 w-8 text-zinc-600" />
          </div>
          <h1 className="text-xl font-bold text-white">Cart is empty</h1>
          <p className="text-sm text-zinc-500">
            Add items from any vendor to get started
          </p>
          <Link
            href="/"
            className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <CartDrawer />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <AnimatePresence mode="wait">
          {phase === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Link
                href="/"
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Continue Shopping
              </Link>

              <h1 className="mb-2 text-3xl font-bold text-white">Checkout</h1>
              <p className="mb-8 text-sm text-zinc-500">
                Review your universal cart — {items.length} item
                {items.length > 1 ? "s" : ""} from {vendorGroups.size} vendor
                {vendorGroups.size > 1 ? "s" : ""}
              </p>

              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="flex flex-col gap-4">
                  {Array.from(vendorGroups.entries()).map(
                    ([vendorId, vendorItems]) => {
                      const vendor = getVendor(vendorId);
                      const subtotal = vendorItems.reduce(
                        (sum, i) => sum + i.product.price * i.quantity,
                        0
                      );

                      return (
                        <div
                          key={vendorId}
                          className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden"
                        >
                          <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                                style={{
                                  backgroundColor: `${vendor?.accentColor}22`,
                                }}
                              >
                                {vendor?.logo}
                              </span>
                              <span className="text-sm font-semibold text-white">
                                {vendor?.name}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-zinc-300">
                              ${subtotal.toFixed(2)}
                            </span>
                          </div>

                          <div className="divide-y divide-white/5">
                            {vendorItems.map((item) => (
                              <div
                                key={item.product.id}
                                className="flex items-center gap-4 px-5 py-3"
                              >
                                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                                  <img
                                    src={item.product.image}
                                    alt={item.product.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">
                                    {item.product.name}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    Qty: {item.quantity}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-white">
                                  $
                                  {(
                                    item.product.price * item.quantity
                                  ).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="lg:sticky lg:top-24 h-fit">
                  <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">
                      Order Summary
                    </h3>

                    <div className="flex flex-col gap-2 text-sm">
                      {Array.from(vendorGroups.entries()).map(
                        ([vendorId, vendorItems]) => {
                          const vendor = getVendor(vendorId);
                          const subtotal = vendorItems.reduce(
                            (sum, i) => sum + i.product.price * i.quantity,
                            0
                          );
                          return (
                            <div
                              key={vendorId}
                              className="flex justify-between"
                            >
                              <span className="text-zinc-500">
                                {vendor?.name}
                              </span>
                              <span className="text-zinc-300">
                                ${subtotal.toFixed(2)}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div className="my-4 h-px bg-white/5" />

                    <div className="flex items-center justify-between text-lg font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-white">${total.toFixed(2)}</span>
                    </div>

                    <div className="mt-4 rounded-xl bg-indigo-500/10 p-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-indigo-400" />
                        <span className="text-xs font-semibold text-indigo-300">
                          Verum Verification
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-indigo-400/70 leading-relaxed">
                        Each vendor order will generate a cryptographic claim
                        chain: payment intent → vendor confirmation →
                        fulfillment → delivery.
                      </p>
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                    >
                      <Lock className="h-4 w-4" />
                      Place Order — ${total.toFixed(2)}
                    </button>

                    <p className="mt-3 text-center text-[11px] text-zinc-600">
                      Orders are split and routed to each vendor automatically
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {(phase === "processing" || phase === "verifying") && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[60vh] flex-col items-center justify-center gap-6"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="h-16 w-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {phase === "processing" ? (
                    <CreditCard className="h-6 w-6 text-indigo-400" />
                  ) : (
                    <Shield className="h-6 w-6 text-indigo-400" />
                  )}
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold text-white">
                  {phase === "processing"
                    ? "Processing Payment"
                    : "Generating Verum Claims"}
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  {phase === "processing"
                    ? "Splitting payment across vendors..."
                    : "Signing claim envelopes for each vendor order..."}
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-sm">
                {Array.from(vendorGroups.entries()).map(
                  ([vendorId], i) => {
                    const vendor = getVendor(vendorId);
                    const isActive =
                      phase === "verifying" ||
                      (phase === "processing" && i === 0);
                    return (
                      <motion.div
                        key={vendorId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.2 }}
                        className={`flex items-center gap-3 rounded-xl border p-3 ${
                          isActive
                            ? "border-indigo-500/20 bg-indigo-500/5"
                            : "border-white/5 bg-zinc-900/30"
                        }`}
                      >
                        <span className="text-sm">{vendor?.logo}</span>
                        <span className="flex-1 text-xs font-medium text-zinc-300">
                          {vendor?.name}
                        </span>
                        {isActive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </motion.div>
                    );
                  }
                )}
              </div>
            </motion.div>
          )}

          {phase === "complete" && order && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 200,
                }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </motion.div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                  Order Confirmed
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Order {order.id} — ${order.total.toFixed(2)}
                </p>
              </div>

              <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">
                    Verum Claim Chain
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {order.vendorOrders.map((vo) => {
                    const vendor = getVendor(vo.vendorId);
                    return (
                      <div key={vo.vendorId} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span>{vendor?.logo}</span>
                          <span className="font-medium">{vendor?.name}</span>
                          <span className="text-zinc-600">
                            — ${vo.subtotal.toFixed(2)}
                          </span>
                        </div>
                        {vo.verumClaims.map((claim) => (
                          <VerumBadge key={claim.id} claim={claim} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/orders"
                  className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
                >
                  View Orders
                </Link>
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5"
                >
                  Continue Shopping
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
