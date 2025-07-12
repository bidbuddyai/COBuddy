import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateUser, requireAdmin, requirePMOrAdmin, AuthenticatedRequest } from "./middleware/auth";
import { uploadMultiple } from "./middleware/upload";
import { processDocument, matchRatesToExtractedData } from "./services/documentProcessor";
import { generateChangeOrderExcel } from "./services/excelGenerator";
import { generateChangeOrderPDF } from "./services/pdfGenerator";
import { processAIChat } from "./services/openai";
import { insertDocumentSchema, insertChangeOrderSchema, insertProjectSchema } from "@shared/schema";
import { Request, Response } from "express";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mock authentication for development - in production, use proper auth
  app.use('/api', async (req: AuthenticatedRequest, res, next) => {
    try {
      // Check if mock user exists, create if not
      let user = await storage.getUserByEmail('john.smith@resource-env.com');
      if (!user) {
        user = await storage.createUser({
          email: 'john.smith@resource-env.com',
          role: 'admin',
          firstName: 'John',
          lastName: 'Smith'
        });
      }
      
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined
      };
      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ message: 'Authentication error' });
    }
  });

  // User routes
  app.get('/api/auth/user', async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(req.user.id);
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Project routes
  app.get('/api/projects', async (req: AuthenticatedRequest, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', async (req: AuthenticatedRequest, res) => {
    try {
      const projectData = insertProjectSchema.parse({
        ...req.body,
        createdBy: req.user?.id,
      });
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Failed to create project' });
    }
  });

  // Change order routes
  app.get('/api/change-orders', async (req: AuthenticatedRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      
      const changeOrders = await storage.getChangeOrders({ page, limit, status });
      res.json(changeOrders);
    } catch (error) {
      console.error('Error fetching change orders:', error);
      res.status(500).json({ message: 'Failed to fetch change orders' });
    }
  });

  app.post('/api/change-orders', async (req: AuthenticatedRequest, res) => {
    try {
      const changeOrderData = insertChangeOrderSchema.parse({
        ...req.body,
        createdBy: req.user?.id,
      });
      
      const changeOrder = await storage.createChangeOrder(changeOrderData);
      res.status(201).json(changeOrder);
    } catch (error) {
      console.error('Error creating change order:', error);
      res.status(500).json({ message: 'Failed to create change order' });
    }
  });

  app.get('/api/change-orders/:id', async (req: AuthenticatedRequest, res) => {
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

  app.put('/api/change-orders/:id', async (req: AuthenticatedRequest, res) => {
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
  app.get('/api/change-orders/:id/excel', async (req: AuthenticatedRequest, res) => {
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
  app.get('/api/change-orders/:id/pdf', async (req: AuthenticatedRequest, res) => {
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
  app.post('/api/documents/upload', uploadMultiple, async (req: AuthenticatedRequest, res) => {
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
          uploadedBy: req.user?.id,
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

  app.get('/api/documents', async (req: AuthenticatedRequest, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  app.get('/api/documents/:id', async (req: AuthenticatedRequest, res) => {
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

  // Rate table routes
  app.get('/api/rate-tables', async (req: AuthenticatedRequest, res) => {
    try {
      const rateTables = await storage.getRateTables();
      res.json(rateTables);
    } catch (error) {
      console.error('Error fetching rate tables:', error);
      res.status(500).json({ message: 'Failed to fetch rate tables' });
    }
  });

  app.put('/api/rate-tables/:id/approve', requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const rateTable = await storage.approveRateTable(id, req.user?.id || 0);
      res.json(rateTable);
    } catch (error) {
      console.error('Error approving rate table:', error);
      res.status(500).json({ message: 'Failed to approve rate table' });
    }
  });

  // AI Chat routes
  app.post('/api/chat', async (req: AuthenticatedRequest, res) => {
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

  app.get('/api/chat/conversations', async (req: AuthenticatedRequest, res) => {
    try {
      const conversations = await storage.getChatConversations(req.user?.id);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  // Change order generation from T&M data
  app.post('/api/change-orders/generate', async (req: AuthenticatedRequest, res) => {
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
  app.get('/api/analytics/:projectId', async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      
      const analytics = await storage.getProjectAnalytics(parseInt(projectId));
      
      res.json(analytics);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: 'Failed to generate analytics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
