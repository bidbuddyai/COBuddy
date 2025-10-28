import { storage } from '../storage';
import { ChangeOrder, Project } from '../../shared/schema';

// Workflow states for guided CO creation
export enum COCreationState {
  INITIAL = 'initial',
  PROJECT_SELECTION = 'project_selection',
  SCOPE_DEFINITION = 'scope_definition',
  LABOR_ESTIMATION = 'labor_estimation',
  MATERIALS_ESTIMATION = 'materials_estimation',
  EQUIPMENT_ESTIMATION = 'equipment_estimation',
  SUBCONTRACTOR_ESTIMATION = 'subcontractor_estimation',
  REVIEW = 'review',
  COMPLETE = 'complete'
}

export interface DraftCO {
  projectId?: number;
  projectName?: string;
  scope?: string;
  title?: string;
  description?: string;
  labor?: {
    description: string;
    hours: number;
    rate: number;
    amount: number;
    reasoning?: string;
  }[];
  materials?: {
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    reasoning?: string;
  }[];
  equipment?: {
    description: string;
    hours: number;
    rate: number;
    amount: number;
    reasoning?: string;
  }[];
  subcontractors?: {
    name: string;
    scope: string;
    amount: number;
    reasoning?: string;
  }[];
  totalEstimate?: number;
}

export interface WorkflowState {
  currentState: COCreationState;
  draft: DraftCO;
  conversationId?: number;
  lastUpdated: Date;
}

