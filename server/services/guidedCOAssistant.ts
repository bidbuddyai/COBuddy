import { storage } from '../storage';
import { InsertChangeOrder } from '../../shared/schema';
import { coCreationWorkflow, COCreationState, DraftCO, WorkflowState } from './coCreationWorkflow';
import { AIResponse, AIAction } from './aiAssistant';
import { processDocument } from './documentProcessor';
import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class GuidedCOAssistantService {
  /**
   * Process a message in the context of a guided CO creation workflow
   */
  async processGuidedMessage(
    message: string, 
    workflowState: WorkflowState | null,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState | null;
    draft?: DraftCO;
  }> {
    // If no workflow state, check if user wants to create a CO
    if (!workflowState) {
      const wantsToCreate = this.detectCOCreationIntent(message);
      if (wantsToCreate) {
        const result = await this.startCOCreationWorkflow(message, context);
        return {
          ...result,
          draft: result.updatedState?.draft
        };
      }
      
      // Not a CO creation request
      return {
        response: {
          message: "I can help you create a change order with step-by-step guidance. Just say 'Create a change order' to get started!"
        },
        updatedState: null,
        draft: undefined
      };
    }
    
    // Process based on current state
    let result: { response: AIResponse; updatedState: WorkflowState | null };
    
    switch (workflowState.currentState) {
      case COCreationState.INITIAL:
      case COCreationState.CO_TYPE_SELECTION:
        result = await this.handleCOTypeSelection(message, workflowState, context);
        break;
        
      case COCreationState.PROJECT_SELECTION:
        result = await this.handleProjectSelection(message, workflowState, context);
        break;
      
      case COCreationState.SCOPE_DEFINITION:
        result = await this.handleScopeDefinition(message, workflowState, context);
        break;
      
      // Estimation Flow
      case COCreationState.LABOR_ESTIMATION:
        result = await this.handleLaborEstimation(message, workflowState, context);
        break;
      
      case COCreationState.MATERIALS_ESTIMATION:
        result = await this.handleMaterialsEstimation(message, workflowState, context);
        break;
      
      case COCreationState.EQUIPMENT_ESTIMATION:
        result = await this.handleEquipmentEstimation(message, workflowState, context);
        break;
      
      case COCreationState.SUBCONTRACTOR_ESTIMATION:
        result = await this.handleSubcontractorEstimation(message, workflowState, context);
        break;
      
      // T&M Flow
      case COCreationState.DOCUMENT_UPLOAD:
        result = await this.handleDocumentUpload(message, workflowState, context);
        break;
        
      case COCreationState.DOCUMENT_PARSING:
        result = await this.handleDocumentParsing(message, workflowState, context);
        break;
        
      case COCreationState.RATE_MATCHING:
        result = await this.handleRateMatching(message, workflowState, context);
        break;
        
      case COCreationState.DATA_CONFIRMATION:
        result = await this.handleDataConfirmation(message, workflowState, context);
        break;
      
      case COCreationState.REVIEW:
        result = await this.handleReview(message, workflowState, context);
        break;
      
      default:
        result = {
          response: {
            message: "Something went wrong with the workflow. Let's start over. What would you like to create?"
          },
          updatedState: null
        };
    }
    
    // Include draft in response
    return {
      ...result,
      draft: result.updatedState?.draft
    };
  }

  private detectCOCreationIntent(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      (lower.includes('create') || lower.includes('new') || lower.includes('make')) &&
      (lower.includes('change order') || lower.includes('co') || lower.includes('estimate'))
    );
  }

  private async startCOCreationWorkflow(
    message: string, 
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    // Start with CO type selection
    const state: WorkflowState = {
      currentState: COCreationState.CO_TYPE_SELECTION,
      draft: {},
      lastUpdated: new Date()
    };
    
    return {
      response: {
        message: `I'll help you create a change order! What type of change order do you need?\n\n📋 **1. Estimation** - Quick estimate based on similar past work and production rates\n• AI suggests labor, materials, equipment based on your description\n• Good for planning and preliminary estimates\n\n📄 **2. T&M (Time & Materials)** - Create from actual invoices, T&M sheets, and quotes\n• Upload your documents (T&M sheets, invoices, quotes)\n• AI extracts and matches rates from your rate tables\n• Includes proof/documentation for all costs\n\nRespond with "1" or "estimation" for quick estimates, or "2" or "T&M" for document-based.`
      },
      updatedState: state
    };
  }

  private async handleCOTypeSelection(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    const lower = message.toLowerCase();
    
    // Check for estimation selection
    if (lower.includes('1') || lower.includes('estimation') || lower.includes('estimate')) {
      state.draft.coType = 'estimation';
      state.currentState = COCreationState.PROJECT_SELECTION;
      state.lastUpdated = new Date();
      
      // Get available projects
      const projects = await storage.getProjects();
      
      return {
        response: {
          message: `Perfect! We'll create an **Estimation CO** with AI-suggested costs.\n\nWhich project is this for?\n\n${projects.map(p => `• ${p.name} (ID: ${p.id})`).join('\n')}\n\nYou can respond with the project name or ID.`
        },
        updatedState: state
      };
    }
    
    // Check for T&M selection
    if (lower.includes('2') || lower.includes('t&m') || lower.includes('time') || lower.includes('material') || lower.includes('document')) {
      state.draft.coType = 'tm';
      state.currentState = COCreationState.PROJECT_SELECTION;
      state.lastUpdated = new Date();
      
      // Get available projects
      const projects = await storage.getProjects();
      
      return {
        response: {
          message: `Great! We'll create a **T&M CO** from your documents (invoices, T&M sheets, quotes).\n\nWhich project is this for?\n\n${projects.map(p => `• ${p.name} (ID: ${p.id})`).join('\n')}\n\nYou can respond with the project name or ID.`
        },
        updatedState: state
      };
    }
    
    // Didn't understand the selection
    return {
      response: {
        message: `I didn't catch that. Please choose:\n• Type "1" or "estimation" for a quick AI estimate\n• Type "2" or "T&M" for document-based CO`
      },
      updatedState: state
    };
  }

  private async handleProjectSelection(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    const projects = await storage.getProjects();
    
    // Try to match project from message
    const projectIdMatch = message.match(/\d+/);
    const projectId = projectIdMatch ? parseInt(projectIdMatch[0]) : null;
    
    let selectedProject = null;
    
    if (projectId) {
      selectedProject = projects.find(p => p.id === projectId);
    } else {
      selectedProject = projects.find(p => 
        p.name.toLowerCase().includes(message.toLowerCase())
      );
    }
    
    if (!selectedProject) {
      return {
        response: {
          message: `I couldn't find that project. Please choose from:\n\n${projects.map(p => `• ${p.name} (ID: ${p.id})`).join('\n')}`
        },
        updatedState: state
      };
    }
    
    state.draft.projectId = selectedProject.id;
    state.draft.projectName = selectedProject.name;
    state.lastUpdated = new Date();
    
    // Branch based on CO type
    if (state.draft.coType === 'tm') {
      // T&M flow: go to document upload
      state.currentState = COCreationState.DOCUMENT_UPLOAD;
      
      return {
        response: {
          message: `Perfect! Creating a **T&M change order** for **${selectedProject.name}**.\n\nFirst, briefly describe the work scope (e.g., "Pipe installation and repair"). Then I'll ask you to upload your documents.\n\nWhat's the scope of work?`
        },
        updatedState: state
      };
    } else {
      // Estimation flow: go to scope definition
      state.currentState = COCreationState.SCOPE_DEFINITION;
      
      return {
        response: {
          message: `Perfect! Creating an **Estimation CO** for **${selectedProject.name}**.\n\nNow, describe the scope of work in detail. What needs to be done? For example:\n• "Asbestos removal, 200 square feet"\n• "Install 100 feet of new water line"\n• "Repair damaged concrete slab, 50 sq ft"`
        },
        updatedState: state
      };
    }
  }

  private async handleScopeDefinition(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    // Save the scope
    state.draft.scope = message;
    state.draft.description = message;
    state.draft.title = message.substring(0, 100); // First 100 chars as title
    
    // Find similar past work
    const similarCOs = await coCreationWorkflow.findSimilarCOs(message, state.draft.projectId);
    
    // Get labor estimates
    const laborEstimate = await coCreationWorkflow.estimateLabor(message, state.draft);
    
    // Move to labor estimation
    state.currentState = COCreationState.LABOR_ESTIMATION;
    state.lastUpdated = new Date();
    
    let responseMessage = `Got it! Scope: **${message}**\n\n`;
    
    if (similarCOs.length > 0) {
      responseMessage += `I found ${similarCOs.length} similar change orders from past work:\n`;
      similarCOs.slice(0, 3).forEach(co => {
        const total = co.totalAmount ? parseFloat(co.totalAmount.toString()) : 0;
        responseMessage += `• ${co.title} - $${total.toFixed(2)}\n`;
      });
      responseMessage += '\n';
    }
    
    if (laborEstimate.suggestions.length > 0) {
      responseMessage += `**Labor Estimates:**\n${laborEstimate.reasoning}\n\n`;
      laborEstimate.suggestions.forEach(suggestion => {
        responseMessage += `• ${suggestion.description}: ${suggestion.hours} hrs @ $${suggestion.rate}/hr = $${suggestion.amount.toFixed(2)}\n`;
        if (suggestion.reasoning) {
          responseMessage += `  _${suggestion.reasoning}_\n`;
        }
      });
      responseMessage += '\nDo these labor estimates look right? You can:\n';
      responseMessage += '• Say "yes" or "looks good" to accept\n';
      responseMessage += '• Adjust: "Change foreman to 40 hours" or "Add carpenter, 20 hours at $75/hr"\n';
      responseMessage += '• Say "no labor" if no labor is needed';
      
      // Save suggestions to draft
      state.draft.labor = laborEstimate.suggestions;
    } else {
      responseMessage += laborEstimate.reasoning;
      responseMessage += '\n\nTell me about the labor:\n';
      responseMessage += '• "Foreman, 30 hours at $95/hr"\n';
      responseMessage += '• "2 laborers, 40 hours each at $65/hr"\n';
      responseMessage += '• Or say "no labor" if none is needed';
    }
    
    return {
      response: { message: responseMessage },
      updatedState: state
    };
  }

  private async handleLaborEstimation(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    const lower = message.toLowerCase();
    
    // Check if user accepted estimates
    if (lower.includes('yes') || lower.includes('looks good') || lower.includes('correct') || lower.includes('accept')) {
      // Move to materials
      return await this.moveToMaterialsEstimation(state, context);
    }
    
    // Check if no labor
    if (lower.includes('no labor') || lower.includes('none')) {
      state.draft.labor = [];
      return await this.moveToMaterialsEstimation(state, context);
    }
    
    // Parse labor adjustments/additions
    const updatedLabor = this.parseLaborFromMessage(message, state.draft.labor || []);
    state.draft.labor = updatedLabor;
    state.lastUpdated = new Date();
    
    return {
      response: {
        message: `Updated labor:\n\n${updatedLabor.map(item => 
          `• ${item.description}: ${item.hours} hrs @ $${item.rate}/hr = $${item.amount.toFixed(2)}`
        ).join('\n')}\n\nAnything else to adjust? Or say "looks good" to continue to materials.`
      },
      updatedState: state
    };
  }

  private async moveToMaterialsEstimation(
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    state.currentState = COCreationState.MATERIALS_ESTIMATION;
    state.lastUpdated = new Date();
    
    const materialsEstimate = await coCreationWorkflow.estimateMaterials(state.draft.scope || '', state.draft);
    
    let responseMessage = '**Materials:**\n';
    
    if (materialsEstimate.suggestions.length > 0) {
      responseMessage += `${materialsEstimate.reasoning}\n\n`;
      materialsEstimate.suggestions.forEach(suggestion => {
        responseMessage += `• ${suggestion.description}: ${suggestion.quantity} ${suggestion.unit} @ $${suggestion.rate} = $${suggestion.amount.toFixed(2)}\n`;
        if (suggestion.reasoning) {
          responseMessage += `  _${suggestion.reasoning}_\n`;
        }
      });
      responseMessage += '\nAccept these materials? You can adjust or add items.';
      state.draft.materials = materialsEstimate.suggestions;
    } else {
      responseMessage += materialsEstimate.reasoning;
      responseMessage += '\n\nList materials needed, for example:\n';
      responseMessage += '• "Pipe, 100 feet at $15/ft"\n';
      responseMessage += '• "Concrete, 2 yards at $200/yd"\n';
      responseMessage += '• Or say "no materials" if none needed';
    }
    
    return {
      response: { message: responseMessage },
      updatedState: state
    };
  }

  private async handleMaterialsEstimation(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    const lower = message.toLowerCase();
    
    if (lower.includes('yes') || lower.includes('looks good') || lower.includes('correct') || lower.includes('accept')) {
      return await this.moveToEquipmentEstimation(state, context);
    }
    
    if (lower.includes('no material') || lower.includes('none')) {
      state.draft.materials = [];
      return await this.moveToEquipmentEstimation(state, context);
    }
    
    const updatedMaterials = this.parseMaterialsFromMessage(message, state.draft.materials || []);
    state.draft.materials = updatedMaterials;
    state.lastUpdated = new Date();
    
    return {
      response: {
        message: `Updated materials:\n\n${updatedMaterials.map(item => 
          `• ${item.description}: ${item.quantity} ${item.unit} @ $${item.rate} = $${item.amount.toFixed(2)}`
        ).join('\n')}\n\nAnything else? Or say "looks good" to continue to equipment.`
      },
      updatedState: state
    };
  }

  private async moveToEquipmentEstimation(
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    state.currentState = COCreationState.EQUIPMENT_ESTIMATION;
    state.lastUpdated = new Date();
    
    const equipmentEstimate = await coCreationWorkflow.estimateEquipment(state.draft.scope || '', state.draft);
    
    let responseMessage = '**Equipment:**\n';
    
    if (equipmentEstimate.suggestions.length > 0) {
      responseMessage += `${equipmentEstimate.reasoning}\n\n`;
      equipmentEstimate.suggestions.forEach(suggestion => {
        responseMessage += `• ${suggestion.description}: ${suggestion.hours} hrs @ $${suggestion.rate}/hr = $${suggestion.amount.toFixed(2)}\n`;
        if (suggestion.reasoning) {
          responseMessage += `  _${suggestion.reasoning}_\n`;
        }
      });
      responseMessage += '\nAccept these equipment estimates?';
      state.draft.equipment = equipmentEstimate.suggestions;
    } else {
      responseMessage += equipmentEstimate.reasoning;
      responseMessage += '\n\nList equipment needed:\n';
      responseMessage += '• "Excavator, 8 hours at $150/hr"\n';
      responseMessage += '• Or say "no equipment"';
    }
    
    return {
      response: { message: responseMessage },
      updatedState: state
    };
  }

  private async handleEquipmentEstimation(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    const lower = message.toLowerCase();
    
    if (lower.includes('yes') || lower.includes('looks good') || lower.includes('correct') || lower.includes('accept')) {
      return await this.moveToSubcontractorEstimation(state, context);
    }
    
    if (lower.includes('no equipment') || lower.includes('none')) {
      state.draft.equipment = [];
      return await this.moveToSubcontractorEstimation(state, context);
    }
    
    const updatedEquipment = this.parseEquipmentFromMessage(message, state.draft.equipment || []);
    state.draft.equipment = updatedEquipment;
    state.lastUpdated = new Date();
    
    return {
      response: {
        message: `Updated equipment:\n\n${updatedEquipment.map(item => 
          `• ${item.description}: ${item.hours} hrs @ $${item.rate}/hr = $${item.amount.toFixed(2)}`
        ).join('\n')}\n\nAnything else? Or say "looks good" to continue.`
      },
      updatedState: state
    };
  }

  private async moveToSubcontractorEstimation(
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    state.currentState = COCreationState.SUBCONTRACTOR_ESTIMATION;
    state.lastUpdated = new Date();
    
    return {
      response: {
        message: '**Subcontractors:**\n\nWill this work require any subcontractors? For example:\n• "ABC Plumbing, pipe installation, $5000"\n• Or say "no subs" to skip'
      },
      updatedState: state
    };
  }

  private async handleSubcontractorEstimation(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    const lower = message.toLowerCase();
    
    if (lower.includes('no sub') || lower.includes('none')) {
      state.draft.subcontractors = [];
      return await this.moveToReview(state, context);
    }
    
    if (lower.includes('yes') || lower.includes('looks good') || lower.includes('done')) {
      return await this.moveToReview(state, context);
    }
    
    const updatedSubs = this.parseSubcontractorsFromMessage(message, state.draft.subcontractors || []);
    state.draft.subcontractors = updatedSubs;
    state.lastUpdated = new Date();
    
    return {
      response: {
        message: `Updated subcontractors:\n\n${updatedSubs.map(item => 
          `• ${item.name} (${item.scope}): $${item.amount.toFixed(2)}`
        ).join('\n')}\n\nAny other subs? Or say "done" to review the change order.`
      },
      updatedState: state
    };
  }

  private async moveToReview(
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    state.currentState = COCreationState.REVIEW;
    state.lastUpdated = new Date();
    
    const summary = coCreationWorkflow.formatDraftSummary(state.draft);
    const total = coCreationWorkflow.calculateTotal(state.draft);
    
    return {
      response: {
        message: `Here's your complete change order:\n\n${summary}\n\nWould you like to:\n• "Create it" to save this change order\n• "Edit labor/materials/equipment" to make changes\n• "Start over" to begin again`
      },
      updatedState: state
    };
  }

  private async handleReview(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState | null;
  }> {
    const lower = message.toLowerCase();
    
    // Check if user wants to create
    if (lower.includes('create') || lower.includes('save') || lower.includes('yes')) {
      return await this.createChangeOrder(state, context);
    }
    
    // Check if user wants to edit
    if (lower.includes('edit labor')) {
      state.currentState = COCreationState.LABOR_ESTIMATION;
      state.lastUpdated = new Date();
      return {
        response: {
          message: `Current labor:\n\n${state.draft.labor?.map(item => 
            `• ${item.description}: ${item.hours} hrs @ $${item.rate}/hr = $${item.amount.toFixed(2)}`
          ).join('\n') || 'None'}\n\nWhat would you like to change?`
        },
        updatedState: state
      };
    }
    
    if (lower.includes('edit material')) {
      state.currentState = COCreationState.MATERIALS_ESTIMATION;
      state.lastUpdated = new Date();
      return {
        response: {
          message: `Current materials:\n\n${state.draft.materials?.map(item => 
            `• ${item.description}: ${item.quantity} ${item.unit} @ $${item.rate} = $${item.amount.toFixed(2)}`
          ).join('\n') || 'None'}\n\nWhat would you like to change?`
        },
        updatedState: state
      };
    }
    
    if (lower.includes('edit equipment')) {
      state.currentState = COCreationState.EQUIPMENT_ESTIMATION;
      state.lastUpdated = new Date();
      return {
        response: {
          message: `Current equipment:\n\n${state.draft.equipment?.map(item => 
            `• ${item.description}: ${item.hours} hrs @ $${item.rate}/hr = $${item.amount.toFixed(2)}`
          ).join('\n') || 'None'}\n\nWhat would you like to change?`
        },
        updatedState: state
      };
    }
    
    if (lower.includes('start over')) {
      return {
        response: {
          message: 'Okay, starting fresh. What project is this change order for?'
        },
        updatedState: null
      };
    }
    
    return {
      response: {
        message: 'Would you like to "create it", "edit" something, or "start over"?'
      },
      updatedState: state
    };
  }

  private async createChangeOrder(
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: null;
  }> {
    try {
      const draft = state.draft;
      const total = coCreationWorkflow.calculateTotal(draft);
      
      // Build extracted data structure
      const extractedData: any = {
        labor: draft.labor || [],
        materials: draft.materials || [],
        equipment: draft.equipment || [],
        disposal: []
      };
      
      // Calculate costs by category
      const laborCost = draft.labor?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const materialCost = draft.materials?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const equipmentCost = draft.equipment?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const subcontractorCost = draft.subcontractors?.reduce((sum, item) => sum + item.amount, 0) || 0;
      
      // Get project markups (use labor as default general markup)
      const project = await storage.getProject(draft.projectId!);
      const markup = project?.markupLabor ? parseFloat(project.markupLabor.toString()) : 15;
      
      // Generate a unique number for the CO
      const coNumber = `CO-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      const changeOrderData: InsertChangeOrder = {
        number: coNumber,
        projectId: draft.projectId!,
        title: draft.title || draft.scope || 'New Change Order',
        description: draft.description || draft.scope || '',
        status: 'draft',
        totalAmount: total.toString(),
        laborAmount: laborCost.toString(),
        materialAmount: materialCost.toString(),
        equipmentAmount: equipmentCost.toString(),
        disposalAmount: '0',
        subcontractorAmount: subcontractorCost.toString(),
        data: extractedData,
        createdBy: context.user?.id || 'system'
      };
      
      const newCO = await storage.createChangeOrder(changeOrderData);
      
      state.currentState = COCreationState.COMPLETE;
      
      return {
        response: {
          message: `✅ Change order created successfully!\n\n**${newCO.title}**\nTotal: $${total.toFixed(2)}\n\nI'll take you to the change order details now.`,
          actions: [{
            type: 'navigate',
            url: `/change-orders/${newCO.id}`
          }]
        },
        updatedState: null
      };
    } catch (error) {
      return {
        response: {
          message: `Error creating change order: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
        },
        updatedState: null
      };
    }
  }

  // Helper parsing methods
  // ===== T&M WORKFLOW HANDLERS =====
  
  private async handleDocumentUpload(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    // Check if files were uploaded
    if (context.fileIds && context.fileIds.length > 0) {
      // Files uploaded - move to parsing
      state.draft.uploadedFiles = context.fileIds;
      state.currentState = COCreationState.DOCUMENT_PARSING;
      state.lastUpdated = new Date();
      
      return {
        response: {
          message: `✅ Received ${context.fileIds.length} file(s)!\n\n🔄 Processing documents now:\n• Extracting text with OCR\n• Identifying labor, materials, equipment\n• Matching rates from your rate tables\n\nThis may take a moment...`
        },
        updatedState: state
      };
    }
    
    // Save the scope if provided
    if (!state.draft.scope) {
      state.draft.scope = message;
      state.draft.description = message;
      state.draft.title = message.substring(0, 100);
    }
    
    return {
      response: {
        message: `Got it! Scope: **${state.draft.scope}**\n\n📎 Now upload your documents (T&M sheets, invoices, quotes, receipts).\n\n**You can upload:**\n• T&M sheets with labor hours\n• Equipment rental invoices\n• Material invoices\n• Subcontractor quotes\n• Any supporting documentation\n\n**To upload:** Click the paperclip button below and select your files. I'll parse them and match rates from your rate tables.`
      },
      updatedState: state
    };
  }
  
  private async handleDocumentParsing(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    try {
      if (!state.draft.uploadedFiles || state.draft.uploadedFiles.length === 0) {
        // No files to parse - ask for upload
        state.currentState = COCreationState.DOCUMENT_UPLOAD;
        return {
          response: {
            message: `No documents found. Please upload your T&M sheets, invoices, or quotes using the paperclip button.`
          },
          updatedState: state
        };
      }
      
      // Process all uploaded documents
      const parsedResults = [];
      
      for (const fileId of state.draft.uploadedFiles) {
        try {
          // Process the document
          await processDocument(fileId);
          
          // Get the processed document from database
          const [processedDoc] = await db.select().from(documents).where(eq(documents.id, fileId));
          
          if (processedDoc && processedDoc.data) {
            parsedResults.push({
              filename: processedDoc.filename,
              data: processedDoc.data,
              status: processedDoc.status
            });
          }
        } catch (error) {
          console.error(`Error processing document ${fileId}:`, error);
          parsedResults.push({
            filename: `Document ${fileId}`,
            error: error instanceof Error ? error.message : 'Processing failed'
          });
        }
      }
      
      // Save parsed data to draft
      state.draft.parsedData = parsedResults;
      
      // Move to rate matching
      state.currentState = COCreationState.RATE_MATCHING;
      state.lastUpdated = new Date();
      
      const successCount = parsedResults.filter(r => !r.error).length;
      const failCount = parsedResults.length - successCount;
      
      return {
        response: {
          message: `✅ Document parsing complete!\n\n**Results:**\n• ${successCount} file(s) processed successfully\n${failCount > 0 ? `• ${failCount} file(s) had errors\n` : ''}\n🔄 Now matching rates from your rate tables...`
        },
        updatedState: state
      };
    } catch (error) {
      return {
        response: {
          message: `Error parsing documents: ${error instanceof Error ? error.message : 'Unknown error'}. Please try uploading again or contact support.`
        },
        updatedState: state
      };
    }
  }
  
  private async handleRateMatching(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    try {
      if (!state.draft.parsedData || state.draft.parsedData.length === 0) {
        state.currentState = COCreationState.DOCUMENT_UPLOAD;
        return {
          response: {
            message: `No parsed data available. Please upload documents first.`
          },
          updatedState: state
        };
      }
      
      // Aggregate all extracted data from parsed documents
      const allLabor: any[] = [];
      const allMaterials: any[] = [];
      const allEquipment: any[] = [];
      const allSubcontractors: any[] = [];
      
      for (const doc of state.draft.parsedData) {
        if (doc.error) continue;
        
        const extractedData = doc.data as any;
        
        // Convert extracted T&M data to draft format
        if (extractedData.laborEntries) {
          for (const labor of extractedData.laborEntries) {
            allLabor.push({
              description: `${labor.role} - ${labor.name || ''}`,
              hours: labor.hours || 0,
              rate: labor.rate || 0,
              amount: (labor.hours || 0) * (labor.rate || 0),
              confidence: labor.confidence || 0.5
            });
          }
        }
        
        if (extractedData.materialEntries) {
          for (const material of extractedData.materialEntries) {
            allMaterials.push({
              description: `${material.type} - ${material.description || ''}`,
              quantity: material.quantity || 0,
              unit: material.unit || 'EA',
              rate: material.rate || 0,
              amount: (material.quantity || 0) * (material.rate || 0),
              confidence: material.confidence || 0.5
            });
          }
        }
        
        if (extractedData.equipmentEntries) {
          for (const equipment of extractedData.equipmentEntries) {
            allEquipment.push({
              description: `${equipment.type} - ${equipment.description || ''}`,
              hours: equipment.hours || 0,
              rate: equipment.rate || 0,
              amount: (equipment.hours || 0) * (equipment.rate || 0),
              confidence: equipment.confidence || 0.5
            });
          }
        }
        
        if (extractedData.subcontractorEntries) {
          for (const sub of extractedData.subcontractorEntries) {
            allSubcontractors.push({
              name: sub.company || 'Unknown Subcontractor',
              scope: sub.description || '',
              amount: sub.amount || 0,
              confidence: sub.confidence || 0.5
            });
          }
        }
      }
      
      // Save matched data to draft
      state.draft.matchedRates = {
        labor: allLabor,
        materials: allMaterials,
        equipment: allEquipment,
        subcontractors: allSubcontractors
      };
      
      // Move to data confirmation
      state.currentState = COCreationState.DATA_CONFIRMATION;
      state.lastUpdated = new Date();
      
      // Format summary for user
      const summary = this.formatMatchedDataSummary(state.draft.matchedRates);
      
      return {
        response: {
          message: `✅ Rate matching complete!\n\n**Extracted Data:**\n\n${summary}\n\n**Next Steps:**\nReview the items above. You can:\n• Type "looks good" to confirm and create the CO\n• Request changes like "update foreman rate to $85/hr"\n• Add items by describing them\n• Remove items by saying "remove item X"\n\n⚠️ **Note:** Items with confidence below 70% are flagged - please review carefully.`
        },
        updatedState: state
      };
    } catch (error) {
      return {
        response: {
          message: `Error matching rates: ${error instanceof Error ? error.message : 'Unknown error'}.`
        },
        updatedState: state
      };
    }
  }
  
  private formatMatchedDataSummary(matchedRates: any): string {
    const parts: string[] = [];
    
    if (matchedRates.labor && matchedRates.labor.length > 0) {
      parts.push(`**Labor** (${matchedRates.labor.length} items):`);
      matchedRates.labor.forEach((item: any, idx: number) => {
        const warning = item.confidence < 0.7 ? ' ⚠️' : '';
        parts.push(`  ${idx + 1}. ${item.description}: ${item.hours}hrs @ $${item.rate}/hr = $${item.amount.toFixed(2)}${warning}`);
      });
    }
    
    if (matchedRates.materials && matchedRates.materials.length > 0) {
      parts.push(`\n**Materials** (${matchedRates.materials.length} items):`);
      matchedRates.materials.forEach((item: any, idx: number) => {
        const warning = item.confidence < 0.7 ? ' ⚠️' : '';
        parts.push(`  ${idx + 1}. ${item.description}: ${item.quantity} ${item.unit} @ $${item.rate} = $${item.amount.toFixed(2)}${warning}`);
      });
    }
    
    if (matchedRates.equipment && matchedRates.equipment.length > 0) {
      parts.push(`\n**Equipment** (${matchedRates.equipment.length} items):`);
      matchedRates.equipment.forEach((item: any, idx: number) => {
        const warning = item.confidence < 0.7 ? ' ⚠️' : '';
        parts.push(`  ${idx + 1}. ${item.description}: ${item.hours}hrs @ $${item.rate}/hr = $${item.amount.toFixed(2)}${warning}`);
      });
    }
    
    if (matchedRates.subcontractors && matchedRates.subcontractors.length > 0) {
      parts.push(`\n**Subcontractors** (${matchedRates.subcontractors.length} items):`);
      matchedRates.subcontractors.forEach((item: any, idx: number) => {
        const warning = item.confidence < 0.7 ? ' ⚠️' : '';
        parts.push(`  ${idx + 1}. ${item.name} - ${item.scope}: $${item.amount.toFixed(2)}${warning}`);
      });
    }
    
    if (parts.length === 0) {
      return 'No items extracted from documents.';
    }
    
    return parts.join('\n');
  }
  
  private async handleDataConfirmation(
    message: string,
    state: WorkflowState,
    context: any
  ): Promise<{
    response: AIResponse;
    updatedState: WorkflowState;
  }> {
    const lower = message.toLowerCase();
    
    // If user confirms the matched data, copy it to draft and move to review
    if (lower.includes('looks good') || lower.includes('confirm') || lower.includes('approve')) {
      // Copy matched rates to draft (if they exist from T&M flow)
      if (state.draft.matchedRates) {
        state.draft.labor = state.draft.matchedRates.labor || [];
        state.draft.materials = state.draft.matchedRates.materials || [];
        state.draft.equipment = state.draft.matchedRates.equipment || [];
        state.draft.subcontractors = state.draft.matchedRates.subcontractors || [];
        state.draft.confirmedData = true;
      }
      
      return await this.moveToReview(state, context);
    }
    
    // Allow manual entry or editing
    if (lower.includes('done')) {
      return await this.moveToReview(state, context);
    }
    
    // Parse manual entries (for editing or adding to matched data)
    const currentLabor = state.draft.matchedRates?.labor || state.draft.labor || [];
    const updatedLabor = this.parseLaborFromMessage(message, currentLabor);
    
    if (updatedLabor.length > currentLabor.length) {
      if (state.draft.matchedRates) {
        state.draft.matchedRates.labor = updatedLabor;
      } else {
        state.draft.labor = updatedLabor;
      }
      state.lastUpdated = new Date();
      
      return {
        response: {
          message: `Updated labor:\n\n${updatedLabor.map((item, idx) => 
            `${idx + 1}. ${item.description}: ${item.hours}hrs @ $${item.rate}/hr = $${item.amount.toFixed(2)}`
          ).join('\n')}\n\nAdd more items, edit existing ones, or say "looks good" to proceed.`
        },
        updatedState: state
      };
    }
    
    return {
      response: {
        message: `You can:\n• Type "looks good" to confirm and create the CO\n• Add items like "Foreman, 30 hours at $95/hr"\n• Request changes to existing items`
      },
      updatedState: state
    };
  }
  
  // ===== HELPER PARSING METHODS =====
  
  private parseLaborFromMessage(message: string, existing: any[]): any[] {
    // Simple parsing - in production would use more sophisticated NLP
    const lines = message.split(/[,\n]/);
    const labor = [...existing];
    
    for (const line of lines) {
      const match = line.match(/(.+?),?\s*(\d+\.?\d*)\s*(?:hours?|hrs?)\s*(?:at|@)?\s*\$?(\d+\.?\d*)/i);
      if (match) {
        const description = match[1].trim();
        const hours = parseFloat(match[2]);
        const rate = parseFloat(match[3]);
        
        // Check if updating existing
        const existingIndex = labor.findIndex(l => 
          l.description.toLowerCase().includes(description.toLowerCase())
        );
        
        if (existingIndex >= 0) {
          labor[existingIndex] = {
            description,
            hours,
            rate,
            amount: hours * rate
          };
        } else {
          labor.push({
            description,
            hours,
            rate,
            amount: hours * rate
          });
        }
      }
    }
    
    return labor;
  }

  private parseMaterialsFromMessage(message: string, existing: any[]): any[] {
    const lines = message.split(/[,\n]/);
    const materials = [...existing];
    
    for (const line of lines) {
      const match = line.match(/(.+?),?\s*(\d+\.?\d*)\s*(\w+)\s*(?:at|@)?\s*\$?(\d+\.?\d*)/i);
      if (match) {
        const description = match[1].trim();
        const quantity = parseFloat(match[2]);
        const unit = match[3];
        const rate = parseFloat(match[4]);
        
        materials.push({
          description,
          quantity,
          unit,
          rate,
          amount: quantity * rate
        });
      }
    }
    
    return materials;
  }

  private parseEquipmentFromMessage(message: string, existing: any[]): any[] {
    const lines = message.split(/[,\n]/);
    const equipment = [...existing];
    
    for (const line of lines) {
      const match = line.match(/(.+?),?\s*(\d+\.?\d*)\s*(?:hours?|hrs?)\s*(?:at|@)?\s*\$?(\d+\.?\d*)/i);
      if (match) {
        const description = match[1].trim();
        const hours = parseFloat(match[2]);
        const rate = parseFloat(match[3]);
        
        equipment.push({
          description,
          hours,
          rate,
          amount: hours * rate
        });
      }
    }
    
    return equipment;
  }

  private parseSubcontractorsFromMessage(message: string, existing: any[]): any[] {
    const lines = message.split(/[,\n]/);
    const subs = [...existing];
    
    for (const line of lines) {
      const match = line.match(/(.+?),\s*(.+?),\s*\$?(\d+\.?\d*)/i);
      if (match) {
        const name = match[1].trim();
        const scope = match[2].trim();
        const amount = parseFloat(match[3]);
        
        subs.push({
          name,
          scope,
          amount
        });
      }
    }
    
    return subs;
  }
}

export const guidedCOAssistant = new GuidedCOAssistantService();
