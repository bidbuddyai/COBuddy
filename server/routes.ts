import type { Express } from "express";
import { createServer, type Server } from "http";
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
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', authenticateSupabaseUser, async (req: any, res) => {
    try {
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
        createdBy: parseInt(req.user.id),
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
        
        // Process document asynchronously
        processDocument(document.id).catch(error => {
          console.error(`Error processing document ${document.id}:`, error);
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

  // AI Assistant Chat endpoint (simplified version for bubble/page)
  app.post('/api/ai/chat', authenticateSupabaseUser, async (req: any, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
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
      
      const response = await processAIChat(message, { rateContext });
      
      res.json({
        message: response,
        timestamp: new Date()
      });
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
  return httpServer;
}
