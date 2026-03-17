/**
 * Zod Schema Validation Middleware
 *
 * Validates request body, params, and query against Zod schemas.
 * Returns 400 with detailed field-level errors on failure.
 *
 * Usage:
 *   router.post('/items', validate({ body: AddItemSchema }), handler);
 *   router.get('/items/:id', validate({ params: ItemIdSchema }), handler);
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/** Validation middleware factory */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: { location: string; field: string; message: string }[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            location: 'body',
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
      } else {
        req.body = result.data; // Use parsed/coerced data
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            location: 'params',
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            location: 'query',
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
      } else {
        (req as any).validatedQuery = result.data;
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
      return;
    }

    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/** Reusable ID param */
export const IdParam = z.object({
  id: z.string().min(1, 'ID is required'),
});

/** Reusable vendor param */
export const VendorParam = z.object({
  vendor: z.string().min(1, 'Vendor is required'),
});

/** Reusable service param */
export const ServiceParam = z.object({
  service: z.string().min(1, 'Service name is required'),
});

/** Pagination query */
export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const RegisterBody = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const LoginBody = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// CART SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const CartItemBase = z.object({
  name: z.string().min(1, 'Product name is required').max(500),
  price: z.number().positive('Price must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3-letter ISO code').optional().default('USD'),
  image: z.string().url('Invalid image URL').optional(),
  sourceUrl: z.string().url('Invalid source URL'),
  vendor: z.string().min(1, 'Vendor is required').max(100),
  vendorSku: z.string().max(200).optional(),
  universalId: z.string().max(200).optional(),
  variant: z.string().max(500).optional(),
  quantity: z.number().int().min(1).max(999).optional().default(1),
});

export const AddItemBody = CartItemBase;

export const SyncCartBody = z.object({
  items: z.array(CartItemBase).min(1, 'At least one item required').max(500, 'Maximum 500 items per sync'),
});

export const UpdateItemBody = z.object({
  quantity: z.number().int().min(0).max(999).optional(),
  status: z.enum(['active', 'watchlist', 'purchased', 'removed']).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.string().max(500).optional(),
  priceAlertThreshold: z.number().positive().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field to update is required',
});

export const CartSettingsBody = z.object({
  autoRefreshInterval: z.number().int().min(60000).max(86400000).optional(),
  priceDropThreshold: z.number().min(0).max(100).optional(),
  trackOutOfStock: z.boolean().optional(),
  maxItems: z.number().int().min(1).max(10000).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one setting is required',
});

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKOUT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const StartCheckoutBody = z.object({
  cart: z.array(z.object({
    name: z.string().min(1),
    price: z.number().positive().optional(),
    sourceUrl: z.string().url(),
    vendor: z.string().min(1),
    quantity: z.number().int().min(1).optional().default(1),
  })).min(1, 'Cart cannot be empty'),
  shippingProfileId: z.string().min(1, 'Shipping profile is required'),
  paymentMethodId: z.string().min(1, 'Payment method is required'),
  userId: z.string().optional(),
  applyPromos: z.boolean().optional().default(true),
  dryRun: z.boolean().optional().default(false),
});

export const ShippingProfileBody = z.object({
  name: z.string().min(1).max(100),
  address1: z.string().min(1).max(200),
  address2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zip: z.string().min(1).max(20),
  country: z.string().min(2).max(3).optional().default('US'),
  phone: z.string().max(20).optional(),
});

export const PaymentMethodBody = z.object({
  type: z.enum(['card', 'paypal', 'applepay', 'googlepay']).optional().default('card'),
  last4: z.string().length(4).optional(),
  brand: z.string().max(20).optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(2024).max(2040).optional(),
  isDefault: z.boolean().optional().default(false),
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROMO SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const SubmitPromoBody = z.object({
  code: z.string().min(1, 'Promo code is required').max(100),
  description: z.string().max(500).optional(),
  source: z.string().max(100).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE SCOUT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const PriceScoutItem = z.object({
  name: z.string().min(1, 'Product name is required').max(500),
  price: z.number().positive().optional(),
  vendor: z.string().max(100).optional(),
  universalId: z.string().max(200).optional(),
  vendorSku: z.string().max(200).optional(),
});

export const PriceScoutBody = PriceScoutItem;

export const PriceScoutBatchBody = z.object({
  items: z.array(PriceScoutItem).min(1).max(50, 'Maximum 50 items per batch'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const NotificationQuery = z.object({
  unread: z.enum(['true', 'false']).optional(),
  type: z.enum(['price_drop', 'deal_found', 'back_in_stock', 'checkout', 'system']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const NotificationPrefsBody = z.object({
  priceDrop: z.boolean().optional(),
  dealFound: z.boolean().optional(),
  backInStock: z.boolean().optional(),
  checkout: z.boolean().optional(),
  emailDigest: z.boolean().optional(),
  digestFrequency: z.enum(['daily', 'weekly', 'never']).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one preference is required',
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const AuditQuery = z.object({
  type: z.string().max(50).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  since: z.coerce.number().int().positive().optional(),
  until: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
});

export const RotateKeyBody = z.object({
  newKey: z.string().min(1).max(500).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const AnalyticsPeriodQuery = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d'),
});

export const ActivityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
