"use client";

import { useCartStore } from "@/lib/store";
import { getVendor } from "@/lib/data";
import {
  verifyClaimChain,
  getVerumMode,
} from "@/lib/verum";
import type { ChainVerificationResult } from "@/lib/verum";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import OrderTimeline from "@/components/OrderTimeline";
import TrustModePanel from "@/components/TrustModePanel";
import ClaimInspectDrawer from "@/components/ClaimInspectDrawer";
import {
  Shield,
  Package,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Order, VerumClaim } from "@/lib/types";

function useVerification(order: Order) {
  const [result, setResult] = useState<ChainVerificationResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const allClaims = order.vendorOrders.flatMap((vo) => vo.verumClaims);
    if (allClaims.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    void verifyClaimChain(allClaims).then((verificationResult) => {
      if (!cancelled) {
        setResult(verificationResult);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [order]);

  return result;
}

function VerificationWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <FlaskConical className="h-3 w-3 text-amber-400" />
        <span className="text-[10px] font-semibold text-amber-300">
          Degradation Notices
        </span>
      </div>
      {[...new Set(warnings)].map((w, i) => (
        <p key={i} className="text-[10px] text-amber-200/60 leading-relaxed">
          {w}
        </p>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { orders } = useCartStore();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(
    orders[0]?.id || null
  );
  const [inspectingClaim, setInspectingClaim] = useState<VerumClaim | null>(null);
  const mode = getVerumMode();
  const isMock = mode === "mock";

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <CartDrawer />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
          <div className="rounded-full bg-zinc-900 p-5">
            <Package className="h-8 w-8 text-zinc-600" />
          </div>
          <h1 className="text-xl font-bold text-white">No orders yet</h1>
          <p className="text-sm text-zinc-500 text-center max-w-xs">
            Once you place an order, you&apos;ll see it here with full Verum
            verification details.
          </p>
          <Link
            href="/"
            className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <CartDrawer />
      <ClaimInspectDrawer
        claim={inspectingClaim}
        onClose={() => setInspectingClaim(null)}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Shop
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Your Orders</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {orders.length} order{orders.length > 1 ? "s" : ""}
            {isMock ? " — claims simulated locally" : " — verified by Verum"}
          </p>
        </div>

        <div className="mb-6">
          <TrustModePanel />
        </div>

        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isExpanded={expandedOrder === order.id}
              onToggle={() =>
                setExpandedOrder(
                  expandedOrder === order.id ? null : order.id
                )
              }
              isMock={isMock}
              onClaimClick={setInspectingClaim}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  isExpanded,
  onToggle,
  isMock,
  onClaimClick,
}: {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  isMock: boolean;
  onClaimClick: (claim: VerumClaim) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
            <Package className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{order.id}</span>
              <div className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5">
                {isMock && (
                  <FlaskConical className="h-3 w-3 text-amber-400/60" />
                )}
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-semibold text-emerald-400">
                  {isMock ? "Simulated" : "All Claims Verified"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-zinc-500">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="text-xs text-zinc-600">|</span>
              <span className="text-xs text-zinc-500">
                {order.vendorOrders.length} vendor
                {order.vendorOrders.length > 1 ? "s" : ""}
              </span>
              <span className="text-xs text-zinc-600">|</span>
              <span className="text-xs font-semibold text-zinc-300">
                ${order.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex -space-x-1">
            {order.vendorOrders.map((vo) => {
              const vendor = getVendor(vo.vendorId);
              return (
                <span
                  key={vo.vendorId}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900 text-xs"
                  style={{
                    backgroundColor: `${vendor?.accentColor}33`,
                  }}
                >
                  {vendor?.logo}
                </span>
              );
            })}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <OrderDetails
            order={order}
            isMock={isMock}
            onClaimClick={onClaimClick}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderDetails({
  order,
  isMock,
  onClaimClick,
}: {
  order: Order;
  isMock: boolean;
  onClaimClick: (claim: VerumClaim) => void;
}) {
  const verification = useVerification(order);
  const allClaims = order.vendorOrders.flatMap((vo) => vo.verumClaims);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="border-t border-white/5 px-5 py-5">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Vendor Orders
            </h3>
            <div className="flex flex-col gap-3">
              {order.vendorOrders.map((vo) => {
                const vendor = getVendor(vo.vendorId);
                return (
                  <div
                    key={vo.vendorId}
                    className="rounded-xl border border-white/5 bg-zinc-950/50 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md text-xs"
                          style={{
                            backgroundColor: `${vendor?.accentColor}22`,
                          }}
                        >
                          {vendor?.logo}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {vendor?.name}
                        </span>
                      </div>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 capitalize">
                        {vo.status}
                      </span>
                    </div>

                    {vo.items.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-3 py-1.5"
                      >
                        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-zinc-800">
                          {/* Product URLs are dynamic; keep native img rendering here. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="flex-1 text-xs text-zinc-300 truncate">
                          {item.product.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          x{item.quantity}
                        </span>
                        <span className="text-xs font-medium text-white">
                          $
                          {(
                            item.product.price * item.quantity
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}

                    <div className="mt-2 flex justify-between border-t border-white/5 pt-2">
                      <span className="text-xs text-zinc-500">
                        Subtotal
                      </span>
                      <span className="text-xs font-semibold text-white">
                        ${vo.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Verum Claim Chain
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                <Shield className="h-3 w-3" />
                Chain: {order.verumChainId}
              </div>
            </div>

            <p className="mb-3 text-[10px] text-zinc-600">
              Click any claim to inspect its full details
            </p>

            <OrderTimeline
              claims={allClaims}
              onClaimClick={onClaimClick}
            />

            {verification && (
              <div
                className={`mt-4 rounded-xl border p-3 ${
                  isMock
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-indigo-500/20 bg-indigo-500/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isMock ? (
                    <FlaskConical className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Shield className="h-4 w-4 text-indigo-400" />
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      isMock ? "text-amber-300" : "text-indigo-300"
                    }`}
                  >
                    {isMock
                      ? "Simulated Verification"
                      : "Verification Summary"}
                  </span>
                  <span className="text-[10px] text-zinc-600 ml-auto">
                    mode: {verification.mode}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  {verification.checks
                    .filter(
                      (c, i, arr) =>
                        arr.findIndex((x) => x.name === c.name) === i
                    )
                    .map((check, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <CheckCircle2
                          className={`h-3 w-3 ${
                            check.passed ? "text-emerald-400" : "text-red-400"
                          }`}
                        />
                        <span className="text-zinc-400">
                          {check.name}
                        </span>
                      </div>
                    ))}
                </div>
                <VerificationWarnings warnings={verification.warnings} />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
