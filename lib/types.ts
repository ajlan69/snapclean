// Database row types mirroring the Supabase schema (see supabase/schema.sql).

export type Plan = "free" | "pro";

export interface Profile {
  id: string;
  email: string;
  plan: Plan;
  daily_count: number;
  last_reset: string | null;
  created_at: string;
}

export interface ImageRecord {
  id: string;
  user_id: string;
  original_url: string;
  processed_url: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  status: string;
  current_period_end: string | null;
  created_at: string;
}