import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role").notNull().default("field"), // admin, pm, field, readonly
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rate tables extracted from PDFs
export const rateTables = pgTable("rate_tables", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // labor, equipment, material, disposal, import
  effectiveDate: timestamp("effective_date").notNull(),
  region: varchar("region"),
  data: jsonb("data").notNull(), // Structured rate data
  sourceFile: varchar("source_file"),
  extractedAt: timestamp("extracted_at").defaultNow(),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  isApproved: boolean("is_approved").default(false),
});

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  number: varchar("number").unique().notNull(),
  client: varchar("client"),
  location: varchar("location"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Change orders
export const changeOrders = pgTable("change_orders", {
  id: serial("id").primaryKey(),
  number: varchar("number").unique().notNull(),
  projectId: integer("project_id").references(() => projects.id),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("draft"), // draft, pending, approved, rejected
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  laborAmount: decimal("labor_amount", { precision: 10, scale: 2 }),
  materialAmount: decimal("material_amount", { precision: 10, scale: 2 }),
  equipmentAmount: decimal("equipment_amount", { precision: 10, scale: 2 }),
  disposalAmount: decimal("disposal_amount", { precision: 10, scale: 2 }),
  importAmount: decimal("import_amount", { precision: 10, scale: 2 }),
  subcontractorAmount: decimal("subcontractor_amount", { precision: 10, scale: 2 }),
  data: jsonb("data"), // Detailed breakdown data
  createdBy: integer("created_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
});

// Document processing
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  type: varchar("type").notNull(), // tm_sheet, invoice, rate_table, supporting_doc
  status: varchar("status").notNull().default("uploaded"), // uploaded, processing, processed, failed
  extractedData: jsonb("extracted_data"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  changeOrderId: integer("change_order_id").references(() => changeOrders.id),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Audit trail
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  userId: integer("user_id").references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Chat conversations
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  messages: jsonb("messages").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChangeOrderSchema = createInsertSchema(changeOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export const insertRateTableSchema = createInsertSchema(rateTables).omit({
  id: true,
  extractedAt: true,
  reviewedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type RateTable = typeof rateTables.$inferSelect;
export type InsertRateTable = z.infer<typeof insertRateTableSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
