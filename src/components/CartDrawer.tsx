"use client";

import { useCartStore } from "@/lib/store";
import { getVendor } from "@/lib/data";
import { X, Minus, Plus, Trash2, ArrowRight, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    setCartOpen,
    updateQuantity,
    removeItem,
    getCartTotal,
    getItemsByVendor,
  } = useCartStore();

  const vendorGroups = getItemsByVendor();
  const total = getCartTotal();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-zinc-950"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-white">Your Cart</h2>
                <p className="text-xs text-zinc-500">
                  {items.length === 0
                    ? "Empty"
                    : `${items.length} item${items.length > 1 ? "s" : ""} from ${vendorGroups.size} vendor${vendorGroups.size > 1 ? "s" : ""}`}
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-5">
                  <div className="rounded-full bg-zinc-900 p-4">
                    <Shield className="h-8 w-8 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500">
                    Your universal cart is empty
                  </p>
                  <p className="text-xs text-zinc-600 text-center max-w-[240px]">
                    Add items from any vendor and check out once — every
                    transaction verified by Verum.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {Array.from(vendorGroups.entries()).map(
                    ([vendorId, vendorItems]) => {
                      const vendor = getVendor(vendorId);
                      return (
                        <div key={vendorId} className="px-5 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-md text-xs"
                              style={{
                                backgroundColor: `${vendor?.accentColor}22`,
                              }}
                            >
                              {vendor?.logo}
                            </span>
                            <span className="text-xs font-semibold text-zinc-300">
                              {vendor?.name}
                            </span>
                          </div>

                          <div className="flex flex-col gap-3">
                            {vendorItems.map((item) => (
                              <div
                                key={item.product.id}
                                className="flex gap-3"
                              >
                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                                  <img
                                    src={item.product.image}
                                    alt={item.product.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-1 flex-col justify-between">
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm font-medium text-white leading-tight pr-2">
                                      {item.product.name}
                                    </p>
                                    <button
                                      onClick={() =>
                                        removeItem(item.product.id)
                                      }
                                      className="flex-shrink-0 p-0.5 text-zinc-600 transition-colors hover:text-red-400"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() =>
                                          updateQuantity(
                                            item.product.id,
                                            item.quantity - 1
                                          )
                                        }
                                        className="rounded-md border border-white/10 p-1 text-zinc-400 transition-colors hover:bg-white/5"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className="min-w-[20px] text-center text-xs font-medium text-white">
                                        {item.quantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          updateQuantity(
                                            item.product.id,
                                            item.quantity + 1
                                          )
                                        }
                                        className="rounded-md border border-white/10 p-1 text-zinc-400 transition-colors hover:bg-white/5"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <span className="text-sm font-semibold text-white">
                                      $
                                      {(
                                        item.product.price * item.quantity
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-white/10 px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Total</span>
                  <span className="text-xl font-bold text-white">
                    ${total.toFixed(2)}
                  </span>
                </div>
                <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-2">
                  <Shield className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs text-indigo-300">
                    Verified by Verum — cryptographic proof for every step
                  </span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setCartOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                >
                  Checkout
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
