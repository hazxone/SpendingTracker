import { pgTable, serial, text, timestamp, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Create category enum for spending categories
export const categoryEnum = pgEnum('category', [
  'Food',
  'Petrol',
  'Rent',
  'Healthcare',
  'Entertainment',
  'Clothing',
  'Insurance',
  'Communication',
  'Loans',
  'Toll',
  'Transportation',
  'Miscellaneous'
]);

// Users table schema (keeping from original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Transactions table schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  items: text("items").notNull(),
  dateTime: timestamp("datetime").notNull(),
  dateOnly: date("date_only").notNull(),
  category: categoryEnum("category").notNull(),
  userId: serial("user_id").references(() => users.id),
});

// Define schemas for insertion and selection
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
});

export const selectTransactionSchema = createSelectSchema(transactions);

// Edit transaction schema for validation
export const editTransactionSchema = z.object({
  id: z.number(),
  price: z.number().positive(),
  items: z.string().min(1),
  dateTime: z.string(),
  dateOnly: z.string(),
  category: z.enum([
    'Food',
    'Petrol',
    'Rent',
    'Healthcare',
    'Entertainment',
    'Clothing',
    'Insurance',
    'Communication',
    'Loans',
    'Toll',
    'Transportation',
    'Miscellaneous'
  ])
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type EditTransaction = z.infer<typeof editTransactionSchema>;

// Types for summary metrics
export type SpendingSummary = {
  todayTotal: number;
  todayTrend: number;
  monthTotal: number;
  monthTrend: number;
  topCategory: string;
  topCategoryAmount: number;
  topCategoryPercentage: number;
  dailyAverage: number;
};

export type CategorySummary = {
  category: string;
  total: number;
  percentage: number;
};

export type DailySpending = {
  date: string;
  total: number;
};
