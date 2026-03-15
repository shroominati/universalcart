"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { vendors, getProductsByVendor } from "@/lib/data";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { ArrowLeft, Shield, Star, MapPin } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

function VendorContent() {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("id");
  const vendor = vendors.find((v) => v.id === vendorId);

  if (!vendor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-bold text-white">Vendor not found</h1>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Stores
        </Link>
      </div>
    );
  }

  const vendorProducts = getProductsByVendor(vendor.id);

  const categoryLabels: Record<string, string> = {
    electronics: "Electronics & Gadgets",
    fashion: "Fashion & Apparel",
    home: "Home & Living",
    grocery: "Organic Grocery",
    sports: "Sports & Outdoors",
    beauty: "Beauty & Wellness",
  };

  return (
    <>
      {/* Vendor Hero Banner */}
      <div
        className="relative overflow-hidden border-b border-white/5"
        style={{
          background: `linear-gradient(135deg, ${vendor.accentColor}18 0%, transparent 60%)`,
        }}
      >
        {/* Accent stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: vendor.accentColor }}
        />

        <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Stores
          </Link>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-20 w-20 items-center justify-center rounded-2xl text-4xl shadow-lg"
              style={{
                backgroundColor: `${vendor.accentColor}22`,
                boxShadow: `0 8px 32px ${vendor.accentColor}15`,
              }}
            >
              {vendor.logo}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1"
            >
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                  {vendor.name}
                </h1>
              </div>

              <p className="text-sm text-zinc-400 max-w-lg">
                {vendor.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-bold">{vendor.rating}</span>
                  <span className="text-xs text-zinc-500 ml-0.5">rating</span>
                </div>

                <span className="h-4 w-px bg-zinc-700" />

                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-400">
                    {categoryLabels[vendor.category] || vendor.category}
                  </span>
                </div>

                <span className="h-4 w-px bg-zinc-700" />

                <div className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1">
                  <Shield className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">
                    Verum Identity
                  </span>
                </div>
              </div>

              <p className="mt-2 font-mono text-[11px] text-zinc-600 truncate max-w-md">
                {vendor.verumDid}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {vendorProducts.length} Products
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add to your universal cart — works across all stores
            </p>
          </div>
          <div
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: `${vendor.accentColor}15`,
              color: vendor.accentColor,
            }}
          >
            {categoryLabels[vendor.category] || vendor.category}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendorProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function VendorPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <CartDrawer />
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-sm text-zinc-500">Loading...</div>
          </div>
        }
      >
        <VendorContent />
      </Suspense>
    </div>
  );
}
