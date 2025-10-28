import { storage } from '../storage';
import { InsertChangeOrder } from '../../shared/schema';
import { coCreationWorkflow, COCreationState, DraftCO, WorkflowState } from './coCreationWorkflow';
import { AIResponse, AIAction } from './aiAssistant';

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
      case COCreationState.PROJECT_SELECTION:
        result = await this.handleProjectSelection(message, workflowState, context);
        break;
      
      case COCreationState.SCOPE_DEFINITION:
        result = await this.handleScopeDefinition(message, workflowState, context);
        break;
      
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
    // Try to extract project from message
    const projectMatch = message.match(/project\s+(\d+)|for\s+(.+?)(?:\s|$)/i);
    const projectIdFromMessage = projectMatch?.[1];
    const projectNameFromMessage = projectMatch?.[2];
    
    // Get available projects
    const projects = await storage.getProjects();
    
    // Try to find project
    let selectedProject = null;
    
    if (projectIdFromMessage) {
      selectedProject = projects.find(p => p.id === parseInt(projectIdFromMessage));
    } else if (projectNameFromMessage) {
      selectedProject = projects.find(p => 
        p.name.toLowerCase().includes(projectNameFromMessage.toLowerCase())
      );
    } else if (projects.length === 1) {
      selectedProject = projects[0];
    }
    
    // If we have a project, move to scope definition
    if (selectedProject) {
      const state: WorkflowState = {
        currentState: COCreationState.SCOPE_DEFINITION,
        draft: {
          projectId: selectedProject.id,
          projectName: selectedProject.name
        },
        lastUpdated: new Date()
      };
      
      return {
        response: {
          message: `Great! I'll help you create a change order for **${selectedProject.name}**.\n\nLet's start with the scope. What work needs to be done? Describe it in detail, for example:\n• "Asbestos removal, 200 square feet"\n• "Install 100 feet of new water line"\n• "Repair damaged concrete slab, 50 sq ft"`
        },
        updatedState: state
      };
    }
    
    // Need to ask for project
    const state: WorkflowState = {
      currentState: COCreationState.PROJECT_SELECTION,
      draft: {},
      lastUpdated: new Date()
    };
    
    return {
      response: {
        message: `I'll help you create a change order! First, which project is this for?\n\n${projects.map(p => `• ${p.name} (ID: ${p.id})`).join('\n')}\n\nYou can respond with the project name or ID.`
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
    state.currentState = COCreationState.SCOPE_DEFINITION;
    state.lastUpdated = new Date();
    
    return {
      response: {
        message: `Perfect! Creating a change order for **${selectedProject.name}**.\n\nNow, describe the scope of work. What needs to be done? For example:\n• "Asbestos removal, 200 square feet"\n• "Install 100 feet of new water line"\n• "Repair damaged concrete slab, 50 sq ft"`
      },
      updatedState: state
    };
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
