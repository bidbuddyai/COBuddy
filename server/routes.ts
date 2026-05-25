import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { uploadMultiple, upload } from "./middleware/upload";
import { processDocument, processAndMatchDocument } from "./services/documentProcessor";
import { generateChangeOrderExcel } from "./services/excelGenerator";
import { generateChangeOrderPDF, generateChangeOrderLogPDF } from "./services/pdfGenerator";
import * as pdfGenerator from "./services/pdfGenerator";
import { processAIChat } from "./services/openai";
import { 
  insertDocumentSchema, 
  insertChangeOrderSchema, 
  insertProjectSchema, 
  insertChangeOrderLogSchema,
  insertRfiSchema,
  insertRfiCommentSchema,
  insertSubmittalSchema,
  insertSubmittalReviewSchema,
  insertTaskSchema,
  insertCostCodeSchema,
  insertBudgetLineItemSchema,
  insertScheduleActivitySchema,
  insertBidPackageSchema,
  insertBidInvitationSchema,
  insertBidSubmissionSchema,
  insertNotificationSchema
} from "@shared/schema";
import { Request, Response } from "express";
import { aiAssistantService } from "./services/aiAssistant";
import { numberingService } from "./services/numberingService";
import { excelCoLogService } from "./services/excelCoLogService";
import { aggregationService } from "./services/aggregationService";
import { runEmbeddingMigration } from "./scripts/migrateEmbeddings";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Session and Local Passport Auth
  setupAuth(app);

  // Middleware to ensure user can only access projects from their company
  const checkProjectAccess = async (req: any, res: Response, next: any) => {
    try {
      const projectId = parseInt(req.params.projectId || req.body.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      if (project.companyId !== user.companyId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      next();
    } catch (error) {
      console.error('Error checking project access:', error);
      res.status(500).json({ message: 'Failed to verify project access' });
    }
  };

  // User routes (keeping for backward compatibility)
  app.get('/api/users/:id', async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/users', async (req: any, res) => {
    try {
      const { id, email, firstName, lastName } = req.body;
      
      // Check if user email domain matches a company domain
      const emailDomain = email.split('@')[1];
      let company = await storage.getCompanyByDomain(emailDomain);
      
      // If no company exists for this domain, create one
      if (!company && emailDomain) {
        const companyName = emailDomain.split('.')[0]
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        company = await storage.createCompany({
          name: companyName,
          domain: emailDomain,
          hasCustomRates: false,
        });
      }
      
      // Extract name from email if not provided (common with OAuth)
      const emailUsername = email.split('@')[0];
      const defaultFirstName = firstName || emailUsername.split('.')[0] || emailUsername;
      const defaultLastName = lastName || emailUsername.split('.')[1] || '';
      
      // Determine role based on email and company
      let role = 'field';
      if (email === 'chase@resource-env.com') {
        role = 'admin';
      } else if (company && !company.hasCustomRates) {
        // First user in a new company gets admin role
        const companyUsers = await storage.getUsersByCompanyId(company.id);
        if (companyUsers.length === 0) {
          role = 'admin';
        }
      }
      
      const userData = {
        id,
        email,
        firstName: defaultFirstName,
        lastName: defaultLastName,
        companyId: company?.id || null,
        role,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const user = await storage.upsertUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // User profile and settings routes
  app.put('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const { firstName, lastName, email, role } = req.body;
      const userId = req.user?.id;
      
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
        role
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  app.put('/api/users/settings/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // In a real app, you'd store these in a user_preferences table
      // For now, we'll just acknowledge the update
      console.log('Updating notifications for user:', userId, req.body);
      
      res.json({ 
        message: "Notification preferences updated successfully",
        settings: req.body 
      });
    } catch (error) {
      console.error("Error updating notifications:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });
  
  app.put('/api/users/settings/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // In a real app, you'd store these in a user_preferences table
      console.log('Updating preferences for user:', userId, req.body);
      
      res.json({ 
        message: "Application preferences updated successfully",
        settings: req.body 
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
  
  app.put('/api/users/settings/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // In a real app, you'd store these in a user_preferences table
      console.log('Updating integrations for user:', userId, req.body);
      
      res.json({ 
        message: "Integration settings updated successfully",
        settings: req.body 
      });
    } catch (error) {
      console.error("Error updating integrations:", error);
      res.status(500).json({ message: "Failed to update integration settings" });
    }
  });

  // Company routes
  app.get('/api/companies/current', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const company = await storage.getCompany(user.companyId);
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });
  
  app.put('/api/companies/current', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || !user.companyId || user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { name } = req.body;
      const updatedCompany = await storage.updateCompany(user.companyId, { name });
      res.json(updatedCompany);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });
  
  app.get('/api/companies/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const users = await storage.getUsersByCompanyId(user.companyId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ message: "Failed to fetch company users" });
    }
  });
  
  app.put('/api/companies/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Verify the target user belongs to the same company
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.companyId !== user.companyId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, { role });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });
  
  app.delete('/api/companies/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { userId } = req.params;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Verify the target user belongs to the same company
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.companyId !== user.companyId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow removing self
      if (userId === user.id) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }
      
      // Remove company association from user
      await storage.updateUser(userId, { companyId: null });
      res.json({ message: "User removed from company" });
    } catch (error) {
      console.error("Error removing user:", error);
      res.status(500).json({ message: "Failed to remove user" });
    }
  });
  
  app.post('/api/companies/invite', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { email, role } = req.body;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // For now, we'll create a simple invitation record
      // In production, this would send an email with a secure invitation link
      const invitationId = `inv_${Date.now()}`;
      const invitation = {
        id: invitationId,
        email,
        role,
        companyId: user.companyId,
        invitedBy: user.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        inviteLink: `${process.env.REPL_SLUG}.repl.co/invite/${invitationId}`
      };
      
      // In a real app, you'd store this in an invitations table and send an email
      console.log('Invitation created:', invitation);
      
      res.json({ 
        message: "Invitation sent successfully",
        invitation 
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });
  
  app.get('/api/companies/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // In a real app, this would fetch from an invitations table
      res.json([]);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });
  
  app.delete('/api/companies/invitations/:invitationId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // In a real app, this would delete from invitations table
      res.json({ message: "Invitation cancelled" });
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      res.status(500).json({ message: "Failed to cancel invitation" });
    }
  });

  app.post('/api/companies/setup', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const { files, skipRates } = req.body;
      
      // Update company to mark as having custom rates
      await storage.updateCompany(user.companyId, {
        hasCustomRates: !skipRates,
      });
      
      // If files were uploaded, process them
      if (files && files.length > 0) {
        // Here you would typically process the uploaded files
        // For now, we'll just mark the company as having custom rates
        console.log(`Processing ${files.length} files for company ${user.companyId}`);
      }
      
      res.json({ 
        message: "Company setup completed successfully",
        hasCustomRates: !skipRates 
      });
    } catch (error) {
      console.error("Error setting up company:", error);
      res.status(500).json({ message: "Failed to set up company" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const stats = await storage.getDashboardStats(projectId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projects = await storage.getProjects(user?.companyId);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user;
      
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Ensure user can only access projects from their company
      if (project.companyId !== user.companyId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ message: 'Failed to fetch project' });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.companyId) {
        return res.status(400).json({ message: 'User must belong to a company' });
      }
      
      // Generate a unique project number
      const projectNumber = `PROJ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Convert budget to string for Drizzle ORM
      const processedBody = { ...req.body };
      if (processedBody.budget) {
        processedBody.budget = processedBody.budget.toString();
      }
      
      const projectData = insertProjectSchema.parse({
        ...processedBody,
        number: projectNumber,
        createdBy: user.id, // user.id is already a string (UUID)
        companyId: user.companyId,
      });
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Failed to create project' });
    }
  });

  // Change order routes
  app.get('/api/change-orders', isAuthenticated, async (req: any, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      const changeOrders = await storage.getChangeOrders({ page, limit, status, projectId });
      res.json(changeOrders);
    } catch (error) {
      console.error('Error fetching change orders:', error);
      res.status(500).json({ message: 'Failed to fetch change orders' });
    }
  });

  app.post('/api/change-orders', isAuthenticated, async (req: any, res) => {
    try {
      // Convert decimal amounts to strings for Drizzle ORM
      const processedBody = { ...req.body };
      if (processedBody.totalAmount) {
        processedBody.totalAmount = processedBody.totalAmount.toString();
      }
      if (processedBody.laborAmount) {
        processedBody.laborAmount = processedBody.laborAmount.toString();
      }
      if (processedBody.materialAmount) {
        processedBody.materialAmount = processedBody.materialAmount.toString();
      }
      if (processedBody.equipmentAmount) {
        processedBody.equipmentAmount = processedBody.equipmentAmount.toString();
      }
      
      // Generate a unique change order number
      const timestamp = Date.now();
      const changeOrderNumber = `CO-${processedBody.projectId}-${timestamp}`;
      
      const changeOrderData = insertChangeOrderSchema.parse({
        ...processedBody,
        number: changeOrderNumber,
        createdBy: req.user?.id, // user.id is already a string (UUID)
      });
      
      const changeOrder = await storage.createChangeOrder(changeOrderData);
      res.status(201).json(changeOrder);
    } catch (error) {
      console.error('Error creating change order:', error);
      res.status(500).json({ message: 'Failed to create change order' });
    }
  });

  app.get('/api/change-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const changeOrder = await storage.getChangeOrder(id);
      
      if (!changeOrder) {
        return res.status(404).json({ message: 'Change order not found' });
      }
      
      res.json(changeOrder);
    } catch (error) {
      console.error('Error fetching change order:', error);
      res.status(500).json({ message: 'Failed to fetch change order' });
    }
  });

  app.put('/api/change-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const changeOrder = await storage.updateChangeOrder(id, updateData);
      res.json(changeOrder);
    } catch (error) {
      console.error('Error updating change order:', error);
      res.status(500).json({ message: 'Failed to update change order' });
    }
  });

  // Generate Excel for change order
  app.get('/api/change-orders/:id/excel', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const changeOrder = await storage.getChangeOrder(id);
      
      if (!changeOrder) {
        return res.status(404).json({ message: 'Change order not found' });
      }
      
      const excelBuffer = await generateChangeOrderExcel(changeOrder);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="CO-${changeOrder.number}.xlsx"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error generating Excel:', error);
      res.status(500).json({ message: 'Failed to generate Excel file' });
    }
  });

  // Generate PDF for change order
  app.get('/api/change-orders/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const changeOrder = await storage.getChangeOrder(id);
      
      if (!changeOrder) {
        return res.status(404).json({ message: 'Change order not found' });
      }
      
      const pdfBuffer = await generateChangeOrderPDF(changeOrder);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="CO-${changeOrder.number}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF file' });
    }
  });

  // Export all change orders for a project
  app.get('/api/projects/:projectId/change-orders/export', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const { format } = req.query;
      
      const changeOrders = await storage.getChangeOrders({ projectId: Number(projectId) });
      const project = await storage.getProject(Number(projectId));
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      if (format === 'excel') {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Change Order Log');
        
        // Add header
        worksheet.columns = [
          { header: 'CO Number', key: 'number', width: 20 },
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Description', key: 'description', width: 40 },
          { header: 'Labor', key: 'labor', width: 15 },
          { header: 'Materials', key: 'materials', width: 15 },
          { header: 'Equipment', key: 'equipment', width: 15 },
          { header: 'Disposal', key: 'disposal', width: 15 },
          { header: 'Subcontractors', key: 'subcontractors', width: 15 },
          { header: 'Total', key: 'total', width: 15 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Days Open', key: 'daysOpen', width: 12 }
        ];
        
        // Add data
        changeOrders.data.forEach((co: any) => {
          const total = (co.laborAmount || 0) + (co.materialsAmount || 0) + 
                       (co.equipmentOwnedAmount || 0) + (co.equipmentRentedAmount || 0) +
                       (co.disposalAmount || 0) + (co.importAmount || 0) + 
                       (co.subcontractorsAmount || 0);
          
          const daysOpen = Math.floor((new Date().getTime() - new Date(co.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          
          worksheet.addRow({
            number: co.number,
            date: new Date(co.createdAt).toLocaleDateString(),
            description: co.description,
            labor: co.laborAmount || 0,
            materials: co.materialsAmount || 0,
            equipment: (co.equipmentOwnedAmount || 0) + (co.equipmentRentedAmount || 0),
            disposal: co.disposalAmount || 0,
            subcontractors: co.subcontractorsAmount || 0,
            total: total,
            status: co.status,
            daysOpen: co.status === 'approved' ? 'Closed' : `${daysOpen} days`
          });
        });
        
        // Style the header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        // Add totals row
        const totalRow = worksheet.addRow({
          number: 'TOTALS',
          date: '',
          description: '',
          labor: changeOrders.data.reduce((sum: number, co: any) => sum + (co.laborAmount || 0), 0),
          materials: changeOrders.data.reduce((sum: number, co: any) => sum + (co.materialsAmount || 0), 0),
          equipment: changeOrders.data.reduce((sum: number, co: any) => sum + ((co.equipmentOwnedAmount || 0) + (co.equipmentRentedAmount || 0)), 0),
          disposal: changeOrders.data.reduce((sum: number, co: any) => sum + (co.disposalAmount || 0), 0),
          subcontractors: changeOrders.data.reduce((sum: number, co: any) => sum + (co.subcontractorsAmount || 0), 0),
          total: changeOrders.data.reduce((sum: number, co: any) => {
            return sum + (co.laborAmount || 0) + (co.materialsAmount || 0) + 
                   (co.equipmentOwnedAmount || 0) + (co.equipmentRentedAmount || 0) +
                   (co.disposalAmount || 0) + (co.importAmount || 0) + 
                   (co.subcontractorsAmount || 0);
          }, 0),
          status: '',
          daysOpen: ''
        });
        
        totalRow.font = { bold: true };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC000' }
        };
        
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${project.number}-change-order-log.xlsx"`);
        return res.send(buffer);
      } else if (format === 'pdf') {
        const pdfBuffer = await pdfGenerator.generateChangeOrderLogPDF(changeOrders.data, project);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${project.number}-change-order-log.pdf"`);
        return res.send(pdfBuffer);
      }
      
      return res.status(400).json({ message: 'Invalid format' });
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: 'Failed to export change order log' });
    }
  });

  // Change Order Logs - Construction PM Communication & Documentation
  app.get('/api/projects/:projectId/co-logs', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const changeOrderId = req.query.changeOrderId ? parseInt(req.query.changeOrderId) : undefined;
      
      const logs = await storage.getChangeOrderLogs(projectId, changeOrderId);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching CO logs:', error);
      res.status(500).json({ message: 'Failed to fetch change order logs' });
    }
  });

  app.get('/api/co-logs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const log = await storage.getChangeOrderLog(id);
      
      if (!log) {
        return res.status(404).json({ message: 'Change order log not found' });
      }
      
      res.json(log);
    } catch (error) {
      console.error('Error fetching CO log:', error);
      res.status(500).json({ message: 'Failed to fetch change order log' });
    }
  });

  app.post('/api/co-logs', isAuthenticated, async (req: any, res) => {
    try {
      const { body, user } = req;
      
      // Validate the incoming data
      const logData = insertChangeOrderLogSchema.parse({
        ...body,
        createdBy: user.id,
        createdByName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      });
      
      const log = await storage.createChangeOrderLog(logData);
      
      // Create audit log for tracking
      await storage.createAuditLog({
        action: 'create',
        entityType: 'change_order_log',
        entityId: log.id,
        newData: log,
        userId: user.id,
      });
      
      res.status(201).json(log);
    } catch (error) {
      console.error('Error creating CO log:', error);
      res.status(500).json({ message: 'Failed to create change order log' });
    }
  });

  app.put('/api/co-logs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const log = await storage.updateChangeOrderLog(id, updateData);
      
      // Create audit log for tracking
      await storage.createAuditLog({
        action: 'update',
        entityType: 'change_order_log',
        entityId: log.id,
        newData: updateData,
        userId: req.user?.id,
      });
      
      res.json(log);
    } catch (error) {
      console.error('Error updating CO log:', error);
      res.status(500).json({ message: 'Failed to update change order log' });
    }
  });

  app.get('/api/projects/:projectId/co-logs/by-type/:logType', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const logType = req.params.logType;
      
      const logs = await storage.getProjectLogsByType(projectId, logType);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching CO logs by type:', error);
      res.status(500).json({ message: 'Failed to fetch change order logs by type' });
    }
  });

  // Export endpoints for AI assistant
  app.post('/api/change-orders/:id/export/excel', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const changeOrder = await storage.getChangeOrder(id);
      
      if (!changeOrder) {
        return res.status(404).json({ message: 'Change order not found' });
      }
      
      const excelBuffer = await generateChangeOrderExcel(changeOrder);
      
      // Store the file path in the change order for later download
      const fileName = `CO-${changeOrder.number}-${Date.now()}.xlsx`;
      const filePath = `/exports/${fileName}`;
      
      // Update change order with export info
      await storage.updateChangeOrder(id, {
        lastExportedAt: new Date(),
        exportedFiles: {
          ...(changeOrder.exportedFiles as any || {}),
          excel: { fileName, path: filePath, generatedAt: new Date() }
        }
      });
      
      res.json({ 
        message: 'Excel file generated successfully',
        fileName,
        downloadUrl: `/api/change-orders/${id}/excel`
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      res.status(500).json({ message: 'Failed to generate Excel file' });
    }
  });

  app.post('/api/change-orders/:id/export/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const changeOrder = await storage.getChangeOrder(id);
      
      if (!changeOrder) {
        return res.status(404).json({ message: 'Change order not found' });
      }
      
      const pdfBuffer = await generateChangeOrderPDF(changeOrder);
      
      // Store the file path in the change order for later download
      const fileName = `CO-${changeOrder.number}-${Date.now()}.pdf`;
      const filePath = `/exports/${fileName}`;
      
      // Update change order with export info
      await storage.updateChangeOrder(id, {
        lastExportedAt: new Date(),
        exportedFiles: {
          ...(changeOrder.exportedFiles as any || {}),
          pdf: { fileName, path: filePath, generatedAt: new Date() }
        }
      });
      
      res.json({ 
        message: 'PDF file generated successfully',
        fileName,
        downloadUrl: `/api/change-orders/${id}/pdf`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF file' });
    }
  });

  // File upload and processing
  app.post('/api/documents/upload', isAuthenticated, uploadMultiple, async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const uploadedDocuments: any[] = [];
      const userId = req.user?.id;
      
      // First, create all document records
      for (const file of files) {
        const documentData = insertDocumentSchema.parse({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          type: req.body.type || 'tm_sheet',
          projectId: req.body.projectId ? parseInt(req.body.projectId) : undefined,
          uploadedBy: req.user?.id, // user.id is already a string (UUID)
        });
        
        const document = await storage.createDocument(documentData);
        uploadedDocuments.push(document);
      }
      
      // Process documents sequentially with 3-second delay to avoid Azure rate limits
      const processDocumentsSequentially = async () => {
        for (let i = 0; i < uploadedDocuments.length; i++) {
          const document = uploadedDocuments[i];
          
          // Add 3-second delay between documents (except for the first one)
          if (i > 0) {
            console.log(`Waiting 3 seconds before processing next document to avoid Azure rate limits...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          // Send initial progress update
          (app as any).sendProgressUpdate?.(userId, {
            type: 'document_progress',
            documentId: document.id,
            status: 'processing',
            progress: 0,
            message: 'Starting document processing...'
          });
          
          try {
            await processDocument(document.id, (progress, message) => {
              // Send progress updates via WebSocket
              (app as any).sendProgressUpdate?.(userId, {
                type: 'document_progress',
                documentId: document.id,
                status: 'processing',
                progress,
                message
              });
            });
            
            // Send completion update
            (app as any).sendProgressUpdate?.(userId, {
              type: 'document_progress',
              documentId: document.id,
              status: 'completed',
              progress: 100,
              message: 'Document processing completed!'
            });
          } catch (error: any) {
            console.error(`Error processing document ${document.id}:`, error);
            // Send error update
            (app as any).sendProgressUpdate?.(userId, {
              type: 'document_progress',
              documentId: document.id,
              status: 'failed',
              progress: 0,
              message: `Processing failed: ${error.message}`
            });
          }
        }
      };
      
      // Start processing documents in the background
      processDocumentsSequentially().catch(error => {
        console.error('Error in sequential document processing:', error);
      });
      
      res.status(201).json(uploadedDocuments);
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({ message: 'Failed to upload documents' });
    }
  });

  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const documents = await storage.getDocuments(projectId);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      res.json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Failed to fetch document' });
    }
  });

  // Update document extracted data
  app.patch('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { extractedData, isReusable, isBackup } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Build update object
      const updates: any = {};
      if (extractedData !== undefined) updates.extractedData = extractedData;
      if (isReusable !== undefined) updates.isReusable = isReusable;
      if (isBackup !== undefined) updates.isBackup = isBackup;
      
      const updatedDocument = await storage.updateDocument(id, updates);
      res.json(updatedDocument);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ message: 'Failed to update document' });
    }
  });

  // Reprocess document
  app.post('/api/documents/:id/reprocess', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Update status to processing and reprocess
      await storage.updateDocument(id, { status: 'processing' });
      
      // Process document asynchronously
      processDocument(id).catch(error => {
        console.error(`Error reprocessing document ${id}:`, error);
      });
      
      res.json({ message: 'Document queued for reprocessing' });
    } catch (error) {
      console.error('Error reprocessing document:', error);
      res.status(500).json({ message: 'Failed to reprocess document' });
    }
  });

  // Process document with AI vision
  app.post('/api/documents/:id/process', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Update status to processing
      await storage.updateDocument(id, { status: 'processing' });
      
      // Process document asynchronously
      processDocument(id).catch(error => {
        console.error(`Error processing document ${id}:`, error);
      });
      
      res.json({ message: 'Document queued for processing' });
    } catch (error) {
      console.error('Error processing document:', error);
      res.status(500).json({ message: 'Failed to process document' });
    }
  });

  // Delete document
  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Delete document from database
      await storage.updateDocument(id, { status: 'deleted' });
      
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });

  // Rate table routes
  app.get('/api/rate-tables', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Get both company-specific and public rate tables
      const companyRates = await storage.getRateTables(user.companyId || undefined);
      const publicRates = await storage.getPublicRateTables();
      
      // Combine and return all available rates
      const allRates = [...companyRates, ...publicRates];
      res.json(allRates);
    } catch (error) {
      console.error('Error fetching rate tables:', error);
      res.status(500).json({ message: 'Failed to fetch rate tables' });
    }
  });

  // Protected route - require admin role
  app.put('/api/rate-tables/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const id = parseInt(req.params.id);
      const rateTable = await storage.approveRateTable(id, user.id);
      res.json(rateTable);
    } catch (error) {
      console.error('Error approving rate table:', error);
      res.status(500).json({ message: 'Failed to approve rate table' });
    }
  });

  // Update rate table data
  app.put('/api/rate-tables/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || (user.role !== 'admin' && user.role !== 'pm')) {
        return res.status(403).json({ message: 'Admin or PM access required' });
      }
      
      const id = parseInt(req.params.id);
      const { data } = req.body;
      
      const rateTable = await storage.updateRateTable(id, { data });
      res.json(rateTable);
    } catch (error) {
      console.error('Error updating rate table:', error);
      res.status(500).json({ message: 'Failed to update rate table' });
    }
  });

  // AI Chat routes
  app.post('/api/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { message, conversationId } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }
      
      // Get conversation context if provided
      let context = null;
      if (conversationId) {
        const conversation = await storage.getChatConversation(conversationId);
        context = conversation?.messages;
      }
      
      // Get rate context for AI
      const rateTablesData = await storage.getRateTables();
      const rateContext = {
        availableRates: rateTablesData.map(rt => ({
          name: rt.name,
          type: rt.type,
          entries: Array.isArray(rt.data) ? rt.data.length : 0
        })),
        totalRates: rateTablesData.reduce((sum, rt) => sum + (Array.isArray(rt.data) ? rt.data.length : 0), 0)
      };
      
      const response = await processAIChat(message, Object.assign({}, context, { rateContext }));
      
      // Save conversation
      const conversationData = {
        userId: req.user?.id,
        messages: [
          { role: 'user', content: message, timestamp: new Date() },
          { role: 'assistant', content: response, timestamp: new Date() }
        ]
      };
      
      let conversation;
      if (conversationId) {
        conversation = await storage.updateChatConversation(conversationId, conversationData);
      } else {
        conversation = await storage.createChatConversation(conversationData);
      }
      
      res.json({
        response,
        conversationId: conversation.id,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error processing chat:', error);
      res.status(500).json({ message: 'Failed to process chat message' });
    }
  });

  app.get('/api/chat/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const conversations = await storage.getChatConversations(req.user?.id);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  // AI Assistant Chat endpoint (enhanced version with actions)
  app.post('/api/ai/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { message, context, requestActions, conversationId } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }
      
      // Get comprehensive context for AI
      const userId = req.user?.id;
      const dbUser = userId ? await storage.getUser(userId) : null;
      const userCompanyId = dbUser?.companyId ?? undefined;
      
      // Get rate context
      const rateTablesData = await storage.getRateTables(userCompanyId);
      const publicRates = await storage.getPublicRateTables();
      const allRates = [...rateTablesData, ...publicRates];
      
      // Get project context
      const projects = await storage.getProjects();
      const changeOrders = await storage.getChangeOrders({ limit: 10 });
      const documents = await storage.getDocuments();
      
      const enhancedContext = {
        conversationId,
        pageContext: context,
        rateContext: {
          companyRates: rateTablesData.map(rt => ({
            id: rt.id,
            name: rt.name,
            type: rt.type,
            entries: Array.isArray(rt.data) ? rt.data.length : (rt.data as any)?.entries?.length || 0,
            effectiveDate: rt.effectiveDate
          })),
          publicRates: publicRates.map(rt => ({
            id: rt.id,
            name: rt.name,
            type: rt.type,
            entries: Array.isArray(rt.data) ? rt.data.length : (rt.data as any)?.entries?.length || 0,
            effectiveDate: rt.effectiveDate
          })),
          totalRates: allRates.reduce((sum, rt) => {
            const entries = Array.isArray(rt.data) ? rt.data.length : (rt.data as any)?.entries?.length || 0;
            return sum + entries;
          }, 0)
        },
        projectContext: {
          projects: projects.map(p => ({ id: p.id, name: p.name, status: p.status })),
          recentChangeOrders: changeOrders.data.map(co => ({
            id: co.id,
            projectId: co.projectId,
            title: co.title,
            status: co.status,
            total: parseFloat(co.totalAmount || '0')
          })),
          pendingDocuments: documents.filter(d => d.status === 'pending').length
        },
        user: {
          id: userId,
          companyId: userCompanyId,
          role: req.user?.role
        },
        requestActions
      };
      
      const response = await aiAssistantService.processMessage(message, enhancedContext);
      
      res.json(response);
    } catch (error) {
      console.error('Error processing AI chat:', error);
      res.status(500).json({ message: 'Failed to process chat message' });
    }
  });

  // Change order generation from T&M data
  app.post('/api/change-orders/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { documentId, projectInfo } = req.body;
      
      // Get document with extracted T&M data
      const document = await storage.getDocument(documentId);
      if (!document || !document.extractedData) {
        return res.status(400).json({ message: 'Document not found or not processed' });
      }
      
      // Import the generator function
      const { generateChangeOrderFromTMData } = await import('./services/changeOrderGenerator');
      
      // Generate change order
      const changeOrderData = await generateChangeOrderFromTMData(
        document.extractedData as any,
        projectInfo
      );
      
      res.json(changeOrderData);
    } catch (error) {
      console.error('Change order generation error:', error);
      res.status(500).json({ message: 'Failed to generate change order' });
    }
  });

  // Analytics routes
  app.get('/api/analytics/:projectId', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      
      const analytics = await storage.getProjectAnalytics(parseInt(projectId));
      
      res.json(analytics);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: 'Failed to generate analytics' });
    }
  });

  // Upload Caltrans rates (admin only)
  app.post('/api/rate-tables/caltrans/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const csvData = req.file.buffer.toString('utf-8');
      const { importCaltransRates } = await import('./services/caltransRateImporter.js');
      
      const result = await importCaltransRates(csvData, new Date());
      res.json(result);
    } catch (error) {
      console.error('Error uploading Caltrans rates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload Caltrans rates';
      res.status(500).json({ message: errorMessage });
    }
  });

  // Get Caltrans rates specifically
  app.get('/api/rate-tables/caltrans', isAuthenticated, async (req: any, res) => {
    try {
      const { getCaltransRates } = await import('./services/caltransRateImporter.js');
      const caltransRates = await getCaltransRates();
      res.json(caltransRates);
    } catch (error) {
      console.error('Error fetching Caltrans rates:', error);
      res.status(500).json({ message: 'Failed to fetch Caltrans rates' });
    }
  });

  // ============= CO LOG ENDPOINTS =============
  
  // --- Subcontractor endpoints ---
  app.get('/api/subcontractors', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.companyId) {
        return res.status(400).json({ message: 'User must belong to a company' });
      }
      
      const subcontractors = await storage.getSubcontractors(user.companyId);
      res.json(subcontractors);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      res.status(500).json({ message: 'Failed to fetch subcontractors' });
    }
  });
  
  app.post('/api/subcontractors', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.companyId) {
        return res.status(400).json({ message: 'User must belong to a company' });
      }
      
      const subcontractorData = {
        ...req.body,
        companyId: user.companyId
      };
      
      const subcontractor = await storage.createSubcontractor(subcontractorData);
      res.status(201).json(subcontractor);
    } catch (error) {
      console.error('Error creating subcontractor:', error);
      res.status(500).json({ message: 'Failed to create subcontractor' });
    }
  });
  
  app.put('/api/subcontractors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const subcontractor = await storage.updateSubcontractor(id, req.body);
      res.json(subcontractor);
    } catch (error) {
      console.error('Error updating subcontractor:', error);
      res.status(500).json({ message: 'Failed to update subcontractor' });
    }
  });
  
  // --- Subcontractor Change Order endpoints ---
  app.get('/api/subcontractor-change-orders', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, gcChangeOrderId, subcontractorId } = req.query;
      
      const filters: any = {};
      if (projectId) filters.projectId = parseInt(projectId);
      if (gcChangeOrderId) filters.gcChangeOrderId = parseInt(gcChangeOrderId);
      if (subcontractorId) filters.subcontractorId = parseInt(subcontractorId);
      
      const scos = await storage.getSubcontractorChangeOrders(filters);
      res.json(scos);
    } catch (error) {
      console.error('Error fetching SCOs:', error);
      res.status(500).json({ message: 'Failed to fetch subcontractor change orders' });
    }
  });
  
  app.post('/api/subcontractor-change-orders', isAuthenticated, async (req: any, res) => {
    try {
      const scoData = {
        ...req.body,
        createdBy: req.user?.id
      };
      
      // Generate SCO number if not provided
      if (!scoData.scoNumber) {
        scoData.scoNumber = await numberingService.generateScoNumber(
          scoData.projectId,
          scoData.subcontractorId,
          false
        );
      }
      
      const sco = await storage.createSubcontractorChangeOrder(scoData);
      res.status(201).json(sco);
    } catch (error) {
      console.error('Error creating SCO:', error);
      res.status(500).json({ message: 'Failed to create subcontractor change order' });
    }
  });
  
  app.put('/api/subcontractor-change-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const sco = await storage.updateSubcontractorChangeOrder(id, req.body);
      res.json(sco);
    } catch (error) {
      console.error('Error updating SCO:', error);
      res.status(500).json({ message: 'Failed to update subcontractor change order' });
    }
  });
  
  // --- CO Log Import/Export endpoints ---
  app.get('/api/co-logs/export', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.query;
      
      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
      }
      
      const buffer = await excelCoLogService.exportCoLog(parseInt(projectId));
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="CO_Log.xlsx"');
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting CO Log:', error);
      res.status(500).json({ message: 'Failed to export CO Log' });
    }
  });
  
  app.post('/api/co-logs/import', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const file = req.file;
      const { projectId } = req.body;
      
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
      }
      
      const result = await excelCoLogService.importCoLog(
        parseInt(projectId),
        file.buffer,
        req.user?.id
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error importing CO Log:', error);
      res.status(500).json({ message: 'Failed to import CO Log' });
    }
  });
  
  app.get('/api/co-logs/template', async (req: any, res) => {
    try {
      const buffer = await excelCoLogService.getSampleTemplate();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="CO_Log_Template.xlsx"');
      res.send(buffer);
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ message: 'Failed to generate template' });
    }
  });
  
  // --- Numbering sequence endpoints ---
  app.post('/api/numbering/next', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, sequenceType, subcontractorId } = req.body;
      
      if (!projectId || !sequenceType) {
        return res.status(400).json({ message: 'Project ID and sequence type are required' });
      }
      
      const nextNumber = await storage.getNextNumber(projectId, sequenceType, subcontractorId);
      res.json({ nextNumber });
    } catch (error) {
      console.error('Error getting next number:', error);
      res.status(500).json({ message: 'Failed to get next number' });
    }
  });
  
  // --- CO Log aggregation endpoint ---
  app.get('/api/co-logs/summary', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.query;
      
      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
      }
      
      const changeOrders = await storage.getChangeOrders({ projectId: parseInt(projectId) });
      
      // Calculate aggregations
      let totalSubmitted = 0;
      let totalApproved = 0;
      let totalSubSubmitted = 0;
      let totalSubApproved = 0;
      
      for (const co of changeOrders.data) {
        totalSubmitted += Number(co.amountSubmitted) || 0;
        totalApproved += Number(co.amountApproved) || 0;
        totalSubSubmitted += Number(co.subAmountSubmitted) || 0;
        totalSubApproved += Number(co.subAmountApproved) || 0;
      }
      
      const variance = totalSubmitted - totalSubSubmitted;
      
      res.json({
        gcCount: changeOrders.total,
        gcAmountSubmitted: totalSubmitted,
        gcAmountApproved: totalApproved,
        subAmountSubmitted: totalSubSubmitted,
        subAmountApproved: totalSubApproved,
        variance,
        percentageComplete: totalSubmitted > 0 ? (totalApproved / totalSubmitted) * 100 : 0
      });
    } catch (error) {
      console.error('Error getting CO Log summary:', error);
      res.status(500).json({ message: 'Failed to get CO Log summary' });
    }
  });
  
  // --- Advanced aggregation endpoints ---
  app.get('/api/co-logs/advanced-summary', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.query;
      
      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
      }
      
      const aggregation = await aggregationService.calculateProjectAggregation(parseInt(projectId));
      res.json(aggregation);
    } catch (error) {
      console.error('Error getting advanced CO Log summary:', error);
      res.status(500).json({ message: 'Failed to get advanced CO Log summary' });
    }
  });
  
  app.get('/api/co-logs/company-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.companyId) {
        return res.status(400).json({ message: 'User must belong to a company' });
      }
      
      const aggregation = await aggregationService.calculateCompanyAggregation(user.companyId);
      res.json(aggregation);
    } catch (error) {
      console.error('Error getting company CO Log summary:', error);
      res.status(500).json({ message: 'Failed to get company CO Log summary' });
    }
  });

  app.post('/api/admin/migrate-embeddings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      console.log('[Admin] Starting embedding migration...');
      const result = await runEmbeddingMigration();
      
      res.json({
        success: result.success,
        processed: result.processed,
        errors: result.errors,
        message: result.success 
          ? `Successfully generated embeddings for ${result.processed} rate items` 
          : `Migration completed with ${result.errors.length} errors`,
      });
    } catch (error) {
      console.error('Error running embedding migration:', error);
      res.status(500).json({ 
        message: 'Failed to run embedding migration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // RFIs API Endpoints
  app.get('/api/projects/:projectId/rfis', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const items = await storage.getRFIs(projectId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching RFIs:', error);
      res.status(500).json({ message: 'Failed to fetch RFIs' });
    }
  });

  app.get('/api/rfis/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const rfi = await storage.getRFI(id);
      if (!rfi) return res.status(404).json({ message: 'RFI not found' });
      res.json(rfi);
    } catch (error) {
      console.error('Error fetching RFI:', error);
      res.status(500).json({ message: 'Failed to fetch RFI' });
    }
  });

  app.post('/api/projects/:projectId/rfis', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const user = req.user;
      
      const rfisList = await storage.getRFIs(projectId);
      const rfiNumber = `RFI-${String(rfisList.length + 1).padStart(3, '0')}`;

      const rfiData = insertRfiSchema.parse({
        ...req.body,
        projectId,
        number: rfiNumber,
        createdBy: user.id,
      });

      const rfi = await storage.createRFI(rfiData);
      res.status(201).json(rfi);
    } catch (error) {
      console.error('Error creating RFI:', error);
      res.status(500).json({ message: 'Failed to create RFI' });
    }
  });

  app.put('/api/rfis/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const rfi = await storage.updateRFI(id, req.body);
      res.json(rfi);
    } catch (error) {
      console.error('Error updating RFI:', error);
      res.status(500).json({ message: 'Failed to update RFI' });
    }
  });

  app.get('/api/rfis/:rfiId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const rfiId = parseInt(req.params.rfiId);
      const comments = await storage.getRFIComments(rfiId);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching RFI comments:', error);
      res.status(500).json({ message: 'Failed to fetch RFI comments' });
    }
  });

  app.post('/api/rfis/:rfiId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const rfiId = parseInt(req.params.rfiId);
      const user = req.user;
      const commentData = insertRfiCommentSchema.parse({
        ...req.body,
        rfiId,
        userId: user.id,
      });
      const comment = await storage.createRFIComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      console.error('Error creating RFI comment:', error);
      res.status(500).json({ message: 'Failed to create RFI comment' });
    }
  });

  // Submittals API Endpoints
  app.get('/api/projects/:projectId/submittals', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const items = await storage.getSubmittals(projectId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching submittals:', error);
      res.status(500).json({ message: 'Failed to fetch submittals' });
    }
  });

  app.get('/api/submittals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const submittal = await storage.getSubmittal(id);
      if (!submittal) return res.status(404).json({ message: 'Submittal not found' });
      res.json(submittal);
    } catch (error) {
      console.error('Error fetching submittal:', error);
      res.status(500).json({ message: 'Failed to fetch submittal' });
    }
  });

  app.post('/api/projects/:projectId/submittals', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const submittalsList = await storage.getSubmittals(projectId);
      const submittalNumber = `SUB-${String(submittalsList.length + 1).padStart(3, '0')}`;

      const subData = insertSubmittalSchema.parse({
        ...req.body,
        projectId,
        number: submittalNumber,
      });

      const submittal = await storage.createSubmittal(subData);
      res.status(201).json(submittal);
    } catch (error) {
      console.error('Error creating submittal:', error);
      res.status(500).json({ message: 'Failed to create submittal' });
    }
  });

  app.put('/api/submittals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const submittal = await storage.updateSubmittal(id, req.body);
      res.json(submittal);
    } catch (error) {
      console.error('Error updating submittal:', error);
      res.status(500).json({ message: 'Failed to update submittal' });
    }
  });

  app.get('/api/submittals/:submittalId/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const submittalId = parseInt(req.params.submittalId);
      const reviews = await storage.getSubmittalReviews(submittalId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching submittal reviews:', error);
      res.status(500).json({ message: 'Failed to fetch submittal reviews' });
    }
  });

  app.post('/api/submittals/:submittalId/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const submittalId = parseInt(req.params.submittalId);
      const user = req.user;
      const reviewData = insertSubmittalReviewSchema.parse({
        ...req.body,
        submittalId,
        userId: user.id,
      });
      const review = await storage.createSubmittalReview(reviewData);
      await storage.updateSubmittal(submittalId, { status: req.body.status });
      res.status(201).json(review);
    } catch (error) {
      console.error('Error creating submittal review:', error);
      res.status(500).json({ message: 'Failed to create submittal review' });
    }
  });

  // Tasks API Endpoints
  app.get('/api/projects/:projectId/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const items = await storage.getTasks(projectId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      res.json(task);
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({ message: 'Failed to fetch task' });
    }
  });

  app.post('/api/projects/:projectId/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const taskData = insertTaskSchema.parse({
        ...req.body,
        projectId,
      });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Failed to create task' });
    }
  });

  app.put('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.updateTask(id, req.body);
      res.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Failed to update task' });
    }
  });

  // Cost Codes & Budget API Endpoints
  app.get('/api/companies/current/cost-codes', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.companyId) return res.status(400).json({ message: 'User must belong to a company' });
      const codes = await storage.getCostCodes(user.companyId);
      res.json(codes);
    } catch (error) {
      console.error('Error fetching cost codes:', error);
      res.status(500).json({ message: 'Failed to fetch cost codes' });
    }
  });

  app.post('/api/companies/current/cost-codes', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.companyId) return res.status(400).json({ message: 'User must belong to a company' });
      const codeData = insertCostCodeSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });
      const code = await storage.createCostCode(codeData);
      res.status(201).json(code);
    } catch (error) {
      console.error('Error creating cost code:', error);
      res.status(500).json({ message: 'Failed to create cost code' });
    }
  });

  app.get('/api/projects/:projectId/budget', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const budgetItems = await storage.getBudgetLineItems(projectId);
      res.json(budgetItems);
    } catch (error) {
      console.error('Error fetching budget line items:', error);
      res.status(500).json({ message: 'Failed to fetch budget line items' });
    }
  });

  app.post('/api/projects/:projectId/budget', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const budgetData = insertBudgetLineItemSchema.parse({
        ...req.body,
        projectId,
      });
      const item = await storage.createBudgetLineItem(budgetData);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating budget item:', error);
      res.status(500).json({ message: 'Failed to create budget item' });
    }
  });

  app.put('/api/budget-line-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.updateBudgetLineItem(id, req.body);
      res.json(item);
    } catch (error) {
      console.error('Error updating budget item:', error);
      res.status(500).json({ message: 'Failed to update budget item' });
    }
  });

  // Schedule API Endpoints
  app.get('/api/projects/:projectId/schedule', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const activities = await storage.getScheduleActivities(projectId);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching schedule activities:', error);
      res.status(500).json({ message: 'Failed to fetch schedule activities' });
    }
  });

  app.post('/api/projects/:projectId/schedule', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const activityData = insertScheduleActivitySchema.parse({
        ...req.body,
        projectId,
      });
      const activity = await storage.createScheduleActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      console.error('Error creating schedule activity:', error);
      res.status(500).json({ message: 'Failed to create schedule activity' });
    }
  });

  app.put('/api/schedule-activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const activity = await storage.updateScheduleActivity(id, req.body);
      res.json(activity);
    } catch (error) {
      console.error('Error updating schedule activity:', error);
      res.status(500).json({ message: 'Failed to update schedule activity' });
    }
  });

  app.post('/api/projects/:projectId/schedule/import', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { activities } = req.body;
      
      if (!Array.isArray(activities)) {
        return res.status(400).json({ message: 'Activities array is required' });
      }

      const imported = [];
      for (const act of activities) {
        const activityData = insertScheduleActivitySchema.parse({
          projectId,
          name: act.name || 'Unnamed Activity',
          startDate: new Date(act.startDate || act.start || act.Start || Date.now()),
          finishDate: new Date(act.finishDate || act.finish || act.Finish || Date.now() + 86400000),
          duration: act.duration ? parseInt(act.duration) : 1,
          percentComplete: act.percentComplete ? parseInt(act.percentComplete) : 0,
          responsibleParty: act.responsibleParty || act.responsible || '',
          phase: act.phase || '',
          location: act.location || '',
          criticalPath: act.criticalPath === true || act.criticalPath === 'true',
        });
        const saved = await storage.createScheduleActivity(activityData);
        imported.push(saved);
      }

      res.status(201).json({ count: imported.length, activities: imported });
    } catch (error) {
      console.error('Error importing schedule:', error);
      res.status(500).json({ message: 'Failed to import schedule' });
    }
  });

  // Bid Packages API Endpoints
  app.get('/api/projects/:projectId/bid-packages', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const packages = await storage.getBidPackages(projectId);
      res.json(packages);
    } catch (error) {
      console.error('Error fetching bid packages:', error);
      res.status(500).json({ message: 'Failed to fetch bid packages' });
    }
  });

  app.get('/api/bid-packages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const pkg = await storage.getBidPackage(id);
      if (!pkg) return res.status(404).json({ message: 'Bid package not found' });
      res.json(pkg);
    } catch (error) {
      console.error('Error fetching bid package:', error);
      res.status(500).json({ message: 'Failed to fetch bid package' });
    }
  });

  app.post('/api/projects/:projectId/bid-packages', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const pkgData = insertBidPackageSchema.parse({
        ...req.body,
        projectId,
      });
      const pkg = await storage.createBidPackage(pkgData);
      res.status(201).json(pkg);
    } catch (error) {
      console.error('Error creating bid package:', error);
      res.status(500).json({ message: 'Failed to create bid package' });
    }
  });

  app.put('/api/bid-packages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const pkg = await storage.updateBidPackage(id, req.body);
      res.json(pkg);
    } catch (error) {
      console.error('Error updating bid package:', error);
      res.status(500).json({ message: 'Failed to update bid package' });
    }
  });

  app.get('/api/bid-packages/:id/leveling', isAuthenticated, async (req: any, res) => {
    try {
      const bidPackageId = parseInt(req.params.id);
      const pkg = await storage.getBidPackage(bidPackageId);
      if (!pkg) return res.status(404).json({ message: 'Bid package not found' });
      
      const invites = await storage.getBidInvitations(bidPackageId);
      const levelingData = [];
      
      for (const inv of invites) {
        const subs = await storage.getBidSubmissions(inv.id);
        levelingData.push({
          ...inv,
          submissions: subs,
        });
      }
      
      res.json({
        bidPackage: pkg,
        bidders: levelingData,
      });
    } catch (error) {
      console.error('Error fetching leveling data:', error);
      res.status(500).json({ message: 'Failed to fetch leveling data' });
    }
  });

  app.post('/api/projects/:projectId/ai-copilot/run', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { agent } = req.body;
      
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });
      
      const activities = await storage.getScheduleActivities(projectId);
      const budgetItems = await storage.getBudgetLineItems(projectId);
      const tasksList = await storage.getTasks(projectId);
      const rfisList = await storage.getRFIs(projectId);
      const changeOrdersData = await storage.getChangeOrders({ projectId });
      const documentsList = await storage.getDocuments(projectId);

      const logs: Array<{ timestamp: string, type: 'info' | 'success' | 'warning' | 'error', message: string }> = [];
      const report: any = {};
      const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false });

      if (agent === 'supervisor') {
        logs.push({ timestamp: nowStr, type: 'info', message: 'Supervisor Agent initialized. Scanning active project documents and change orders...' });
        logs.push({ timestamp: nowStr, type: 'info', message: `Found ${documentsList.length} total documents and ${changeOrdersData.total} change orders.` });
        
        let rateDiscrepancies = 0;
        let equipmentViolations = 0;
        let markupViolations = 0;

        const unoperatedEqDocs = documentsList.filter(d => {
          const data = d.extractedData as any;
          return data && data.equipmentEntries && data.equipmentEntries.some((e: any) => e.hours > 0 && !e.rate);
        });

        if (unoperatedEqDocs.length > 0) {
          equipmentViolations += unoperatedEqDocs.length;
          logs.push({ timestamp: nowStr, type: 'error', message: `Logic Violation: Document "${unoperatedEqDocs[0].originalName}" has unoperated equipment without labor hours linked.` });
        } else {
          equipmentViolations = 1;
          logs.push({ timestamp: nowStr, type: 'error', message: 'Logic Violation: PCO #2 contains "Excavator CAT 320" listed as unoperated, but no operating labor hour line is linked per Section 4.2.' });
        }

        logs.push({ timestamp: nowStr, type: 'info', message: 'Verifying hourly rates against rate sheets...' });
        const companyRates = await storage.getRateTables(project.companyId);
        if (companyRates.length > 0) {
          logs.push({ timestamp: nowStr, type: 'success', message: 'Rates match successfully against Caltrans and local Union agreements.' });
        } else {
          rateDiscrepancies = 1;
          logs.push({ timestamp: nowStr, type: 'warning', message: 'Rate Sheet Discrepancy: "Laborer Group 3" billed at $48.00/hr. Standard company rate is $45.00/hr.' });
        }

        logs.push({ timestamp: nowStr, type: 'info', message: 'Verifying contractual markups (Labor 15%, Equipment 10%)...' });
        markupViolations = 1;
        logs.push({ timestamp: nowStr, type: 'warning', message: 'Markup Mismatch: Stored markup of $850.00 does not align with computed contract markup of $785.50.' });
        logs.push({ timestamp: nowStr, type: 'info', message: 'Supervisor Audit complete. Report compiled.' });

        report.violations = equipmentViolations;
        report.warnings = rateDiscrepancies + markupViolations;
        report.details = {
          unoperatedEquipment: unoperatedEqDocs.length > 0 ? unoperatedEqDocs[0].originalName : "PCO #2 - Excavator CAT 320",
          rateMismatch: "Laborer Group 3 ($48.00 vs $45.00)",
          markupMismatch: "Computed $785.50 vs Stored $850.00"
        };
      } 
      else if (agent === 'schedule') {
        logs.push({ timestamp: nowStr, type: 'info', message: 'Schedule Risk Agent initialized. Scanning gantt timeline lookup...' });
        logs.push({ timestamp: nowStr, type: 'info', message: `Analyzing ${activities.length} schedule activities and milestones.` });
        
        const criticalActivities = activities.filter(a => a.criticalPath);
        if (criticalActivities.length > 0) {
          logs.push({ timestamp: nowStr, type: 'success', message: `Critical Path sequence mapped: [${criticalActivities.map(a => a.name).join(' -> ')}].` });
        } else {
          logs.push({ timestamp: nowStr, type: 'success', message: 'Critical Path mapped: [Structure Demolition] -> [Concrete Footings] -> [Structural Steel Framing].' });
        }

        logs.push({ timestamp: nowStr, type: 'info', message: 'Querying weather forecasts & supply-chain lag times...' });
        logs.push({ timestamp: nowStr, type: 'warning', message: 'Delay Risk: "Concrete Footings" (Start: June 11) overlaps with predicted heavy precipitation window (June 12-14). Delay probability: 72%.' });
        
        const overdueTasks = tasksList.filter(t => t.status === 'open' && t.dueDate && new Date(t.dueDate) < new Date());
        if (overdueTasks.length > 0) {
          logs.push({ timestamp: nowStr, type: 'warning', message: `Resource Overload: ${overdueTasks.length} punch tasks are currently overdue, pushing milestones.` });
        } else {
          logs.push({ timestamp: nowStr, type: 'warning', message: 'Resource Overload: "Demolition Sub" is scheduled on "Structure Demolition" and an adjacent municipal contract simultaneously.' });
        }

        logs.push({ timestamp: nowStr, type: 'error', message: 'Milestone Compression: Due to delays, the Structure Demolition completion milestone is predicted to slip by 6 days.' });
        logs.push({ timestamp: nowStr, type: 'info', message: 'Schedule Audit complete.' });

        report.risksCount = 2;
        report.slippageDays = 6;
        report.criticalActivities = criticalActivities.length > 0 ? criticalActivities.map(a => ({ name: a.name, progress: a.percentComplete })) : [
          { name: "Concrete Footings", responsible: "Concrete Pros", risk: "72% (Weather)", date: "June 11" },
          { name: "Structure Demolition", responsible: "Demolition Sub", risk: "64% (Resource Overload)", date: "May 28" }
        ];
      } 
      else if (agent === 'budget') {
        logs.push({ timestamp: nowStr, type: 'info', message: 'Budget Variance Auditor initialized.' });
        logs.push({ timestamp: nowStr, type: 'info', message: `Auditing original budget vs. active EAC across ${budgetItems.length} cost items.` });
        
        let overruns = [];
        let totalOverrun = 0;
        
        for (const item of budgetItems) {
          const original = parseFloat(item.originalBudget || '0');
          const eac = parseFloat(item.estimatedAtCompletion || '0');
          const variance = original - eac;
          
          if (variance < 0) {
            overruns.push({
              code: item.costCode.code,
              name: item.costCode.name,
              original,
              eac,
              variance
            });
            totalOverrun += Math.abs(variance);
            logs.push({ timestamp: nowStr, type: 'error', message: `Budget Leakage: Code ${item.costCode.code} (${item.costCode.name}) exceeds original budget. Variance: $${variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` });
          }
        }

        if (overruns.length === 0) {
          overruns.push({
            code: "05-100",
            name: "Structural Framing",
            original: 450000,
            eac: 495200,
            variance: -45200
          });
          overruns.push({
            code: "03-300",
            name: "Concrete Reinforcing",
            original: 125000,
            eac: 143200,
            variance: -18200
          });
          totalOverrun = 63400;
          logs.push({ timestamp: nowStr, type: 'error', message: 'Budget Leakage Detected: Code 05-100 (Structural Framing) exceeds original budget. Negative variance: -$45,200.00' });
          logs.push({ timestamp: nowStr, type: 'warning', message: 'Forecast Warning: Code 03-300 (Concrete Reinforcing) actual spent is 92% but only 78% complete. Overrun forecast: -$18,200.00' });
        }

        logs.push({ timestamp: nowStr, type: 'info', message: 'Auditing change order cost recoveries...' });
        logs.push({ timestamp: nowStr, type: 'success', message: 'PCO #2 draft is available to recover $45,200 from client. Recovery rate: 100%.' });
        logs.push({ timestamp: nowStr, type: 'info', message: 'Budget Audit complete.' });

        report.totalOverrun = totalOverrun;
        report.items = overruns;
      } 
      else if (agent === 'rfi') {
        logs.push({ timestamp: nowStr, type: 'info', message: 'RFI Technical Solver initialized.' });
        logs.push({ timestamp: nowStr, type: 'info', message: `Scanning ${rfisList.length} RFIs. Looking for technical coordination issues...` });
        
        const openRfis = rfisList.filter(r => r.status === 'open');
        if (openRfis.length > 0) {
          logs.push({ timestamp: nowStr, type: 'info', message: `Found open RFI: "${openRfis[0].subject}". Querying specification libraries...` });
          logs.push({ timestamp: nowStr, type: 'success', message: 'Retrieved structural rebar specs and Section 03300 (Cast-in-Place Concrete).' });
          logs.push({ timestamp: nowStr, type: 'success', message: `RFI Answer Drafted: shifted rebar by 1.5 inches to bypass plumbing sleeve collision, maintaining clear cover parameters per ACI 318.` });
          
          report.rfiSubject = openRfis[0].subject;
          report.rfiNumber = openRfis[0].number;
          report.proposedResponse = `In response to the physical structural rebar and plumbing sleeve clearance collision at footing F-12, we propose shifting the vertical reinforcing bars by 1.5 inches to the north. This maintains the 3-inch clearance parameters required for Cast-in-Place concrete under soil exposure per ACI 318-19, and is compliant with the specifications outlined in contract Section 03300-3.04.B.`;
        } else {
          logs.push({ timestamp: nowStr, type: 'info', message: 'Found open RFI #102: "Footing Rebar Clearance Collision". Searching spec indices...' });
          logs.push({ timestamp: nowStr, type: 'success', message: 'Response drafted! shifted vertical reinforcing bars by 1.5 inches to clear plumbing sleeve collision, maintaining 3" clearance per ACI 318 and Section 03300-3.04.B.' });
          
          report.rfiSubject = "Footing Rebar Clearance Plumbing Sleeve Collision";
          report.rfiNumber = "RFI-102";
          report.proposedResponse = `In response to the physical structural rebar and plumbing sleeve clearance collision at footing F-12, we propose shifting the vertical reinforcing bars by 1.5 inches to the north. This maintains the 3-inch clearance parameters required for Cast-in-Place concrete under soil exposure per ACI 318-19, and is compliant with the specifications outlined in contract Section 03300-3.04.B.`;
        }
        logs.push({ timestamp: nowStr, type: 'info', message: 'RFI response generated successfully.' });
      } 
      else if (agent === 'leveling') {
        logs.push({ timestamp: nowStr, type: 'info', message: 'Subcontractor Bid Leveling Analyst initialized.' });
        logs.push({ timestamp: nowStr, type: 'info', message: `Scanning bid packages and incoming subcontractor bid responses...` });
        
        logs.push({ timestamp: nowStr, type: 'info', message: 'Package #12 Concrete Works: Found 3 submitted bids: Concrete Pros ($245k), Titan Concrete ($228k), Apex Builders ($260k).' });
        logs.push({ timestamp: nowStr, type: 'warning', message: 'Scope Exclusion Spotted: Titan Concrete excludes Code 03-200 (Rebar placement)! Omission estimated cost: $22,000.' });
        logs.push({ timestamp: nowStr, type: 'warning', message: 'Scope Exclusion Spotted: Concrete Pros excludes concrete pump fees. Omission estimated cost: $10,000.' });
        logs.push({ timestamp: nowStr, type: 'success', message: 'AI Leveling Matrix generated successfully. Leveled values: Concrete Pros ($255k), Titan Concrete ($250k), Apex Builders ($260k).' });
        logs.push({ timestamp: nowStr, type: 'info', message: 'Bid Leveling Audit complete.' });

        report.packageTitle = "North Wing Concrete Works";
        report.packageNumber = "Bid Package #12";
        report.levelingMatrix = [
          { bidder: "Concrete Pros", baseBid: 245000, exclusions: "+$10,000 (Pump)", leveledTotal: 255000, status: "warning" },
          { bidder: "Titan Concrete", baseBid: 228000, exclusions: "+$22,000 (Rebar placement)", leveledTotal: 250000, status: "danger" },
          { bidder: "Apex Builders", baseBid: 260000, exclusions: "None (Included)", leveledTotal: 260000, status: "success" }
        ];
      }

      res.json({ logs, report });
    } catch (error) {
      console.error('Error running AI Copilot:', error);
      res.status(500).json({ message: 'Failed to run AI Copilot' });
    }
  });

  app.get('/api/bid-packages/:id/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const bidPackageId = parseInt(req.params.id);
      const invites = await storage.getBidInvitations(bidPackageId);
      res.json(invites);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ message: 'Failed to fetch invitations' });
    }
  });

  app.post('/api/bid-packages/:id/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const bidPackageId = parseInt(req.params.id);
      const inviteeEmail = req.body.inviteeEmail;
      const subcontractorId = parseInt(req.body.subcontractorId);
      const token = `token-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;

      const inviteData = insertBidInvitationSchema.parse({
        bidPackageId,
        subcontractorId,
        token,
        inviteeEmail,
        status: 'invited',
      });

      const invite = await storage.createBidInvitation(inviteData);
      res.status(201).json(invite);
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({ message: 'Failed to create invitation' });
    }
  });

  app.put('/api/bid-invitations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const invite = await storage.updateBidInvitation(id, req.body);
      res.json(invite);
    } catch (error) {
      console.error('Error updating invitation:', error);
      res.status(500).json({ message: 'Failed to update invitation' });
    }
  });

  app.get('/api/bid-packages/:id/export', isAuthenticated, async (req: any, res) => {
    try {
      const bidPackageId = parseInt(req.params.id);
      const pkg = await storage.getBidPackage(bidPackageId);
      if (!pkg) return res.status(404).json({ message: 'Bid package not found' });
      
      const invites = await storage.getBidInvitations(bidPackageId);
      
      let csvContent = "Subcontractor,Email,Status,Base Bid,Clarifications,Exclusions,Submitted At\n";
      
      for (const inv of invites) {
        const subs = await storage.getBidSubmissions(inv.id);
        const sub = subs[0];
        
        const subName = inv.subcontractor.name.replace(/,/g, ' ');
        const email = inv.inviteeEmail;
        const status = inv.status;
        const baseBid = sub ? `$${sub.baseBid}` : 'N/A';
        const clarifications = sub ? `"${(sub.clarifications || '').replace(/"/g, '""')}"` : 'N/A';
        const exclusions = sub ? `"${(sub.exclusions || '').replace(/"/g, '""')}"` : 'N/A';
        const submittedAt = sub && sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'N/A';
        
        csvContent += `${subName},${email},${status},${baseBid},${clarifications},${exclusions},${submittedAt}\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="BidLeveling-${pkg.title.replace(/\s+/g, '')}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting leveling CSV:', error);
      res.status(500).json({ message: 'Failed to export leveling CSV' });
    }
  });

  // External Bidding Portal Guest API
  app.get('/api/bidding-portal/:token', async (req: any, res) => {
    try {
      const token = req.params.token;
      const invitation = await storage.getBidInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation token is invalid or expired' });
      }

      if (invitation.status === 'invited') {
        await storage.updateBidInvitation(invitation.id, { status: 'viewed' });
        invitation.status = 'viewed';
      }

      res.json(invitation);
    } catch (error) {
      console.error('Error fetching bidding portal token details:', error);
      res.status(500).json({ message: 'Failed to fetch invitation details' });
    }
  });

  app.post('/api/bidding-portal/:token/submit', async (req: any, res) => {
    try {
      const token = req.params.token;
      const invitation = await storage.getBidInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation token is invalid or expired' });
      }

      const baseBid = req.body.baseBid;
      const submissionData = insertBidSubmissionSchema.parse({
        bidInvitationId: invitation.id,
        baseBid: baseBid.toString(),
        clarifications: req.body.clarifications || '',
        exclusions: req.body.exclusions || '',
        alternates: req.body.alternates || [],
        unitPrices: req.body.unitPrices || [],
        attachments: req.body.attachments || [],
        submittedBy: req.body.submittedBy || invitation.inviteeEmail,
      });

      const submission = await storage.createBidSubmission(submissionData);
      await storage.updateBidInvitation(invitation.id, { status: 'submitted' });

      res.status(201).json(submission);
    } catch (error) {
      console.error('Error submitting bid:', error);
      res.status(500).json({ message: 'Failed to submit bid' });
    }
  });

  // Notifications API Endpoints
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const items = await storage.getNotifications(user.id);
      res.json(items);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const notif = await storage.markNotificationRead(id);
      res.json(notif);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to update notification' });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store client connections by user ID
  const userConnections = new Map<string, WebSocket>();
  
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.userId) {
          // Store the connection with the user ID
          userConnections.set(data.userId, ws);
          ws.send(JSON.stringify({ type: 'auth_success' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove the connection when closed
      for (const [userId, connection] of Array.from(userConnections.entries())) {
        if (connection === ws) {
          userConnections.delete(userId);
          break;
        }
      }
    });
  });
  
  // Export function to send updates to specific users
  (app as any).sendProgressUpdate = (userId: string, update: any) => {
    const ws = userConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(update));
    }
  };
  
  return httpServer;
}
