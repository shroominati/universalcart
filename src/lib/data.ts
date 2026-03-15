import { Vendor, Product } from "./types";

export const vendors: Vendor[] = [
  {
    id: "v-aurora",
    name: "Aurora Electronics",
    slug: "aurora-electronics",
    description:
      "Premium consumer electronics and cutting-edge gadgets from trusted global brands.",
    logo: "⚡",
    accentColor: "#6366f1",
    category: "electronics",
    rating: 4.8,
    verumDid: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  },
  {
    id: "v-thread",
    name: "Thread & Co.",
    slug: "thread-and-co",
    description:
      "Modern fashion essentials with sustainable materials and timeless design.",
    logo: "🧵",
    accentColor: "#ec4899",
    category: "fashion",
    rating: 4.6,
    verumDid: "did:key:z6MknGc3ocHs3zdPiJbnaaqDi58NGb4pk1Sp9WNhqqzGc6Jo",
  },
  {
    id: "v-hearthstone",
    name: "Hearthstone Home",
    slug: "hearthstone-home",
    description:
      "Curated home goods, furniture, and décor for every room in your house.",
    logo: "🏠",
    accentColor: "#f59e0b",
    category: "home",
    rating: 4.7,
    verumDid: "did:key:z6MkpTHR8VNs5zPaa7XZ96DP96oHrYtr4M1vMBJpNtW4oBoS",
  },
  {
    id: "v-greenbask",
    name: "Green Basket",
    slug: "green-basket",
    description:
      "Farm-fresh organic groceries and artisanal foods delivered to your door.",
    logo: "🥬",
    accentColor: "#22c55e",
    category: "grocery",
    rating: 4.5,
    verumDid: "did:key:z6Mkud2HCQB1RDJW5RKkt4Svq2RP9nUaNTHqWjGqbhzKG33z",
  },
  {
    id: "v-summit",
    name: "Summit Sports",
    slug: "summit-sports",
    description:
      "High-performance athletic gear and outdoor equipment for every adventure.",
    logo: "⛰️",
    accentColor: "#0ea5e9",
    category: "sports",
    rating: 4.9,
    verumDid: "did:key:z6MksC2RBJGD7CVf4LQ3Xr2B6nCDaQPYdJMKJEM5DWRd7BbF",
  },
  {
    id: "v-lumiere",
    name: "Lumière Beauty",
    slug: "lumiere-beauty",
    description:
      "Clean beauty, skincare, and wellness products backed by science.",
    logo: "✨",
    accentColor: "#a855f7",
    category: "beauty",
    rating: 4.7,
    verumDid: "did:key:z6MkrHKzgsahxBLyNAbLQyB1pcWNYC9GmywiWPgkrvntAZcj",
  },
];

