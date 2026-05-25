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
  vector,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom vector type for pgvector (1536 dimensions for OpenAI text-embedding-3-small)
const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value.replace(/^\[/, "[").replace(/\]$/, "]"));
  },
});

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
  // Semantic search fields
  searchableText: text("searchable_text"), // Concatenated searchable content from data
  embedding: vector1536("embedding"), // OpenAI text-embedding-3-small (1536 dimensions)
  embeddingUpdatedAt: timestamp("embedding_updated_at"),
  extractedAt: timestamp("extracted_at").defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  isApproved: boolean("is_approved").default(false),
});

// Individual rate items for semantic search (flattened from rateTables.data)
export const rateItems = pgTable("rate_items", {
  id: serial("id").primaryKey(),
  rateTableId: integer("rate_table_id").references(() => rateTables.id).notNull(),
  type: varchar("type").notNull(), // labor, equipment, material, disposal, import
  description: text("description").notNull(), // Primary searchable field
  classification: varchar("classification"), // Labor classification, equipment type, etc.
  unit: varchar("unit").notNull(), // hour, day, ton, each, etc.
  rate: decimal("rate", { precision: 12, scale: 4 }).notNull(),
  overtimeRate: decimal("overtime_rate", { precision: 12, scale: 4 }),
  // Semantic search
  searchableText: text("searchable_text"), // description + classification + synonyms
  embedding: vector1536("embedding"), // OpenAI text-embedding-3-small
  embeddingUpdatedAt: timestamp("embedding_updated_at"),
  // Metadata
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  region: varchar("region"),
  companyId: integer("company_id").references(() => companies.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_rate_items_type").on(table.type),
  index("idx_rate_items_company").on(table.companyId),
  index("idx_rate_items_active").on(table.isActive),
]);

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
  contactName: varchar("contact_name"),
  insuranceInfo: varchar("insurance_info"),
  notes: text("notes"),
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

// RFIs
export const rfis = pgTable("rfis", {
  id: serial("id").primaryKey(),
  number: varchar("number").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  subject: varchar("subject").notNull(),
  question: text("question").notNull(),
  suggestedAnswer: text("suggested_answer"),
  costImpact: varchar("cost_impact").default("undetermined"), // yes, no, undetermined
  scheduleImpact: integer("schedule_impact").default(0), // days
  priority: varchar("priority").default("medium"), // low, medium, high
  status: varchar("status").default("open"), // draft, open, answered, closed, rejected
  ballInCourt: varchar("ball_in_court"),
  dueDate: timestamp("due_date"),
  discipline: varchar("discipline"),
  location: varchar("location"),
  linkedDrawings: jsonb("linked_drawings"),
  linkedSpecs: jsonb("linked_specs"),
  attachments: jsonb("attachments"), // array of doc references
  documentId: integer("document_id").references(() => documents.id),
  officialResponse: text("official_response"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RFI Comments
export const rfiComments = pgTable("rfi_comments", {
  id: serial("id").primaryKey(),
  rfiId: integer("rfi_id").references(() => rfis.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  comment: text("comment").notNull(),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Submittals
export const submittals = pgTable("submittals", {
  id: serial("id").primaryKey(),
  number: varchar("number").notNull(),
  title: varchar("title").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  specSection: varchar("spec_section"), // e.g. "02 82 13 Asbestos Abatement"
  package: varchar("package"),
  type: varchar("type").default("product_data"), // shop_drawing, product_data, sample, other
  responsibleContractorId: integer("responsible_contractor_id").references(() => subcontractors.id),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  requiredDate: timestamp("required_date"),
  receivedDate: timestamp("received_date"),
  returnedDate: timestamp("returned_date"),
  status: varchar("status").default("open"), // draft, open, pending_review, approved, approved_as_noted, revise_resubmit, rejected
  ballInCourt: varchar("ball_in_court"),
  attachments: jsonb("attachments"),
  documentId: integer("document_id").references(() => documents.id),
  revision: integer("revision").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Submittal Reviews
export const submittalReviews = pgTable("submittal_reviews", {
  id: serial("id").primaryKey(),
  submittalId: integer("submittal_id").references(() => submittals.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  status: varchar("status").notNull(), // approved, approved_as_noted, revise_resubmit, rejected
  comments: text("comments"),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks / Punch List
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").default("open"), // open, in_progress, completed, verified, closed
  priority: varchar("priority").default("medium"), // low, medium, high
  dueDate: timestamp("due_date"),
  assigneeId: varchar("assignee_id").references(() => users.id),
  assigneeName: varchar("assignee_name"),
  location: varchar("location"),
  attachments: jsonb("attachments"),
  comments: jsonb("comments"), // JSON list of comments [{text, userId, createdAt}]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cost Codes
export const costCodes = pgTable("cost_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code").notNull(), // e.g. "02-100"
  name: varchar("name").notNull(), // e.g. "Structure Demolition"
  companyId: integer("company_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Budget Line Items
export const budgetLineItems = pgTable("budget_line_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  costCodeId: integer("cost_code_id").references(() => costCodes.id).notNull(),
  originalBudget: decimal("original_budget", { precision: 12, scale: 2 }).default("0.00"),
  approvedChanges: decimal("approved_changes", { precision: 12, scale: 2 }).default("0.00"),
  pendingChanges: decimal("pending_changes", { precision: 12, scale: 2 }).default("0.00"),
  committedCosts: decimal("committed_costs", { precision: 12, scale: 2 }).default("0.00"),
  forecastCost: decimal("forecast_cost", { precision: 12, scale: 2 }).default("0.00"),
  estimatedAtCompletion: decimal("estimated_at_completion", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule Activities
export const scheduleActivities = pgTable("schedule_activities", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: varchar("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  finishDate: timestamp("finish_date").notNull(),
  duration: integer("duration").notNull(), // days
  predecessors: jsonb("predecessors"), // array of activity IDs
  successors: jsonb("successors"),
  percentComplete: integer("percent_complete").default(0),
  responsibleParty: varchar("responsible_party"),
  phase: varchar("phase"),
  location: varchar("location"),
  criticalPath: boolean("critical_path").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bid Packages
export const bidPackages = pgTable("bid_packages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  tradeCategory: varchar("trade_category"),
  dueDate: timestamp("due_date"),
  status: varchar("status").default("draft"), // draft, active, closed, awarded
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bid Invitations (Maps subcontractors to bid packages with access tokens)
export const bidInvitations = pgTable("bid_invitations", {
  id: serial("id").primaryKey(),
  bidPackageId: integer("bid_package_id").references(() => bidPackages.id).notNull(),
  subcontractorId: integer("subcontractor_id").references(() => subcontractors.id).notNull(),
  token: varchar("token").notNull(), // Secure invitation UUID/string
  inviteeEmail: varchar("invitee_email").notNull(),
  status: varchar("status").default("invited"), // invited, viewed, intending_to_bid, declined, submitted, awarded, not_awarded
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bid Submissions
export const bidSubmissions = pgTable("bid_submissions", {
  id: serial("id").primaryKey(),
  bidInvitationId: integer("bid_invitation_id").references(() => bidInvitations.id).notNull(),
  baseBid: decimal("base_bid", { precision: 12, scale: 2 }).notNull(),
  alternates: jsonb("alternates"), // [{name, amount}]
  unitPrices: jsonb("unit_prices"), // [{item, price, unit}]
  clarifications: text("clarifications"),
  exclusions: text("exclusions"),
  attachments: jsonb("attachments"),
  isAwarded: boolean("is_awarded").default(false),
  submittedAt: timestamp("submitted_at").defaultNow(),
  submittedBy: varchar("submitted_by"),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  link: varchar("link"),
  createdAt: timestamp("created_at").defaultNow(),
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
  embeddingUpdatedAt: true,
});

export const insertRateItemSchema = createInsertSchema(rateItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  embeddingUpdatedAt: true,
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

export const insertRfiSchema = createInsertSchema(rfis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRfiCommentSchema = createInsertSchema(rfiComments).omit({
  id: true,
  createdAt: true,
});

export const insertSubmittalSchema = createInsertSchema(submittals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubmittalReviewSchema = createInsertSchema(submittalReviews).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCostCodeSchema = createInsertSchema(costCodes).omit({
  id: true,
  createdAt: true,
});

export const insertBudgetLineItemSchema = createInsertSchema(budgetLineItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleActivitySchema = createInsertSchema(scheduleActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBidPackageSchema = createInsertSchema(bidPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBidInvitationSchema = createInsertSchema(bidInvitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBidSubmissionSchema = createInsertSchema(bidSubmissions).omit({
  id: true,
  submittedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
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
export type RateItem = typeof rateItems.$inferSelect;
export type InsertRateItem = z.infer<typeof insertRateItemSchema>;
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

export type Rfi = typeof rfis.$inferSelect;
export type InsertRfi = z.infer<typeof insertRfiSchema>;
export type RfiComment = typeof rfiComments.$inferSelect;
export type InsertRfiComment = z.infer<typeof insertRfiCommentSchema>;
export type Submittal = typeof submittals.$inferSelect;
export type InsertSubmittal = z.infer<typeof insertSubmittalSchema>;
export type SubmittalReview = typeof submittalReviews.$inferSelect;
export type InsertSubmittalReview = z.infer<typeof insertSubmittalReviewSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type CostCode = typeof costCodes.$inferSelect;
export type InsertCostCode = z.infer<typeof insertCostCodeSchema>;
export type BudgetLineItem = typeof budgetLineItems.$inferSelect;
export type InsertBudgetLineItem = z.infer<typeof insertBudgetLineItemSchema>;
export type ScheduleActivity = typeof scheduleActivities.$inferSelect;
export type InsertScheduleActivity = z.infer<typeof insertScheduleActivitySchema>;
export type BidPackage = typeof bidPackages.$inferSelect;
export type InsertBidPackage = z.infer<typeof insertBidPackageSchema>;
export type BidInvitation = typeof bidInvitations.$inferSelect;
export type InsertBidInvitation = z.infer<typeof insertBidInvitationSchema>;
export type BidSubmission = typeof bidSubmissions.$inferSelect;
export type InsertBidSubmission = z.infer<typeof insertBidSubmissionSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

