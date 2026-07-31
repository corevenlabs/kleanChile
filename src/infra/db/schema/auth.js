import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { userRole } from "./enums.js";

/**
 * Admin accounts.
 *
 * Staff only — the storefront has no customer accounts. There is deliberately
 * no sign-up route: accounts are minted with `npm run admin:create`, because
 * the only people who should have one are the people who already have shell
 * access to the deployment.
 */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),

    /** scrypt, in the encoded form produced by `src/infra/auth/password.js`. */
    passwordHash: text("password_hash"),

    role: userRole("role").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),

    /**
     * Online brute-force protection.
     *
     * The admin login is the one door into this system from the open internet
     * and the account names are guessable, being work email addresses. Locking
     * after a run of failures makes guessing cost wall-clock time rather than
     * CPU. Cleared on any successful sign-in.
     */
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),

    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Stored hashed: a leaked database should not hand over live sessions. */
    tokenHash: text("token_hash").notNull(),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