export const products: Product[] = [
  // Aurora Electronics
  {
    id: "p-aurora-1",
    vendorId: "v-aurora",
    name: "Nova Wireless Earbuds Pro",
    description:
      "Active noise cancellation, 36-hour battery, spatial audio. IPX5 water resistant.",
    price: 149.99,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop",
    category: "Audio",
    tags: ["wireless", "earbuds", "anc"],
    rating: 4.7,
    inStock: true,
  },
  {
    id: "p-aurora-2",
    vendorId: "v-aurora",
    name: '4K Ultra Monitor 32"',
    description:
      "IPS panel, 144Hz refresh rate, HDR600, USB-C hub with 96W power delivery.",
    price: 599.99,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop",
    category: "Displays",
    tags: ["monitor", "4k", "usb-c"],
    rating: 4.8,
    inStock: true,
  },
  {
    id: "p-aurora-3",
    vendorId: "v-aurora",
    name: "Mechanical Keyboard Eclipse",
    description:
      "Hot-swappable switches, per-key RGB, aluminum frame, wireless tri-mode.",
    price: 189.0,
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=400&fit=crop",
    category: "Peripherals",
    tags: ["keyboard", "mechanical", "rgb"],
    rating: 4.9,
    inStock: true,
  },

  // Thread & Co.
  {
    id: "p-thread-1",
    vendorId: "v-thread",
    name: "Merino Wool Crewneck",
    description:
      "Ultra-fine 18.5 micron merino, naturally temperature regulating. Machine washable.",
    price: 98.0,
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cda3a98?w=400&h=400&fit=crop",
    category: "Tops",
    tags: ["merino", "wool", "sweater"],
    rating: 4.6,
    inStock: true,
  },
  {
    id: "p-thread-2",
    vendorId: "v-thread",
    name: "Organic Cotton Tee Pack (3)",
    description:
      "GOTS certified organic cotton, relaxed fit. Black, white, and navy.",
    price: 65.0,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    category: "Tops",
    tags: ["cotton", "tshirt", "organic"],
    rating: 4.5,
    inStock: true,
  },
  {
    id: "p-thread-3",
    vendorId: "v-thread",
    name: "Stretch Chino Pants",
    description:
      "4-way stretch twill, tapered fit. Wrinkle-resistant travel fabric.",
    price: 88.0,
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop",
    category: "Bottoms",
    tags: ["chinos", "pants", "stretch"],
    rating: 4.4,
    inStock: true,
  },

  // Hearthstone Home
  {
    id: "p-hearth-1",
    vendorId: "v-hearthstone",
    name: "Walnut Desk Organizer",
    description:
      "Solid walnut construction, cable management, wireless charging pad built in.",
    price: 129.0,
    image: "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=400&h=400&fit=crop",
    category: "Office",
    tags: ["desk", "organizer", "walnut"],
    rating: 4.8,
    inStock: true,
  },
  {
    id: "p-hearth-2",
    vendorId: "v-hearthstone",
    name: "Ceramic Planter Set (4)",
    description:
      "Hand-glazed stoneware with drainage. Matte white, sage, terracotta, charcoal.",
    price: 72.0,
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=400&fit=crop",
    category: "Garden",
    tags: ["planter", "ceramic", "indoor"],
    rating: 4.6,
    inStock: true,
  },
  {
    id: "p-hearth-3",
    vendorId: "v-hearthstone",
    name: "Linen Throw Blanket",
    description:
      "Stonewashed Belgian linen, OEKO-TEX certified. 55\" × 70\".",
    price: 95.0,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop",
    category: "Textiles",
    tags: ["blanket", "linen", "throw"],
    rating: 4.7,
    inStock: true,
  },

  // Green Basket
  {
    id: "p-green-1",
    vendorId: "v-greenbask",
    name: "Seasonal Produce Box",
    description:
      "Weekly selection of organic fruits and vegetables from local farms. Feeds 2-3.",
    price: 45.0,
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=400&fit=crop",
    category: "Produce",
    tags: ["organic", "vegetables", "fruit"],
    rating: 4.5,
    inStock: true,
  },
  {
    id: "p-green-2",
    vendorId: "v-greenbask",
    name: "Artisan Sourdough Loaf",
    description:
      "72-hour cold ferment, stone-milled heritage wheat. Baked fresh daily.",
    price: 8.5,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
    category: "Bakery",
    tags: ["bread", "sourdough", "artisan"],
    rating: 4.9,
    inStock: true,
  },
  {
    id: "p-green-3",
    vendorId: "v-greenbask",
    name: "Cold-Pressed Olive Oil",
    description:
      "Single-origin Koroneiki olives, first press. 500ml glass bottle.",
    price: 24.0,
    image: "https://images.unsplash.com/photo-1474979266404-7eaacdc948b6?w=400&h=400&fit=crop",
    category: "Pantry",
    tags: ["olive oil", "organic", "cold-pressed"],
    rating: 4.7,
    inStock: true,
  },

  // Summit Sports
  {
    id: "p-summit-1",
    vendorId: "v-summit",
    name: "Trail Running Shoes",
    description:
      "Vibram outsole, rock plate, 4mm drop. Breathable mesh upper with GORE-TEX lining.",
    price: 165.0,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
    category: "Footwear",
    tags: ["running", "trail", "shoes"],
    rating: 4.8,
    inStock: true,
  },
  {
    id: "p-summit-2",
    vendorId: "v-summit",
    name: "Insulated Water Bottle 32oz",
    description:
      "Triple-wall vacuum insulation, 48hr cold / 24hr hot. Leakproof lid.",
    price: 38.0,
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop",
    category: "Accessories",
    tags: ["water bottle", "insulated", "outdoor"],
    rating: 4.9,
    inStock: true,
  },
  {
    id: "p-summit-3",
    vendorId: "v-summit",
    name: "Compression Leggings",
    description:
      "Graduated compression, squat-proof fabric, hidden pocket. UV50+ protection.",
    price: 78.0,
    image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=400&fit=crop",
    category: "Apparel",
    tags: ["leggings", "compression", "workout"],
    rating: 4.6,
    inStock: true,
  },

  // Lumière Beauty
  {
    id: "p-lumi-1",
    vendorId: "v-lumiere",
    name: "Vitamin C Brightening Serum",
    description:
      "20% L-ascorbic acid with ferulic acid and vitamin E. Airless pump, 30ml.",
    price: 56.0,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop",
    category: "Skincare",
    tags: ["serum", "vitamin c", "brightening"],
    rating: 4.7,
    inStock: true,
  },
  {
    id: "p-lumi-2",
    vendorId: "v-lumiere",
    name: "Reef-Safe Mineral Sunscreen",
    description:
      "SPF 50, zinc oxide only. No white cast, water resistant 80 min.",
    price: 32.0,
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop",
    category: "Sun Care",
    tags: ["sunscreen", "mineral", "reef-safe"],
    rating: 4.8,
    inStock: true,
  },
  {
    id: "p-lumi-3",
    vendorId: "v-lumiere",
    name: "Overnight Recovery Mask",
    description:
      "Bakuchiol + squalane + ceramides. Wake up with plump, hydrated skin.",
    price: 44.0,
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",
    category: "Skincare",
    tags: ["mask", "recovery", "overnight"],
    rating: 4.6,
    inStock: true,
  },
];

export function getVendor(id: string): Vendor | undefined {
  return vendors.find((v) => v.id === id);
}

export function getVendorBySlug(slug: string): Vendor | undefined {
  return vendors.find((v) => v.slug === slug);
}

export function getProductsByVendor(vendorId: string): Product[] {
  return products.filter((p) => p.vendorId === vendorId);
}

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
