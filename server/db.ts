import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Create guest rate limits table if it doesn't exist (startup DDL guard)
const initializeGuestRateLimitsTable = async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS guest_rate_limits (
        id serial PRIMARY KEY,
        email varchar NOT NULL UNIQUE,
        last_playlist_generated timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);
  } catch (error) {
    console.error('Failed to create guest_rate_limits table:', error);
  }
};

// Initialize table on startup
initializeGuestRateLimitsTable();