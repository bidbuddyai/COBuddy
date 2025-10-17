import {
  users,
  companies,
  projects,
  changeOrders,
  documents,
  rateTables,
  auditLogs,
  chatConversations,
  changeOrderLogs,
  subcontractors,
  subcontractorChangeOrders,
  numberingSequences,
  type User,
  type InsertUser,
  type UpsertUser,
  type Company,
  type InsertCompany,
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
  type ChangeOrderLog,
  type InsertChangeOrderLog,
  type Subcontractor,
  type InsertSubcontractor,
  type SubcontractorChangeOrder,
  type InsertSubcontractorChangeOrder,
  type NumberingSequence,
  type InsertNumberingSequence,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, or, isNull, ne } from "drizzle-orm";

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  getUsersByCompanyId(companyId: number): Promise<User[]>;

  // Project operations
  getProjects(companyId?: number): Promise<Project[]>;
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

  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByDomain(domain: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company>;

  // Rate table operations
  getRateTables(companyId?: number): Promise<RateTable[]>;
  getRateTable(id: number): Promise<RateTable | undefined>;
  createRateTable(rateTable: InsertRateTable): Promise<RateTable>;
  approveRateTable(id: number, reviewedBy: string): Promise<RateTable>;
  updateRateTable(id: number, data: Partial<RateTable>): Promise<RateTable>;
  getPublicRateTables(): Promise<RateTable[]>;

  // Chat operations
  getChatConversations(userId?: string): Promise<ChatConversation[]>;
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

  // Change Order Logs
  getChangeOrderLogs(projectId: number, changeOrderId?: number): Promise<ChangeOrderLog[]>;
  getChangeOrderLog(id: number): Promise<ChangeOrderLog | undefined>;
  createChangeOrderLog(log: InsertChangeOrderLog): Promise<ChangeOrderLog>;
  updateChangeOrderLog(id: number, log: Partial<ChangeOrderLog>): Promise<ChangeOrderLog>;
  getProjectLogsByType(projectId: number, logType: string): Promise<ChangeOrderLog[]>;
  
  // Subcontractor operations
  getSubcontractors(companyId: number): Promise<Subcontractor[]>;
  getSubcontractor(id: number): Promise<Subcontractor | undefined>;
  createSubcontractor(subcontractor: InsertSubcontractor): Promise<Subcontractor>;
  updateSubcontractor(id: number, subcontractor: Partial<Subcontractor>): Promise<Subcontractor>;
  
  // Subcontractor Change Order operations
  getSubcontractorChangeOrders(filters?: { projectId?: number; gcChangeOrderId?: number; subcontractorId?: number }): Promise<SubcontractorChangeOrder[]>;
  getSubcontractorChangeOrder(id: number): Promise<SubcontractorChangeOrder | undefined>;
  createSubcontractorChangeOrder(sco: InsertSubcontractorChangeOrder): Promise<SubcontractorChangeOrder>;
  updateSubcontractorChangeOrder(id: number, sco: Partial<SubcontractorChangeOrder>): Promise<SubcontractorChangeOrder>;
  getSubcontractorChangeOrdersByGcCo(gcChangeOrderId: number): Promise<SubcontractorChangeOrder[]>;
  
  // Numbering sequence operations
  getNextNumber(projectId: number, sequenceType: string, subcontractorId?: number): Promise<string>;
  updateNumberingSequence(projectId: number, sequenceType: string, newValue: number, subcontractorId?: number): Promise<NumberingSequence>;
  initializeNumberingFromImport(projectId: number, sequenceType: string, importedNumbers: string[]): Promise<void>;
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

  async getUsersByCompanyId(companyId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  // Project operations
  async getProjects(companyId?: number): Promise<Project[]> {
    if (companyId) {
      return await db.select().from(projects)
        .where(eq(projects.companyId, companyId))
        .orderBy(projects.createdAt);
    }
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
        .where(and(
          eq(documents.projectId, projectId),
          ne(documents.status, 'deleted')
        ))
        .orderBy(desc(documents.uploadedAt));
      return result;
    }
    
    const result = await db.select().from(documents)
      .where(ne(documents.status, 'deleted'))
      .orderBy(desc(documents.uploadedAt));
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
  async getRateTables(companyId?: number): Promise<RateTable[]> {
    if (companyId) {
      return await db.select().from(rateTables)
        .where(eq(rateTables.companyId, companyId))
        .orderBy(desc(rateTables.extractedAt));
    }
    
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

  async approveRateTable(id: number, reviewedBy: string): Promise<RateTable> {
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

  async updateRateTable(id: number, data: Partial<RateTable>): Promise<RateTable> {
    const [rateTable] = await db
      .update(rateTables)
      .set(data)
      .where(eq(rateTables.id, id))
      .returning();
    return rateTable;
  }

  async getPublicRateTables(): Promise<RateTable[]> {
    return await db.select().from(rateTables)
      .where(isNull(rateTables.companyId))
      .orderBy(desc(rateTables.extractedAt));
  }

  // Company operations
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyByDomain(domain: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.domain, domain));
    return company;
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(companyData).returning();
    return company;
  }

  async updateCompany(id: number, companyData: Partial<Company>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ ...companyData, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  // Chat operations
  async getChatConversations(userId?: string): Promise<ChatConversation[]> {
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

  // Change Order Logs
  async getChangeOrderLogs(projectId: number, changeOrderId?: number): Promise<ChangeOrderLog[]> {
    const conditions = [eq(changeOrderLogs.projectId, projectId)];
    
    if (changeOrderId) {
      conditions.push(eq(changeOrderLogs.changeOrderId, changeOrderId));
    }
    
    const logs = await db
      .select()
      .from(changeOrderLogs)
      .where(and(...conditions))
      .orderBy(desc(changeOrderLogs.createdAt));
      
    return logs;
  }

  async getChangeOrderLog(id: number): Promise<ChangeOrderLog | undefined> {
    const [log] = await db
      .select()
      .from(changeOrderLogs)
      .where(eq(changeOrderLogs.id, id));
      
    return log;
  }

  async createChangeOrderLog(log: InsertChangeOrderLog): Promise<ChangeOrderLog> {
    const [newLog] = await db
      .insert(changeOrderLogs)
      .values({
        ...log,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
      
    return newLog;
  }

  async updateChangeOrderLog(id: number, log: Partial<ChangeOrderLog>): Promise<ChangeOrderLog> {
    const [updatedLog] = await db
      .update(changeOrderLogs)
      .set({
        ...log,
        updatedAt: new Date(),
      })
      .where(eq(changeOrderLogs.id, id))
      .returning();
      
    if (!updatedLog) {
      throw new Error("Change order log not found");
    }
    
    return updatedLog;
  }

  async getProjectLogsByType(projectId: number, logType: string): Promise<ChangeOrderLog[]> {
    const logs = await db
      .select()
      .from(changeOrderLogs)
      .where(
        and(
          eq(changeOrderLogs.projectId, projectId),
          eq(changeOrderLogs.logType, logType)
        )
      )
      .orderBy(desc(changeOrderLogs.createdAt));
      
    return logs;
  }
  
  // Subcontractor operations
  async getSubcontractors(companyId: number): Promise<Subcontractor[]> {
    return await db.select().from(subcontractors)
      .where(eq(subcontractors.companyId, companyId))
      .orderBy(subcontractors.name);
  }

  async getSubcontractor(id: number): Promise<Subcontractor | undefined> {
    const [subcontractor] = await db.select().from(subcontractors).where(eq(subcontractors.id, id));
    return subcontractor;
  }

  async createSubcontractor(subcontractorData: InsertSubcontractor): Promise<Subcontractor> {
    const [subcontractor] = await db.insert(subcontractors).values(subcontractorData).returning();
    return subcontractor;
  }

  async updateSubcontractor(id: number, subcontractorData: Partial<Subcontractor>): Promise<Subcontractor> {
    const [subcontractor] = await db
      .update(subcontractors)
      .set({ ...subcontractorData, updatedAt: new Date() })
      .where(eq(subcontractors.id, id))
      .returning();
    return subcontractor;
  }
  
  // Subcontractor Change Order operations
  async getSubcontractorChangeOrders(filters?: { projectId?: number; gcChangeOrderId?: number; subcontractorId?: number }): Promise<SubcontractorChangeOrder[]> {
    const conditions = [];
    
    if (filters?.projectId) {
      conditions.push(eq(subcontractorChangeOrders.projectId, filters.projectId));
    }
    if (filters?.gcChangeOrderId) {
      conditions.push(eq(subcontractorChangeOrders.gcChangeOrderId, filters.gcChangeOrderId));
    }
    if (filters?.subcontractorId) {
      conditions.push(eq(subcontractorChangeOrders.subcontractorId, filters.subcontractorId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(subcontractorChangeOrders)
        .where(and(...conditions))
        .orderBy(desc(subcontractorChangeOrders.createdAt));
    }
    
    return await db.select().from(subcontractorChangeOrders)
      .orderBy(desc(subcontractorChangeOrders.createdAt));
  }

  async getSubcontractorChangeOrder(id: number): Promise<SubcontractorChangeOrder | undefined> {
    const [sco] = await db.select().from(subcontractorChangeOrders).where(eq(subcontractorChangeOrders.id, id));
    return sco;
  }

  async createSubcontractorChangeOrder(scoData: InsertSubcontractorChangeOrder): Promise<SubcontractorChangeOrder> {
    const [sco] = await db.insert(subcontractorChangeOrders).values(scoData).returning();
    
    // Update parent GC CO aggregated amounts
    await this.updateGcCoAggregates(scoData.gcChangeOrderId);
    
    return sco;
  }

  async updateSubcontractorChangeOrder(id: number, scoData: Partial<SubcontractorChangeOrder>): Promise<SubcontractorChangeOrder> {
    const [sco] = await db
      .update(subcontractorChangeOrders)
      .set({ ...scoData, updatedAt: new Date() })
      .where(eq(subcontractorChangeOrders.id, id))
      .returning();
      
    // Update parent GC CO aggregated amounts
    if (sco) {
      await this.updateGcCoAggregates(sco.gcChangeOrderId);
    }
    
    return sco;
  }
  
  async getSubcontractorChangeOrdersByGcCo(gcChangeOrderId: number): Promise<SubcontractorChangeOrder[]> {
    return await db.select().from(subcontractorChangeOrders)
      .where(eq(subcontractorChangeOrders.gcChangeOrderId, gcChangeOrderId))
      .orderBy(subcontractorChangeOrders.scoNumber);
  }
  
  // Helper method to update GC CO aggregated subcontractor amounts
  private async updateGcCoAggregates(gcChangeOrderId: number): Promise<void> {
    const scos = await this.getSubcontractorChangeOrdersByGcCo(gcChangeOrderId);
    
    let subAmountSubmitted = 0;
    let subAmountApproved = 0;
    
    for (const sco of scos) {
      subAmountSubmitted += Number(sco.amountSubmitted) || 0;
      subAmountApproved += Number(sco.amountApproved) || 0;
    }
    
    await db
      .update(changeOrders)
      .set({
        subAmountSubmitted: subAmountSubmitted.toString(),
        subAmountApproved: subAmountApproved.toString(),
        updatedAt: new Date()
      })
      .where(eq(changeOrders.id, gcChangeOrderId));
  }
  
  // Numbering sequence operations
  async getNextNumber(projectId: number, sequenceType: string, subcontractorId?: number): Promise<string> {
    // First, try to get existing sequence
    const conditions = [
      eq(numberingSequences.projectId, projectId),
      eq(numberingSequences.sequenceType, sequenceType)
    ];
    
    if (subcontractorId) {
      conditions.push(eq(numberingSequences.subcontractorId, subcontractorId));
    } else {
      conditions.push(isNull(numberingSequences.subcontractorId));
    }
    
    const [sequence] = await db.select().from(numberingSequences)
      .where(and(...conditions));
    
    if (sequence) {
      // Increment and return
      const nextValue = sequence.currentValue + 1;
      await db
        .update(numberingSequences)
        .set({ currentValue: nextValue, updatedAt: new Date() })
        .where(eq(numberingSequences.id, sequence.id));
        
      // Format the number
      const prefix = sequence.prefix || '';
      const formatted = sequence.format 
        ? sequence.format.replace('{prefix}', prefix).replace('{number:03d}', String(nextValue).padStart(3, '0'))
        : `${prefix}${String(nextValue).padStart(3, '0')}`;
      
      return formatted;
    } else {
      // Create new sequence
      const prefix = this.getDefaultPrefix(sequenceType);
      const [newSequence] = await db
        .insert(numberingSequences)
        .values({
          projectId,
          sequenceType,
          subcontractorId,
          prefix,
          currentValue: 1,
          format: '{prefix}{number:03d}'
        })
        .returning();
        
      return `${prefix}001`;
    }
  }
  
  private getDefaultPrefix(sequenceType: string): string {
    switch (sequenceType) {
      case 'GC_RFC': return 'RFC-';
      case 'GC_CO': return 'CO-';
      case 'SCO': return 'SCO-';
      case 'SCO_PER_SUB': return 'SCO-';
      default: return '';
    }
  }
  
  async updateNumberingSequence(projectId: number, sequenceType: string, newValue: number, subcontractorId?: number): Promise<NumberingSequence> {
    const conditions = [
      eq(numberingSequences.projectId, projectId),
      eq(numberingSequences.sequenceType, sequenceType)
    ];
    
    if (subcontractorId) {
      conditions.push(eq(numberingSequences.subcontractorId, subcontractorId));
    } else {
      conditions.push(isNull(numberingSequences.subcontractorId));
    }
    
    const [sequence] = await db
      .update(numberingSequences)
      .set({ currentValue: newValue, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
      
    if (!sequence) {
      // Create new sequence if it doesn't exist
      const [newSequence] = await db
        .insert(numberingSequences)
        .values({
          projectId,
          sequenceType,
          subcontractorId,
          prefix: this.getDefaultPrefix(sequenceType),
          currentValue: newValue,
          format: '{prefix}{number:03d}'
        })
        .returning();
        
      return newSequence;
    }
    
    return sequence;
  }
  
  async initializeNumberingFromImport(projectId: number, sequenceType: string, importedNumbers: string[]): Promise<void> {
    if (importedNumbers.length === 0) return;
    
    // Extract the highest number from imported data
    let maxNumber = 0;
    
    for (const numStr of importedNumbers) {
      if (!numStr) continue;
      
      // Extract numeric portion (handle various formats like RFC-001, CO-001, SCO-001)
      const match = numStr.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    // Update or create the sequence with the highest number
    if (maxNumber > 0) {
      await this.updateNumberingSequence(projectId, sequenceType, maxNumber);
    }
  }
}

export const storage = new DatabaseStorage();
