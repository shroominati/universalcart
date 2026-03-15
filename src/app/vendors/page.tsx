"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { vendors, getProductsByVendor } from "@/lib/data";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { ArrowLeft, Shield, Star } from "lucide-react";
import Link from "next/link";

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
          Back to Shop
        </Link>
      </div>
    );
  }

  const vendorProducts = getProductsByVendor(vendor.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Vendors
      </Link>

      <div className="mb-10 flex items-start gap-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
          style={{ backgroundColor: `${vendor.accentColor}22` }}
        >
          {vendor.logo}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{vendor.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">{vendor.description}</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-semibold">{vendor.rating}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1">
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">
                Verum Verified Vendor
              </span>
            </div>
          </div>
          <p className="mt-2 font-mono text-[11px] text-zinc-600 truncate max-w-md">
            {vendor.verumDid}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendorProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
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
