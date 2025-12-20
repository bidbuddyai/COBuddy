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

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  domain: varchar("domain").unique().notNull(), // e.g., "resource-env.com"
  isActive: boolean("is_active").default(true),
  hasCustomRates: boolean("has_custom_rates").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("field"), // admin, pm, field, readonly
  companyId: integer("company_id").references(() => companies.id),
  invitedBy: varchar("invited_by"),
  invitedAt: timestamp("invited_at"),
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
  companyId: integer("company_id").references(() => companies.id), // Nullable for public rates (Caltrans)
  extractedAt: timestamp("extracted_at").defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  isApproved: boolean("is_approved").default(false),
});

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  number: varchar("number").unique().notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  clientName: varchar("client_name"),
  clientContact: varchar("client_contact"),
  budget: decimal("budget", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status").notNull().default("active"), // active, on-hold, completed, cancelled
  companyId: integer("company_id").references(() => companies.id).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Markup percentages for each category
  markupLabor: decimal("markup_labor", { precision: 5, scale: 2 }).default("15.00"),
  markupMaterials: decimal("markup_materials", { precision: 5, scale: 2 }).default("25.00"),
  markupEquipmentOwned: decimal("markup_equipment_owned", { precision: 5, scale: 2 }).default("20.00"),
  markupEquipmentRented: decimal("markup_equipment_rented", { precision: 5, scale: 2 }).default("15.00"),
  markupDisposal: decimal("markup_disposal", { precision: 5, scale: 2 }).default("15.00"),
  markupImport: decimal("markup_import", { precision: 5, scale: 2 }).default("15.00"),
  markupSubcontractors: decimal("markup_subcontractors", { precision: 5, scale: 2 }).default("10.00"),
});

