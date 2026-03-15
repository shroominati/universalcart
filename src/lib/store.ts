import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import {
  CartItem,
  Order,
  OrderStatus,
  Product,
  VendorOrder,
  VerumClaim,
} from "./types";
import { getVendor } from "./data";

interface CartStore {
  items: CartItem[];
  orders: Order[];
  isCartOpen: boolean;

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;

  checkout: () => Order;
  getOrder: (id: string) => Order | undefined;

  getCartTotal: () => number;
  getCartCount: () => number;
  getItemsByVendor: () => Map<string, CartItem[]>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orders: [],
      isCartOpen: false,

      addItem: (product: Product) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.product.id === product.id
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity: 1 }] };
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
      setCartOpen: (open: boolean) => set({ isCartOpen: open }),

      checkout: () => {
        const state = get();
        const vendorGroups = state.getItemsByVendor();
        const now = new Date().toISOString();
        const orderId = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

        const vendorOrders: VendorOrder[] = [];

        vendorGroups.forEach((items, vendorId) => {
          const vendor = getVendor(vendorId);
          const subtotal = items.reduce(
            (sum, i) => sum + i.product.price * i.quantity,
            0
          );

          const paymentClaim: VerumClaim = {
            id: `claim-${uuidv4().slice(0, 8)}`,
            type: "payment.intent",
            issuer: "did:key:z6MkUniversalCartPlatform",
            contentHash: `sha256:${uuidv4().replace(/-/g, "")}`,
            timestamp: now,
            status: "valid",
            envelope: {
              version: "ClaimEnvelopeV1",
              claimType: "payment.intent",
              issuer: "did:key:z6MkUniversalCartPlatform",
              issuedAt: now,
              contentHash: `sha256:${uuidv4().replace(/-/g, "")}`,
              dependencies: [],
              signature: `ed25519:${uuidv4().replace(/-/g, "")}`,
            },
          };

          const vendorConfirmClaim: VerumClaim = {
            id: `claim-${uuidv4().slice(0, 8)}`,
            type: "vendor.order.confirmed",
            issuer: vendor?.verumDid || vendorId,
            contentHash: `sha256:${uuidv4().replace(/-/g, "")}`,
            timestamp: now,
            status: "valid",
            envelope: {
              version: "ClaimEnvelopeV1",
              claimType: "vendor.order.confirmed",
              issuer: vendor?.verumDid || vendorId,
              issuedAt: now,
              contentHash: `sha256:${uuidv4().replace(/-/g, "")}`,
              dependencies: [paymentClaim.contentHash],
              signature: `ed25519:${uuidv4().replace(/-/g, "")}`,
            },
          };

          vendorOrders.push({
            vendorId,
            items,
            subtotal,
            status: "confirmed",
            verumClaims: [paymentClaim, vendorConfirmClaim],
          });
        });

        const total = vendorOrders.reduce((sum, vo) => sum + vo.subtotal, 0);

        const order: Order = {
          id: orderId,
          vendorOrders,
          total,
          status: "verified" as OrderStatus,
          createdAt: now,
          verumChainId: `chain-${uuidv4().slice(0, 8)}`,
        };

        set((state) => ({
          orders: [order, ...state.orders],
          items: [],
        }));

        return order;
      },

      getOrder: (id: string) => {
        return get().orders.find((o) => o.id === id);
      },

      getCartTotal: () => {
        return get().items.reduce(
          (sum, i) => sum + i.product.price * i.quantity,
          0
        );
      },

      getCartCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      getItemsByVendor: () => {
        const groups = new Map<string, CartItem[]>();
        get().items.forEach((item) => {
          const vendorId = item.product.vendorId;
          if (!groups.has(vendorId)) {
            groups.set(vendorId, []);
          }
          groups.get(vendorId)!.push(item);
        });
        return groups;
      },
    }),
    {
      name: "universalcart-storage",
      partialize: (state) => ({
        items: state.items,
        orders: state.orders,
      }),
    }
  )
);
