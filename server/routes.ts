import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
// import { setupAuth, authenticateSupabaseUser } from "./replitAuth";
// import { setupAuth, authenticateSupabaseUser } from "./auth";
import { authenticateSupabaseUser } from "./middleware/supabaseAuth";
import { uploadMultiple, upload } from "./middleware/upload";
import { processDocument, matchRatesToExtractedData } from "./services/documentProcessor";
import { generateChangeOrderExcel } from "./services/excelGenerator";
import { generateChangeOrderPDF } from "./services/pdfGenerator";
import { processAIChat } from "./services/openai";
import { insertDocumentSchema, insertChangeOrderSchema, insertProjectSchema } from "@shared/schema";
import { Request, Response } from "express";
import { aiAssistantService } from "./services/aiAssistant";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  // setupAuth(app); // Commented out - using Supabase auth instead

  // User routes for Supabase
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
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
  app.put('/api/users/profile', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const { firstName, lastName, email, role } = req.body;
      const userId = req.user.id;
      
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
  
  app.put('/api/users/settings/notifications', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
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
  
  app.put('/api/users/settings/preferences', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
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
  
  app.put('/api/users/settings/integrations', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
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
  app.get('/api/companies/current', authenticateSupabaseUser, async (req: any, res) => {
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
  
  app.put('/api/companies/current', authenticateSupabaseUser, async (req: any, res) => {
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
  
  app.get('/api/companies/users', authenticateSupabaseUser, async (req: any, res) => {
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
  
  app.put('/api/companies/users/:userId/role', authenticateSupabaseUser, async (req: any, res) => {
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
  
  app.delete('/api/companies/users/:userId', authenticateSupabaseUser, async (req: any, res) => {
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
  
  app.post('/api/companies/invite', authenticateSupabaseUser, async (req: any, res) => {
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
  
  app.get('/api/companies/invitations', authenticateSupabaseUser, async (req: any, res) => {
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
  
  app.delete('/api/companies/invitations/:invitationId', authenticateSupabaseUser, async (req: any, res) => {
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

  app.post('/api/companies/setup', authenticateSupabaseUser, async (req: any, res) => {
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
  app.get('/api/dashboard/stats', authenticateSupabaseUser, async (req: any, res) => {
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
  app.get('/api/projects', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const user = req.user;
      const projects = await storage.getProjects(user?.companyId);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.get('/api/projects/:id', authenticateSupabaseUser, async (req: any, res) => {
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

  app.post('/api/projects', authenticateSupabaseUser, async (req: any, res) => {
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
  app.get('/api/change-orders', authenticateSupabaseUser, async (req: any, res) => {
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

  app.post('/api/change-orders', authenticateSupabaseUser, async (req: any, res) => {
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
      
      // Generate a unique change order number
      const timestamp = Date.now();
      const changeOrderNumber = `CO-${processedBody.projectId}-${timestamp}`;
      
      const changeOrderData = insertChangeOrderSchema.parse({
        ...processedBody,
        number: changeOrderNumber,
        createdBy: parseInt(req.user.id),
      });
      
      const changeOrder = await storage.createChangeOrder(changeOrderData);
      res.status(201).json(changeOrder);
    } catch (error) {
      console.error('Error creating change order:', error);
      res.status(500).json({ message: 'Failed to create change order' });
    }
  });

  app.get('/api/change-orders/:id', authenticateSupabaseUser, async (req: any, res) => {
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

  app.put('/api/change-orders/:id', authenticateSupabaseUser, async (req: any, res) => {
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
  app.get('/api/change-orders/:id/excel', authenticateSupabaseUser, async (req: any, res) => {
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
  app.get('/api/change-orders/:id/pdf', authenticateSupabaseUser, async (req: any, res) => {
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

  // Export endpoints for AI assistant
  app.post('/api/change-orders/:id/export/excel', authenticateSupabaseUser, async (req: any, res) => {
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

  app.post('/api/change-orders/:id/export/pdf', authenticateSupabaseUser, async (req: any, res) => {
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
  app.post('/api/documents/upload', authenticateSupabaseUser, uploadMultiple, async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const uploadedDocuments = [];
      
      for (const file of files) {
        const documentData = insertDocumentSchema.parse({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          type: req.body.type || 'tm_sheet',
          projectId: req.body.projectId ? parseInt(req.body.projectId) : undefined,
          uploadedBy: parseInt(req.user.id),
        });
        
        const document = await storage.createDocument(documentData);
        uploadedDocuments.push(document);
        
        // Send initial progress update
        const userId = req.user.id;
        (app as any).sendProgressUpdate?.(userId, {
          type: 'document_progress',
          documentId: document.id,
          status: 'processing',
          progress: 0,
          message: 'Starting document processing...'
        });
        
        // Process document asynchronously with progress updates
        processDocument(document.id, (progress, message) => {
          // Send progress updates via WebSocket
          (app as any).sendProgressUpdate?.(userId, {
            type: 'document_progress',
            documentId: document.id,
            status: 'processing',
            progress,
            message
          });
        }).then(() => {
          // Send completion update
          (app as any).sendProgressUpdate?.(userId, {
            type: 'document_progress',
            documentId: document.id,
            status: 'completed',
            progress: 100,
            message: 'Document processing completed!'
          });
        }).catch(error => {
          console.error(`Error processing document ${document.id}:`, error);
          // Send error update
          (app as any).sendProgressUpdate?.(userId, {
            type: 'document_progress',
            documentId: document.id,
            status: 'failed',
            progress: 0,
            message: `Processing failed: ${error.message}`
          });
        });
      }
      
      res.status(201).json(uploadedDocuments);
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({ message: 'Failed to upload documents' });
    }
  });

  app.get('/api/documents', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const documents = await storage.getDocuments(projectId);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  app.get('/api/documents/:id', authenticateSupabaseUser, async (req: any, res) => {
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
  app.patch('/api/documents/:id', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const updatedDocument = await storage.updateDocument(id, updates);
      res.json(updatedDocument);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ message: 'Failed to update document' });
    }
  });

  // Reprocess document
  app.post('/api/documents/:id/reprocess', authenticateSupabaseUser, async (req: any, res) => {
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
  app.post('/api/documents/:id/process', authenticateSupabaseUser, async (req: any, res) => {
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
  app.delete('/api/documents/:id', authenticateSupabaseUser, async (req: any, res) => {
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
  app.get('/api/rate-tables', authenticateSupabaseUser, async (req: any, res) => {
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
  app.put('/api/rate-tables/:id/approve', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const id = parseInt(req.params.id);
      const rateTable = await storage.approveRateTable(id, parseInt(user.id));
      res.json(rateTable);
    } catch (error) {
      console.error('Error approving rate table:', error);
      res.status(500).json({ message: 'Failed to approve rate table' });
    }
  });

  // Update rate table data
  app.put('/api/rate-tables/:id', authenticateSupabaseUser, async (req: any, res) => {
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
  app.post('/api/chat', authenticateSupabaseUser, async (req: any, res) => {
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

  app.get('/api/chat/conversations', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const conversations = await storage.getChatConversations(parseInt(req.user.id));
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  // AI Assistant Chat endpoint (enhanced version with actions)
  app.post('/api/ai/chat', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const { message, context, requestActions } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }
      
      // Get comprehensive context for AI
      const userId = req.user?.id;
      const userCompanyId = req.user?.companyId;
      
      // Get rate context
      const rateTablesData = await storage.getRateTables(userCompanyId);
      const publicRates = await storage.getPublicRateTables();
      const allRates = [...rateTablesData, ...publicRates];
      
      // Get project context
      const projects = await storage.getProjects();
      const changeOrders = await storage.getChangeOrders({ limit: 10 });
      const documents = await storage.getDocuments();
      
      const enhancedContext = {
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
            total: co.totalCost
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
  app.post('/api/change-orders/generate', authenticateSupabaseUser, async (req: any, res) => {
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
  app.get('/api/analytics/:projectId', authenticateSupabaseUser, async (req: any, res) => {
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
  app.post('/api/rate-tables/caltrans/upload', authenticateSupabaseUser, upload.single('file'), async (req: any, res) => {
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
      res.status(500).json({ message: error.message || 'Failed to upload Caltrans rates' });
    }
  });

  // Get Caltrans rates specifically
  app.get('/api/rate-tables/caltrans', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const { getCaltransRates } = await import('./services/caltransRateImporter.js');
      const caltransRates = await getCaltransRates();
      res.json(caltransRates);
    } catch (error) {
      console.error('Error fetching Caltrans rates:', error);
      res.status(500).json({ message: 'Failed to fetch Caltrans rates' });
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
      for (const [userId, connection] of userConnections) {
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
