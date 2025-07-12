import {
  users,
  projects,
  changeOrders,
  documents,
  rateTables,
  auditLogs,
  chatConversations,
  type User,
  type InsertUser,
  type UpsertUser,
  type Project,
  type InsertProject,
  type ChangeOrder,
  type InsertChangeOrder,
  type Document,
  type InsertDocument,
  type RateTable,
  type InsertRateTable,
  type AuditLog,
  type InsertAuditLog,
  type ChatConversation,
  type InsertChatConversation,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;

  // Project operations
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project>;

  // Change order operations
  getChangeOrders(filters?: { page?: number; limit?: number; status?: string; projectId?: number }): Promise<{ data: ChangeOrder[]; total: number }>;
  getChangeOrder(id: number): Promise<ChangeOrder | undefined>;
  createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder>;
  updateChangeOrder(id: number, changeOrder: Partial<ChangeOrder>): Promise<ChangeOrder>;

  // Document operations
  getDocuments(projectId?: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<Document>;

  // Rate table operations
  getRateTables(): Promise<RateTable[]>;
  getRateTable(id: number): Promise<RateTable | undefined>;
  createRateTable(rateTable: InsertRateTable): Promise<RateTable>;
  approveRateTable(id: number, reviewedBy: number): Promise<RateTable>;

  // Chat operations
  getChatConversations(userId?: number): Promise<ChatConversation[]>;
  getChatConversation(id: number): Promise<ChatConversation | undefined>;
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  updateChatConversation(id: number, conversation: Partial<ChatConversation>): Promise<ChatConversation>;

  // Analytics
  getDashboardStats(projectId?: number): Promise<{
    totalChangeOrders: number;
    totalValue: number;
    pendingApproval: number;
    aiProcessedRate: number;
  }>;

  getProjectAnalytics(projectId: number): Promise<{
    totalChangeOrders: number;
    totalValue: number;
    avgChangeOrderValue: number;
    statusBreakdown: Array<{
      status: string;
      count: number;
      value: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      changeOrders: number;
      value: number;
    }>;
  }>;

  // Audit
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(projects.createdAt);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  // Change order operations
  async getChangeOrders(filters?: { page?: number; limit?: number; status?: string; projectId?: number }): Promise<{ data: ChangeOrder[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(changeOrders.status, filters.status));
    }
    if (filters?.projectId) {
      conditions.push(eq(changeOrders.projectId, filters.projectId));
    }

    // Get data
    const data = conditions.length > 0 
      ? await db.select().from(changeOrders)
          .where(and(...conditions))
          .orderBy(desc(changeOrders.createdAt)).limit(limit).offset(offset)
      : await db.select().from(changeOrders)
          .orderBy(desc(changeOrders.createdAt)).limit(limit).offset(offset);

    // Get total count
    const totalResult = conditions.length > 0 
      ? await db.select({ count: count() }).from(changeOrders)
          .where(and(...conditions))
      : await db.select({ count: count() }).from(changeOrders);

    return {
      data,
      total: totalResult[0]?.count || 0
    };
  }

  async getChangeOrder(id: number): Promise<ChangeOrder | undefined> {
    const [changeOrder] = await db.select().from(changeOrders).where(eq(changeOrders.id, id));
    return changeOrder;
  }

  async createChangeOrder(changeOrderData: InsertChangeOrder): Promise<ChangeOrder> {
    // Generate change order number
    const countResult = await db.select({ count: count() }).from(changeOrders);
    const totalCount = countResult[0]?.count || 0;
    const coNumber = `CO-${new Date().getFullYear()}-${String(totalCount + 1).padStart(3, '0')}`;
    
    const [changeOrder] = await db.insert(changeOrders).values({
      ...changeOrderData,
      number: coNumber,
    }).returning();
    
    return changeOrder;
  }

  async updateChangeOrder(id: number, changeOrderData: Partial<ChangeOrder>): Promise<ChangeOrder> {
    const [changeOrder] = await db
      .update(changeOrders)
      .set({ ...changeOrderData, updatedAt: new Date() })
      .where(eq(changeOrders.id, id))
      .returning();
    return changeOrder;
  }

  // Document operations
  async getDocuments(projectId?: number): Promise<Document[]> {
    if (projectId) {
      const result = await db.select().from(documents)
        .where(eq(documents.projectId, projectId))
        .orderBy(desc(documents.uploadedAt));
      return result;
    }
    
    const result = await db.select().from(documents).orderBy(desc(documents.uploadedAt));
    return result;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async createDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(documentData).returning();
    return document;
  }

  async updateDocument(id: number, documentData: Partial<Document>): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set(documentData)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  // Rate table operations
  async getRateTables(): Promise<RateTable[]> {
    return await db.select().from(rateTables).orderBy(desc(rateTables.extractedAt));
  }

  async getRateTable(id: number): Promise<RateTable | undefined> {
    const [rateTable] = await db.select().from(rateTables).where(eq(rateTables.id, id));
    return rateTable;
  }

  async createRateTable(rateTableData: InsertRateTable): Promise<RateTable> {
    const [rateTable] = await db.insert(rateTables).values(rateTableData).returning();
    return rateTable;
  }

  async approveRateTable(id: number, reviewedBy: number): Promise<RateTable> {
    const [rateTable] = await db
      .update(rateTables)
      .set({
        isApproved: true,
        reviewedBy: reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(rateTables.id, id))
      .returning();
    return rateTable;
  }

  // Chat operations
  async getChatConversations(userId?: number): Promise<ChatConversation[]> {
    if (userId) {
      return await db.select().from(chatConversations)
        .where(eq(chatConversations.userId, userId))
        .orderBy(desc(chatConversations.updatedAt));
    }
    
    return await db.select().from(chatConversations)
      .orderBy(desc(chatConversations.updatedAt));
  }

  async getChatConversation(id: number): Promise<ChatConversation | undefined> {
    const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
    return conversation;
  }

  async createChatConversation(conversationData: InsertChatConversation): Promise<ChatConversation> {
    const [conversation] = await db.insert(chatConversations).values(conversationData).returning();
    return conversation;
  }

  async updateChatConversation(id: number, conversationData: Partial<ChatConversation>): Promise<ChatConversation> {
    const [conversation] = await db
      .update(chatConversations)
      .set({ ...conversationData, updatedAt: new Date() })
      .where(eq(chatConversations.id, id))
      .returning();
    return conversation;
  }

  // Analytics
  async getDashboardStats(projectId?: number): Promise<{
    totalChangeOrders: number;
    totalValue: number;
    pendingApproval: number;
    aiProcessedRate: number;
  }> {
    const baseConditions = projectId ? [eq(changeOrders.projectId, projectId)] : [];
    
    const [totalCOs] = baseConditions.length > 0 
      ? await db.select({ count: count() }).from(changeOrders).where(and(...baseConditions))
      : await db.select({ count: count() }).from(changeOrders);
    
    const [totalValue] = baseConditions.length > 0 
      ? await db.select({ sum: count() }).from(changeOrders).where(and(...baseConditions))
      : await db.select({ sum: count() }).from(changeOrders);
    
    const [pendingCOs] = baseConditions.length > 0 
      ? await db.select({ count: count() }).from(changeOrders).where(and(...baseConditions, eq(changeOrders.status, 'pending')))
      : await db.select({ count: count() }).from(changeOrders).where(eq(changeOrders.status, 'pending'));
    
    const [totalDocs] = await db.select({ count: count() }).from(documents);
    const [processedDocs] = await db.select({ count: count() }).from(documents)
      .where(eq(documents.status, 'processed'));

    return {
      totalChangeOrders: totalCOs.count,
      totalValue: 0, // Calculate actual value from change orders
      pendingApproval: pendingCOs.count,
      aiProcessedRate: totalDocs.count > 0 ? (processedDocs.count / totalDocs.count) * 100 : 0,
    };
  }

  // Audit
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logData).returning();
    return log;
  }

  async getProjectAnalytics(projectId: number): Promise<{
    totalChangeOrders: number;
    totalValue: number;
    avgChangeOrderValue: number;
    statusBreakdown: Array<{
      status: string;
      count: number;
      value: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      changeOrders: number;
      value: number;
    }>;
  }> {
    // Get project change orders
    const projectChangeOrders = await db.select().from(changeOrders)
      .where(eq(changeOrders.projectId, projectId))
      .orderBy(desc(changeOrders.createdAt));

    const totalChangeOrders = projectChangeOrders.length;
    const totalValue = projectChangeOrders.reduce((sum, co) => sum + (Number(co.totalAmount) || 0), 0);
    const avgChangeOrderValue = totalChangeOrders > 0 ? totalValue / totalChangeOrders : 0;

    // Status breakdown
    const statusMap = new Map<string, { count: number; value: number }>();
    projectChangeOrders.forEach(co => {
      const status = co.status;
      if (!statusMap.has(status)) {
        statusMap.set(status, { count: 0, value: 0 });
      }
      const statusData = statusMap.get(status)!;
      statusData.count += 1;
      statusData.value += Number(co.totalAmount) || 0;
    });

    const statusBreakdown = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      value: data.value
    }));

    // Monthly trends (last 12 months)
    const monthlyMap = new Map<string, { changeOrders: number; value: number }>();
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM format
      monthlyMap.set(monthKey, { changeOrders: 0, value: 0 });
    }

    projectChangeOrders.forEach(co => {
      if (co.createdAt) {
        const monthKey = co.createdAt.toISOString().substring(0, 7);
        if (monthlyMap.has(monthKey)) {
          const monthData = monthlyMap.get(monthKey)!;
          monthData.changeOrders += 1;
          monthData.value += Number(co.totalAmount) || 0;
        }
      }
    });

    const monthlyTrends = Array.from(monthlyMap.entries()).map(([monthKey, data]) => ({
      month: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short' }),
      changeOrders: data.changeOrders,
      value: data.value
    }));

    return {
      totalChangeOrders,
      totalValue,
      avgChangeOrderValue,
      statusBreakdown,
      monthlyTrends
    };
  }
}

export const storage = new DatabaseStorage();