export class COCreationWorkflowService {
  /**
   * Search for similar past change orders based on scope/description
   */
  async findSimilarCOs(scope: string, projectId?: number): Promise<ChangeOrder[]> {
    try {
      // Get all change orders
      const allCOs = await storage.getChangeOrders({ limit: 100 });
      
      // Filter by project if specified
      let relevantCOs = projectId 
        ? allCOs.data.filter(co => co.projectId === projectId)
        : allCOs.data;
      
      // Score by similarity to scope
      const scoredCOs = relevantCOs.map(co => {
        const scopeLower = scope.toLowerCase();
        const titleLower = (co.title || '').toLowerCase();
        const descLower = (co.description || '').toLowerCase();
        
        let score = 0;
        
        // Check for word matches
        const scopeWords = scopeLower.split(/\s+/);
        scopeWords.forEach(word => {
          if (word.length > 3) { // Ignore short words
            if (titleLower.includes(word)) score += 2;
            if (descLower.includes(word)) score += 1;
          }
        });
        
        return { co, score };
      });
      
      // Return top 5 matches
      return scoredCOs
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.co);
    } catch (error) {
      console.error('Error finding similar COs:', error);
      return [];
    }
  }

  /**
   * Get production rates from past similar work
   */
  async getProductionRates(scope: string): Promise<any[]> {
    try {
      const similarCOs = await this.findSimilarCOs(scope);
      const rates: any[] = [];
      
      for (const co of similarCOs) {
        const extractedData = co.extractedData as any;
        if (!extractedData) continue;
        
        // Extract labor rates
        if (extractedData.labor && Array.isArray(extractedData.labor)) {
          extractedData.labor.forEach((item: any) => {
            rates.push({
              type: 'labor',
              description: item.name || item.description,
              rate: item.hourlyRate || item.rate,
              hours: item.hours,
              source: `CO #${co.number || co.id}`
            });
          });
        }
        
        // Extract equipment rates
        if (extractedData.equipment && Array.isArray(extractedData.equipment)) {
          extractedData.equipment.forEach((item: any) => {
            rates.push({
              type: 'equipment',
              description: item.description || item.name,
              rate: item.hourlyRate || item.rate,
              hours: item.hours,
              source: `CO #${co.number || co.id}`
            });
          });
        }
        
        // Extract material rates
        if (extractedData.materials && Array.isArray(extractedData.materials)) {
          extractedData.materials.forEach((item: any) => {
            rates.push({
              type: 'materials',
              description: item.description || item.name,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.unitCost || item.rate,
              source: `CO #${co.number || co.id}`
            });
          });
        }
      }
      
      return rates;
    } catch (error) {
      console.error('Error getting production rates:', error);
      return [];
    }
  }

  /**
   * Estimate labor based on similar work and scope
   */
  async estimateLabor(scope: string, draftCO: DraftCO): Promise<{
    suggestions: any[];
    reasoning: string;
  }> {
    try {
      const rates = await this.getProductionRates(scope);
      const laborRates = rates.filter(r => r.type === 'labor');
      
      if (laborRates.length === 0) {
        return {
          suggestions: [],
          reasoning: "I couldn't find similar past work to base estimates on. Can you provide the expected labor hours?"
        };
      }
      
      // Group by similar descriptions
      const grouped: { [key: string]: any[] } = {};
      laborRates.forEach(rate => {
        const key = rate.description.toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(rate);
      });
      
      // Calculate average rates and hours for each type
      const suggestions = Object.entries(grouped).map(([desc, items]) => {
        const avgRate = items.reduce((sum, item) => sum + (item.rate || 0), 0) / items.length;
        const avgHours = items.reduce((sum, item) => sum + (item.hours || 0), 0) / items.length;
        const sources = [...new Set(items.map(item => item.source))];
        
        return {
          description: items[0].description,
          hours: Math.round(avgHours * 10) / 10, // Round to 1 decimal
          rate: Math.round(avgRate * 100) / 100, // Round to cents
          amount: Math.round(avgRate * avgHours * 100) / 100,
          reasoning: `Based on ${items.length} similar jobs (${sources.slice(0, 2).join(', ')})`
        };
      });
      
      return {
        suggestions,
        reasoning: `Based on analysis of ${laborRates.length} labor entries from ${new Set(laborRates.map(r => r.source)).size} similar change orders.`
      };
    } catch (error) {
      console.error('Error estimating labor:', error);
      return {
        suggestions: [],
        reasoning: "Error analyzing past work. Can you provide the expected labor details?"
      };
    }
  }

  /**
   * Estimate materials based on similar work
   */
  async estimateMaterials(scope: string, draftCO: DraftCO): Promise<{
    suggestions: any[];
    reasoning: string;
  }> {
    try {
      const rates = await this.getProductionRates(scope);
      const materialRates = rates.filter(r => r.type === 'materials');
      
      if (materialRates.length === 0) {
        return {
          suggestions: [],
          reasoning: "No similar material usage found in past work. Can you specify materials needed?"
        };
      }
      
      // Group by description
      const grouped: { [key: string]: any[] } = {};
      materialRates.forEach(rate => {
        const key = rate.description.toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(rate);
      });
      
      const suggestions = Object.entries(grouped).map(([desc, items]) => {
        const avgQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0) / items.length;
        const avgRate = items.reduce((sum, item) => sum + (item.rate || 0), 0) / items.length;
        const unit = items[0].unit || 'ea';
        const sources = [...new Set(items.map(item => item.source))];
        
        return {
          description: items[0].description,
          quantity: Math.ceil(avgQuantity),
          unit,
          rate: Math.round(avgRate * 100) / 100,
          amount: Math.round(avgRate * avgQuantity * 100) / 100,
          reasoning: `Based on ${items.length} similar jobs (${sources.slice(0, 2).join(', ')})`
        };
      });
      
      return {
        suggestions,
        reasoning: `Found ${materialRates.length} material entries from ${new Set(materialRates.map(r => r.source)).size} similar change orders.`
      };
    } catch (error) {
      console.error('Error estimating materials:', error);
      return {
        suggestions: [],
        reasoning: "Error analyzing material usage. Can you specify what materials are needed?"
      };
    }
  }

  /**
   * Estimate equipment based on similar work
   */
  async estimateEquipment(scope: string, draftCO: DraftCO): Promise<{
    suggestions: any[];
    reasoning: string;
  }> {
    try {
      const rates = await this.getProductionRates(scope);
      const equipmentRates = rates.filter(r => r.type === 'equipment');
      
      if (equipmentRates.length === 0) {
        // Try to get from rate tables
        const rateTables = await storage.getPublicRateTables();
        const caltransEquipment = rateTables.filter(rt => rt.type === 'equipment');
        
        if (caltransEquipment.length > 0) {
          const allEquipment = caltransEquipment.flatMap(rt => {
            const entries = (rt.data as any)?.entries || [];
            return entries.map((e: any) => ({
              description: e.description || e.item,
              rate: e.rate,
              source: rt.name
            }));
          });
          
          return {
            suggestions: allEquipment.slice(0, 5).map(e => ({
              description: e.description,
              hours: 8, // Default estimate
              rate: e.rate,
              amount: e.rate * 8,
              reasoning: `Standard rate from ${e.source}`
            })),
            reasoning: "Based on standard equipment rates. Adjust hours as needed."
          };
        }
        
        return {
          suggestions: [],
          reasoning: "No equipment usage found. Will this work require any equipment?"
        };
      }
      
      // Similar grouping logic as labor
      const grouped: { [key: string]: any[] } = {};
      equipmentRates.forEach(rate => {
        const key = rate.description.toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(rate);
      });
      
      const suggestions = Object.entries(grouped).map(([desc, items]) => {
        const avgRate = items.reduce((sum, item) => sum + (item.rate || 0), 0) / items.length;
        const avgHours = items.reduce((sum, item) => sum + (item.hours || 0), 0) / items.length;
        const sources = [...new Set(items.map(item => item.source))];
        
        return {
          description: items[0].description,
          hours: Math.round(avgHours * 10) / 10,
          rate: Math.round(avgRate * 100) / 100,
          amount: Math.round(avgRate * avgHours * 100) / 100,
          reasoning: `Based on ${items.length} similar jobs (${sources.slice(0, 2).join(', ')})`
        };
      });
      
      return {
        suggestions,
        reasoning: `Found ${equipmentRates.length} equipment entries from past similar work.`
      };
    } catch (error) {
      console.error('Error estimating equipment:', error);
      return {
        suggestions: [],
        reasoning: "Will this work require any equipment?"
      };
    }
  }

  /**
   * Calculate total estimate from draft CO
   */
  calculateTotal(draft: DraftCO): number {
    let total = 0;
    
    if (draft.labor) {
      total += draft.labor.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    if (draft.materials) {
      total += draft.materials.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    if (draft.equipment) {
      total += draft.equipment.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    if (draft.subcontractors) {
      total += draft.subcontractors.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    return Math.round(total * 100) / 100;
  }

  /**
   * Format draft CO for display
   */
  formatDraftSummary(draft: DraftCO): string {
    const lines: string[] = [];
    
    if (draft.scope) {
      lines.push(`**Scope:** ${draft.scope}`);
      lines.push('');
    }
    
    if (draft.labor && draft.labor.length > 0) {
      lines.push('**Labor:**');
      draft.labor.forEach(item => {
        lines.push(`• ${item.description}: ${item.hours} hrs @ $${item.rate}/hr = $${item.amount.toFixed(2)}`);
      });
      lines.push('');
    }
    
    if (draft.materials && draft.materials.length > 0) {
      lines.push('**Materials:**');
      draft.materials.forEach(item => {
        lines.push(`• ${item.description}: ${item.quantity} ${item.unit} @ $${item.rate} = $${item.amount.toFixed(2)}`);
      });
      lines.push('');
    }
    
    if (draft.equipment && draft.equipment.length > 0) {
      lines.push('**Equipment:**');
      draft.equipment.forEach(item => {
        lines.push(`• ${item.description}: ${item.hours} hrs @ $${item.rate}/hr = $${item.amount.toFixed(2)}`);
      });
      lines.push('');
    }
    
    if (draft.subcontractors && draft.subcontractors.length > 0) {
      lines.push('**Subcontractors:**');
      draft.subcontractors.forEach(item => {
        lines.push(`• ${item.name} (${item.scope}): $${item.amount.toFixed(2)}`);
      });
      lines.push('');
    }
    
    const total = this.calculateTotal(draft);
    lines.push(`**Total Estimate:** $${total.toFixed(2)}`);
    
    return lines.join('\n');
  }
}

export const coCreationWorkflow = new COCreationWorkflowService();
