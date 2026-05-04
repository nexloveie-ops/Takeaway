import Stripe from 'stripe';
import { SystemConfig } from '../models/SystemConfig';
import { createAppError } from '../middleware/errorHandler';

export const STRIPE_PUBLISHABLE_CONFIG_KEY = 'stripe_publishable_key';
export const STRIPE_SECRET_CONFIG_KEY = 'stripe_secret_key';

/** Keys never exposed on public GET /api/admin/config */
export const STRIPE_KEYS_FILTER_FROM_PUBLIC_CONFIG = new Set([
  STRIPE_SECRET_CONFIG_KEY,
  STRIPE_PUBLISHABLE_CONFIG_KEY,
]);

/** Payment /customer Stripe.js — database only (system_configs.stripe_publishable_key). */
export async function getStripePublishableResolved(): Promise<string> {
  const row = await SystemConfig.findOne({ key: STRIPE_PUBLISHABLE_CONFIG_KEY }).lean();
  return row?.value?.trim() || '';
}

/** Server Stripe SDK — database only (system_configs.stripe_secret_key). */
export async function getStripeSecretResolved(): Promise<string> {
  const row = await SystemConfig.findOne({ key: STRIPE_SECRET_CONFIG_KEY }).lean();
  return row?.value?.trim() || '';
}

/** Same as publishable resolved — kept for admin GET wording / symmetry */
export async function getStripePublishableFromDbOnly(): Promise<string> {
  return getStripePublishableResolved();
}

export async function hasStripeSecretInDb(): Promise<boolean> {
  const row = await SystemConfig.findOne({ key: STRIPE_SECRET_CONFIG_KEY }).lean();
  return !!row?.value?.trim();
}

export async function createStripeClient() {
  const secret = await getStripeSecretResolved();
  if (!secret) {
    throw createAppError(
      'VALIDATION_ERROR',
      'Stripe secret key is not configured in the database. Save keys under Admin → Stripe.',
    );
  }
  return new Stripe(secret);
}
