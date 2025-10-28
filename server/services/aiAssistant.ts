import { storage } from '../storage';
import { processDocumentWithVision, processAIChat } from './openai';
import { generateChangeOrderExcel } from './excelGenerator';
import { generateChangeOrderPDF } from './pdfGenerator';
import { InsertChangeOrder, InsertDocument, ChangeOrder } from '../../shared/schema';
import { guidedCOAssistant } from './guidedCOAssistant';
import { WorkflowState } from './coCreationWorkflow';

export interface AIAction {
  type: 'navigate' | 'create' | 'update' | 'delete' | 'process' | 'generate' | 'refresh';
  endpoint?: string;
  data?: any;
  url?: string;
  successMessage?: string;
  targetId?: number;
}

export interface AIResponse {
  message: string;
  actions?: AIAction[];
  data?: any;
}

export class AIAssistantService {
  async processMessage(message: string, context: any): Promise<AIResponse> {
    try {
      // Check if there's an active workflow in the conversation
      const conversationId = context.conversationId;
      let workflowState: WorkflowState | null = null;
      
      if (conversationId) {
        const conversation = await storage.getChatConversation(conversationId);
        if (conversation?.metadata) {
          workflowState = conversation.metadata as WorkflowState;
        }
      }
      
      // Check if this is a guided CO creation request or continuation
      const intent = this.detectIntent(message.toLowerCase());
      const isGuidedCORequest = intent.type === 'create_change_order' || workflowState;
      
      if (isGuidedCORequest) {
        // Use guided workflow
        const result = await guidedCOAssistant.processGuidedMessage(message, workflowState, context);
        
        // Update conversation state
        if (conversationId) {
          await storage.updateChatConversation(conversationId, {
            metadata: result.updatedState || undefined,
            title: result.updatedState?.draft?.scope?.substring(0, 50) || 'CO Creation'
          });
        } else if (result.updatedState) {
          // Create new conversation with workflow state
          const newConversation = await storage.createChatConversation({
            userId: context.user?.id || 'system',
            messages: [{
              role: 'user',
              content: message,
              timestamp: new Date()
            }],
            title: result.updatedState.draft?.scope?.substring(0, 50) || 'CO Creation',
            metadata: result.updatedState
          });
          
          result.response.data = { 
            conversationId: newConversation.id,
            draft: result.draft
          };
        } else {
          // Just include draft in existing response data
          result.response.data = {
            ...result.response.data,
            draft: result.draft
          };
        }
        
        return result.response;
      }
      
      // Handle other intents
      switch (intent.type) {
        case 'edit_document':
          return await this.handleEditDocument(intent.params, context);
        
        case 'process_document':
          return await this.handleProcessDocument(intent.params, context);
        
        case 'generate_files':
          return await this.handleGenerateFiles(intent.params, context);
        
        case 'view_rates':
          return await this.handleViewRates(intent.params, context);
        
        case 'edit_rates':
          return await this.handleEditRates(intent.params, context);
        
        case 'validate_import':
          return await this.handleValidateImport(intent.params, context);
        
        default:
          // Use general AI chat for other queries
          return await processAIChat(message, context);
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      return {
        message: 'I encountered an error processing your request. Please try again or let me know what specific help you need.'
      };
    }
  }

  private detectIntent(message: string): { type: string; params: any } {
    // Detect change order creation
    if (message.includes('create') && (message.includes('change order') || message.includes('co'))) {
      const projectMatch = message.match(/project\s+(\d+)|for\s+(.+?)(?:\s|$)/i);
      return {
        type: 'create_change_order',
        params: { 
          projectId: projectMatch?.[1],
          projectName: projectMatch?.[2]
        }
      };
    }

    // Detect document editing
    if (message.includes('edit') && (message.includes('document') || message.includes('t&m') || message.includes('sheet'))) {
      const docMatch = message.match(/document\s+(\d+)|doc\s+(\d+)/i);
      return {
        type: 'edit_document',
        params: { documentId: docMatch?.[1] || docMatch?.[2] }
      };
    }

    // Detect document processing
    if (message.includes('process') || message.includes('analyze') || message.includes('extract')) {
      return { type: 'process_document', params: {} };
    }

    // Detect file generation
    if (message.includes('generate') && (message.includes('excel') || message.includes('pdf') || message.includes('files'))) {
      const coMatch = message.match(/change order\s+(\d+)|co\s+(\d+)/i);
      return {
        type: 'generate_files',
        params: { changeOrderId: coMatch?.[1] || coMatch?.[2] }
      };
    }

    // Detect rate viewing/searching
    if ((message.includes('show') || message.includes('find') || message.includes('search')) && message.includes('rate')) {
      const itemMatch = message.match(/(?:for|rate for)\s+(.+?)(?:\s|$)/i);
      return {
        type: 'view_rates',
        params: { searchTerm: itemMatch?.[1] }
      };
    }

    // Detect rate editing
    if (message.includes('edit') && message.includes('rate')) {
      const rateMatch = message.match(/rate\s+(\d+)|for\s+(.+?)\s+to\s+\$?([\d.]+)/i);
      return {
        type: 'edit_rates',
        params: {
          rateId: rateMatch?.[1],
          itemName: rateMatch?.[2],
          newRate: rateMatch?.[3]
        }
      };
    }

    // Detect import validation
    if (message.includes('validate') || message.includes('check') || message.includes('verify')) {
      return { type: 'validate_import', params: {} };
    }

    return { type: 'general', params: {} };
  }

  private async handleCreateChangeOrder(params: any, context: any): Promise<AIResponse> {
    try {
      // Get projects to help identify the right one
      const projects = await storage.getProjects();
      
      let projectId = params.projectId;
      if (!projectId && params.projectName) {
        const project = projects.find(p => 
          p.name.toLowerCase().includes(params.projectName.toLowerCase())
        );
        projectId = project?.id;
      }

      if (!projectId && projects.length === 1) {
        projectId = projects[0].id;
      }

      if (!projectId) {
        return {
          message: `I found ${projects.length} projects. Which one would you like to create a change order for?\n\n${projects.map(p => `• ${p.name} (ID: ${p.id})`).join('\n')}\n\nYou can say "Create a change order for project [ID or name]"`,
          actions: [{
            type: 'navigate',
            url: '/projects'
          }]
        };
      }

      // Create the change order
      const changeOrderData: InsertChangeOrder = {
        projectId: parseInt(projectId),
        title: 'New Change Order',
        description: 'Created by AI Assistant',
        status: 'draft',
        laborCost: 0,
        materialCost: 0,
        equipmentCost: 0,
        disposalCost: 0,
        markup: 15,
        totalCost: 0,
        createdBy: context.user?.id || '',
        extractedData: {}
      };

      const newCO = await storage.createChangeOrder(changeOrderData);

      return {
        message: `I've created a new change order (ID: ${newCO.id}) for project ${projectId}. Would you like to:\n\n• Upload T&M sheets to populate it\n• Manually enter costs\n• Generate the Excel and PDF files\n\nThe change order is currently in draft status.`,
        actions: [{
          type: 'navigate',
          url: `/change-orders/${newCO.id}`
        }]
      };
    } catch (error) {
      return {
        message: `I couldn't create the change order: ${error instanceof Error ? error.message : 'Unknown error'}. Please check if the project exists or try again.`
      };
    }
  }

  private async handleEditDocument(params: any, context: any): Promise<AIResponse> {
    try {
      const { documentId } = params;
      
      if (!documentId) {
        const documents = await storage.getDocuments();
        const pendingDocs = documents.filter(d => d.status === 'pending' || d.status === 'processing');
        
        return {
          message: `I found ${documents.length} documents (${pendingDocs.length} pending processing). Which document would you like to edit?\n\n${documents.slice(0, 10).map(d => `• ${d.fileName} (ID: ${d.id}, Status: ${d.status})`).join('\n')}\n\nYou can say "Edit document [ID]"`,
          actions: [{
            type: 'navigate',
            url: '/documents'
          }]
        };
      }

      const document = await storage.getDocument(parseInt(documentId));
      if (!document) {
        return { message: `Document ${documentId} not found.` };
      }

      // Show current extracted data
      const extractedData = document.extractedData || {};
      
      return {
        message: `Document "${document.fileName}" has the following extracted data:\n\n**Labor:**\n${JSON.stringify(extractedData.labor || [], null, 2)}\n\n**Equipment:**\n${JSON.stringify(extractedData.equipment || [], null, 2)}\n\n**Materials:**\n${JSON.stringify(extractedData.materials || [], null, 2)}\n\n**Disposal:**\n${JSON.stringify(extractedData.disposal || [], null, 2)}\n\nTell me what you'd like to edit (e.g., "Change the labor rate for John Doe to $85/hr" or "Add 10 hours of excavator time").`
      };
    } catch (error) {
      return {
        message: `Error accessing document: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleProcessDocument(params: any, context: any): Promise<AIResponse> {
    try {
      const documents = await storage.getDocuments();
      const unprocessedDocs = documents.filter(d => d.status === 'pending');
      
      if (unprocessedDocs.length === 0) {
        return {
          message: 'All documents have been processed. Would you like to upload new documents or re-process existing ones?',
          actions: [{
            type: 'navigate',
            url: '/documents'
          }]
        };
      }

      // Process the first unprocessed document
      const doc = unprocessedDocs[0];
      
      return {
        message: `I'll process "${doc.fileName}" now. This document will be analyzed using AI vision to extract:\n\n• Labor hours and rates\n• Equipment usage\n• Materials used\n• Disposal costs\n\nProcessing will take a few moments...`,
        actions: [{
          type: 'process',
          endpoint: `/api/documents/${doc.id}/process`,
          successMessage: `Document ${doc.fileName} has been processed successfully!`
        }]
      };
    } catch (error) {
      return {
        message: `Error processing documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleGenerateFiles(params: any, context: any): Promise<AIResponse> {
    try {
      const { changeOrderId } = params;
      
      if (!changeOrderId) {
        const changeOrders = await storage.getChangeOrders({ limit: 10 });
        
        return {
          message: `Which change order would you like to generate files for?\n\n${changeOrders.data.slice(0, 5).map(co => `• ${co.title} (ID: ${co.id}, Project: ${co.projectId}, Total: $${co.totalCost})`).join('\n')}\n\nYou can say "Generate files for change order [ID]"`,
          actions: [{
            type: 'navigate',
            url: '/change-orders'
          }]
        };
      }

      const changeOrder = await storage.getChangeOrder(parseInt(changeOrderId));
      if (!changeOrder) {
        return { message: `Change order ${changeOrderId} not found.` };
      }

      return {
        message: `I'll generate both Excel and PDF files for change order "${changeOrder.title}" (ID: ${changeOrder.id}).\n\nThe files will include:\n• Detailed cost breakdown\n• Labor backup with rates\n• Equipment usage\n• Materials list\n• Disposal costs\n• ${changeOrder.markup}% markup\n• Total: $${changeOrder.totalCost}\n\nGenerating files now...`,
        actions: [
          {
            type: 'generate',
            endpoint: `/api/change-orders/${changeOrderId}/export/excel`,
            successMessage: 'Excel file generated successfully!'
          },
          {
            type: 'generate',
            endpoint: `/api/change-orders/${changeOrderId}/export/pdf`,
            successMessage: 'PDF file generated successfully!'
          }
        ]
      };
    } catch (error) {
      return {
        message: `Error generating files: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleViewRates(params: any, context: any): Promise<AIResponse> {
    try {
      const { searchTerm } = params;
      const companyId = context.user?.companyId;
      
      // Get all rates
      const companyRates = await storage.getRateTables(companyId);
      const publicRates = await storage.getPublicRateTables();
      const allRates = [...companyRates, ...publicRates];
      
      let relevantRates = allRates;
      
      if (searchTerm) {
        // Search for specific rates
        relevantRates = allRates.filter(rt => {
          const entries = rt.data?.entries || rt.data || [];
          return entries.some((entry: any) => 
            entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.item?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        });
      }

      if (relevantRates.length === 0) {
        return {
          message: `No rates found${searchTerm ? ` for "${searchTerm}"` : ''}. Would you like to:\n\n• View all available rates\n• Import new rates\n• Create a custom rate`,
          actions: [{
            type: 'navigate',
            url: '/rate-tables'
          }]
        };
      }

      // Show sample rates
      const sampleRates = [];
      for (const table of relevantRates.slice(0, 3)) {
        const entries = table.data?.entries || table.data || [];
        const relevantEntries = searchTerm 
          ? entries.filter((e: any) => 
              e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              e.item?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : entries.slice(0, 3);
        
        if (relevantEntries.length > 0) {
          sampleRates.push({
            tableName: table.name,
            type: table.type,
            isPublic: !table.companyId,
            entries: relevantEntries
          });
        }
      }

      return {
        message: `Found ${relevantRates.length} rate tables${searchTerm ? ` containing "${searchTerm}"` : ''}:\n\n${sampleRates.map(rt => 
          `**${rt.tableName}** (${rt.type}${rt.isPublic ? ' - Public' : ''}):\n${rt.entries.map((e: any) => 
            `• ${e.description || e.item}: $${e.rate}${e.unit ? `/${e.unit}` : ''}`
          ).join('\n')}`
        ).join('\n\n')}\n\nWould you like to see more rates or edit any of these?`,
        actions: [{
          type: 'navigate',
          url: '/rate-tables'
        }]
      };
    } catch (error) {
      return {
        message: `Error viewing rates: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleEditRates(params: any, context: any): Promise<AIResponse> {
    try {
      const { rateId, itemName, newRate } = params;
      
      if (!itemName || !newRate) {
        return {
          message: 'To edit a rate, please specify the item and new rate. For example: "Edit the rate for excavator to $150/hr"'
        };
      }

      // Find the rate table containing this item
      const companyId = context.user?.companyId;
      const rateTables = await storage.getRateTables(companyId);
      
      let foundTable = null;
      let foundEntry = null;
      let entryIndex = -1;
      
      for (const table of rateTables) {
        const entries = table.data?.entries || table.data || [];
        const index = entries.findIndex((e: any) => 
          e.description?.toLowerCase().includes(itemName.toLowerCase()) ||
          e.item?.toLowerCase().includes(itemName.toLowerCase())
        );
        
        if (index !== -1) {
          foundTable = table;
          foundEntry = entries[index];
          entryIndex = index;
          break;
        }
      }

      if (!foundTable || !foundEntry) {
        return {
          message: `I couldn't find a rate for "${itemName}". Please check the exact name or browse the rate tables to find the correct item.`,
          actions: [{
            type: 'navigate',
            url: '/rate-tables'
          }]
        };
      }

      // Update the rate
      const entries = foundTable.data?.entries || foundTable.data || [];
      entries[entryIndex] = {
        ...foundEntry,
        rate: parseFloat(newRate)
      };

      await storage.updateRateTable(foundTable.id, {
        data: { entries }
      });

      return {
        message: `I've updated the rate for "${foundEntry.description || foundEntry.item}" from $${foundEntry.rate} to $${newRate} in the "${foundTable.name}" table.\n\nThis change will apply to all future change orders using this rate.`,
        actions: [{
          type: 'refresh'
        }]
      };
    } catch (error) {
      return {
        message: `Error editing rate: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleValidateImport(params: any, context: any): Promise<AIResponse> {
    try {
      const documents = await storage.getDocuments();
      const recentDocs = documents.filter(d => 
        d.status === 'completed' && 
        d.extractedData && 
        Object.keys(d.extractedData).length > 0
      ).slice(0, 5);

      if (recentDocs.length === 0) {
        return {
          message: 'No recently imported documents found. Please upload and process documents first.',
          actions: [{
            type: 'navigate',
            url: '/documents'
          }]
        };
      }

      // Validate against rate tables
      const companyId = context.user?.companyId;
      const rateTables = await storage.getRateTables(companyId);
      const publicRates = await storage.getPublicRateTables();
      const allRates = [...rateTables, ...publicRates];

      const validationResults = [];

      for (const doc of recentDocs) {
        const issues = [];
        const extractedData = doc.extractedData as any;

        // Check labor rates
        if (extractedData.labor) {
          for (const labor of extractedData.labor) {
            // Find matching rate
            let matchFound = false;
            for (const table of allRates.filter(rt => rt.type === 'labor')) {
              const entries = table.data?.entries || table.data || [];
              const match = entries.find((e: any) => 
                e.description?.toLowerCase().includes(labor.name?.toLowerCase()) ||
                e.classification?.toLowerCase() === labor.classification?.toLowerCase()
              );
              
              if (match) {
                matchFound = true;
                if (Math.abs(match.rate - labor.rate) > 0.01) {
                  issues.push(`Labor rate mismatch: ${labor.name} - Document: $${labor.rate}/hr, Standard: $${match.rate}/hr`);
                }
                break;
              }
            }
            
            if (!matchFound) {
              issues.push(`No matching rate found for: ${labor.name} (${labor.classification})`);
            }
          }
        }

        validationResults.push({
          fileName: doc.fileName,
          issues: issues.length > 0 ? issues : ['All rates validated successfully']
        });
      }

      return {
        message: `Validation results for recent imports:\n\n${validationResults.map(r => 
          `**${r.fileName}**:\n${r.issues.map(i => `• ${i}`).join('\n')}`
        ).join('\n\n')}\n\nWould you like me to help fix any of these issues?`
      };
    } catch (error) {
      return {
        message: `Error validating imports: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async logConversation(userId: string, message: string, context: any) {
    try {
      // Store conversation for learning and reference
      await storage.createChatConversation({
        userId: userId || 'system',
        messages: [{
          role: 'user',
          content: message,
          timestamp: new Date(),
          context: {
            page: context.pageContext?.currentPage,
            url: context.pageContext?.url
          }
        }],
        title: message.substring(0, 50) + '...',
        metadata: {
          intent: this.detectIntent(message.toLowerCase()).type,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log conversation:', error);
    }
  }
}

export const aiAssistantService = new AIAssistantService();