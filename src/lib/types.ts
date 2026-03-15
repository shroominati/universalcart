export interface Vendor {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  accentColor: string;
  category: VendorCategory;
  rating: number;
  verumDid: string;
}

export type VendorCategory =
  | "electronics"
  | "fashion"
  | "home"
  | "grocery"
  | "sports"
  | "beauty";

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  tags: string[];
  rating: number;
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface VendorOrder {
  vendorId: string;
  items: CartItem[];
  subtotal: number;
  status: VendorOrderStatus;
  verumClaims: VerumClaim[];
}

export type VendorOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered";

export interface Order {
  id: string;
  vendorOrders: VendorOrder[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  verumChainId: string;
}

export type OrderStatus =
  | "placed"
  | "verified"
  | "processing"
  | "partially_shipped"
  | "shipped"
  | "delivered";

export interface VerumClaim {
  id: string;
  type: VerumClaimType;
  issuer: string;
  contentHash: string;
  timestamp: string;
  status: "valid" | "pending" | "failed";
  envelope?: VerumEnvelope;
}

export type VerumClaimType =
  | "payment.intent"
  | "vendor.order.confirmed"
  | "fulfillment.acknowledged"
  | "delivery.confirmed"
  | "refund.issued";

export interface VerumEnvelope {
  version: "ClaimEnvelopeV1";
  claimType: string;
  issuer: string;
  issuedAt: string;
  contentHash: string;
  dependencies: string[];
  signature: string;
}