// Change orders (GC Change Orders)
export const changeOrders = pgTable("change_orders", {
  id: serial("id").primaryKey(),
  number: varchar("number").unique().notNull(),
  projectId: integer("project_id").references(() => projects.id),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("draft"), // draft, pending, submitted, approved, rejected
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  laborAmount: decimal("labor_amount", { precision: 10, scale: 2 }),
  materialAmount: decimal("material_amount", { precision: 10, scale: 2 }),
  equipmentAmount: decimal("equipment_amount", { precision: 10, scale: 2 }),
  disposalAmount: decimal("disposal_amount", { precision: 10, scale: 2 }),
  importAmount: decimal("import_amount", { precision: 10, scale: 2 }),
  subcontractorAmount: decimal("subcontractor_amount", { precision: 10, scale: 2 }),
  data: jsonb("data"), // Detailed breakdown data (legacy - use draftState for AI workflow)
  draftState: jsonb("draft_state"), // AI workflow state machine - validated by DraftStateSchema
  backupDocumentIds: jsonb("backup_document_ids"), // Array of document IDs used as backup
  // CO Log fields
  ccoNumber: varchar("cco_number"), // Client Change Order number
  pcoNumber: varchar("pco_number"), // Potential Change Order number
  rfiNumber: varchar("rfi_number"), // Request for Information number
  ballInCourt: varchar("ball_in_court"), // Who needs to take action
  assignedPm: varchar("assigned_pm"), // Project Manager assigned
  timeRequested: integer("time_requested"), // Calendar days requested
  // Enhanced CO Log fields
  gcRfcNumber: varchar("gc_rfc_number"), // GC Request for Change number
  gcCoNumber: varchar("gc_co_number"), // GC Change Order number
  amountSubmitted: decimal("amount_submitted", { precision: 12, scale: 2 }), // Amount submitted to owner/GC
  amountApproved: decimal("amount_approved", { precision: 12, scale: 2 }), // Amount approved by owner/GC
  dateSubmitted: timestamp("date_submitted"), // Date submitted to owner/GC
  dateApproved: timestamp("date_approved"), // Date approved by owner/GC
  fundingSource: varchar("funding_source"), // Source of funding if specified
  notes: text("notes"), // Additional notes
  // Aggregated subcontractor totals (cached for performance)
  subAmountSubmitted: decimal("sub_amount_submitted", { precision: 12, scale: 2 }),
  subAmountApproved: decimal("sub_amount_approved", { precision: 12, scale: 2 }),
  createdBy: varchar("created_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  // Export tracking
  lastExportedAt: timestamp("last_exported_at"),
  exportedFiles: jsonb("exported_files"), // Array of exported file references
});

// Subcontractors table
export const subcontractors = pgTable("subcontractors", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  companyName: varchar("company_name"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  address: text("address"),
  licenseNumber: varchar("license_number"),
  tradeType: varchar("trade_type"), // electrical, plumbing, concrete, etc.
  companyId: integer("company_id").references(() => companies.id).notNull(), // Which GC company manages this sub
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subcontractor Change Orders (SCOs)
export const subcontractorChangeOrders = pgTable("subcontractor_change_orders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  gcChangeOrderId: integer("gc_change_order_id").references(() => changeOrders.id).notNull(), // Parent GC CO/RFC
  subcontractorId: integer("subcontractor_id").references(() => subcontractors.id).notNull(),
  subRfcNumber: varchar("sub_rfc_number"), // Sub's RFC number
  scoNumber: varchar("sco_number"), // SCO number (auto or manual)
  amountSubmitted: decimal("amount_submitted", { precision: 12, scale: 2 }), // Amount submitted by sub
  dateSubmitted: timestamp("date_submitted"), // Date submitted to GC
  amountApproved: decimal("amount_approved", { precision: 12, scale: 2 }), // Amount approved by GC
  dateApproved: timestamp("date_approved"), // Date approved by GC
  scoIssued: boolean("sco_issued").default(false), // Has SCO been issued?
  scoType: varchar("sco_type"), // T&M, Proceed Under Dispute, Full Amount
  ccoNumber: varchar("cco_number"), // Related CCO number if applicable
  notes: text("notes"), // Additional notes
  attachments: jsonb("attachments"), // File references
  status: varchar("status").notNull().default("draft"), // draft, pending, approved, rejected, disputed
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sco_project_gc").on(table.projectId, table.gcChangeOrderId),
  index("idx_sco_number").on(table.projectId, table.scoNumber),
]);

// Numbering sequences for auto-numbering
export const numberingSequences = pgTable("numbering_sequences", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  sequenceType: varchar("sequence_type").notNull(), // GC_RFC, GC_CO, SCO, SCO_PER_SUB
  subcontractorId: integer("subcontractor_id").references(() => subcontractors.id), // For per-subcontractor SCO sequences
  prefix: varchar("prefix"), // Optional prefix (e.g., "RFC-", "CO-", "SCO-")
  currentValue: integer("current_value").notNull().default(0),
  format: varchar("format"), // Format string (e.g., "{prefix}{number:03d}")
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_numbering_sequence").on(table.projectId, table.sequenceType, table.subcontractorId),
]);

// Document processing
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  type: varchar("type").notNull(), // tm_sheet, invoice, rate_table, supporting_doc, quote
  status: varchar("status").notNull().default("uploaded"), // uploaded, processing, processed, failed
  extractedData: jsonb("extracted_data"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  changeOrderId: integer("change_order_id").references(() => changeOrders.id),
  projectId: integer("project_id").references(() => projects.id),
  isReusable: boolean("is_reusable").default(false), // Mark as reusable backup/template
  isBackup: boolean("is_backup").default(false), // Mark as backup document for COs
  uploadedBy: varchar("uploaded_by").references(() => users.id),
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
  userId: varchar("user_id").references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Change Order Logs - Construction PM Communication & Documentation
export const changeOrderLogs = pgTable("change_order_logs", {
  id: serial("id").primaryKey(),
  changeOrderId: integer("change_order_id").notNull().references(() => changeOrders.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  logType: varchar("log_type").notNull(), // meeting, phone_call, email, site_visit, rfi_response, decision, weather_delay, inspection
  subject: varchar("subject").notNull(), // Brief subject line
  description: text("description").notNull(), // Detailed notes
  
  // Meeting/Communication fields
  attendees: text("attendees"), // Who was present/involved
  location: varchar("location"), // Where (job site, office, virtual)
  meetingDate: timestamp("meeting_date"), // When the meeting/call occurred
  
  // Decision tracking
  decisionRequired: boolean("decision_required").default(false),
  decisionMade: text("decision_made"),
  actionItems: jsonb("action_items"), // Array of {task, assignee, dueDate}
  
  // Impact tracking
  costImpact: decimal("cost_impact", { precision: 12, scale: 2 }),
  scheduleImpact: integer("schedule_impact"), // Days
  weatherConditions: varchar("weather_conditions"), // For delay documentation
  
  // References
  rfiNumber: varchar("rfi_number"), // Related RFI
  submittals: jsonb("submittals"), // Related submittal numbers
  attachments: jsonb("attachments"), // File references/photos
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  createdByName: varchar("created_by_name"), // Denormalized for display
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Owner/Client visibility
  sharedWithOwner: boolean("shared_with_owner").default(false),
  ownerResponse: text("owner_response"),
  ownerResponseDate: timestamp("owner_response_date"),
});

// Chat conversations
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  messages: jsonb("messages").notNull(),
  title: varchar("title"), // Quick reference for the conversation
  metadata: jsonb("metadata"), // Workflow state, draft CO data, context
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
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
}).extend({
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
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

export const insertChangeOrderLogSchema = createInsertSchema(changeOrderLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubcontractorSchema = createInsertSchema(subcontractors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubcontractorChangeOrderSchema = createInsertSchema(subcontractorChangeOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNumberingSequenceSchema = createInsertSchema(numberingSequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type UpsertUser = typeof users.$inferInsert;
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
export type ChangeOrderLog = typeof changeOrderLogs.$inferSelect;
export type InsertChangeOrderLog = z.infer<typeof insertChangeOrderLogSchema>;
export type Subcontractor = typeof subcontractors.$inferSelect;
export type InsertSubcontractor = z.infer<typeof insertSubcontractorSchema>;
export type SubcontractorChangeOrder = typeof subcontractorChangeOrders.$inferSelect;
export type InsertSubcontractorChangeOrder = z.infer<typeof insertSubcontractorChangeOrderSchema>;
export type NumberingSequence = typeof numberingSequences.$inferSelect;
export type InsertNumberingSequence = z.infer<typeof insertNumberingSequenceSchema>;
