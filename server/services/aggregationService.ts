import { storage } from '../storage';
import type { ChangeOrder, SubcontractorChangeOrder, Project } from '@shared/schema';

export interface COLogAggregation {
  projectId: number;
  projectName: string;
  
  // GC CO Metrics
  gcTotalCount: number;
  gcPendingCount: number;
  gcSubmittedCount: number;
  gcApprovedCount: number;
  gcRejectedCount: number;
  
  gcTotalSubmitted: number;
  gcTotalApproved: number;
  gcApprovalRate: number;
  gcAverageDaysToApproval: number;
  
  // Subcontractor CO Metrics
  subTotalCount: number;
  subPendingCount: number;
  subSubmittedCount: number;
  subApprovedCount: number;
  subRejectedCount: number;
  
  subTotalSubmitted: number;
  subTotalApproved: number;
  subApprovalRate: number;
  
  // Variance Analysis
  totalVariance: number;
  variancePercentage: number;
  
  // By Subcontractor Breakdown
  bySubcontractor: Array<{
    subcontractorId: number;
    subcontractorName: string;
    scoCount: number;
    totalSubmitted: number;
    totalApproved: number;
    approvalRate: number;
  }>;
  
  // By Month Breakdown
  byMonth: Array<{
    month: string;
    gcSubmitted: number;
    gcApproved: number;
    subSubmitted: number;
    subApproved: number;
    variance: number;
  }>;
  
  // Top COs by Value
  topChangeOrders: Array<{
    id: number;
    number: string;
    description: string;
    amount: number;
    status: string;
  }>;
}

export const aggregationService = {
  /**
   * Calculate comprehensive CO Log aggregations for a project
   */
  async calculateProjectAggregation(projectId: number): Promise<COLogAggregation> {
    // Fetch project data
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Fetch all change orders for project
    const changeOrders = await storage.getChangeOrders({ projectId });
    const cos = changeOrders.data || [];
    
    // Fetch all SCOs for project
    const scos = await storage.getSubcontractorChangeOrders({ projectId });
    
    // Fetch subcontractors
    const subcontractors = project.companyId ? await storage.getSubcontractors(project.companyId) : [];
    
    // Calculate GC CO metrics
    const gcMetrics = this.calculateGCMetrics(cos);
    
    // Calculate Sub CO metrics
    const subMetrics = this.calculateSubMetrics(scos);
    
    // Calculate variance
    const variance = gcMetrics.totalSubmitted - subMetrics.totalSubmitted;
    const variancePercentage = gcMetrics.totalSubmitted > 0 
      ? (variance / gcMetrics.totalSubmitted) * 100 
      : 0;
    
    // Calculate by subcontractor breakdown
    const bySubcontractor = this.calculateBySubcontractor(scos, subcontractors);
    
    // Calculate by month breakdown
    const byMonth = this.calculateByMonth(cos, scos);
    
    // Get top change orders
    const topChangeOrders = this.getTopChangeOrders(cos, 10);
    
    return {
      projectId,
      projectName: project.name,
      
      // GC Metrics
      gcTotalCount: gcMetrics.totalCount,
      gcPendingCount: gcMetrics.pendingCount,
      gcSubmittedCount: gcMetrics.submittedCount,
      gcApprovedCount: gcMetrics.approvedCount,
      gcRejectedCount: gcMetrics.rejectedCount,
      gcTotalSubmitted: gcMetrics.totalSubmitted,
      gcTotalApproved: gcMetrics.totalApproved,
      gcApprovalRate: gcMetrics.approvalRate,
      gcAverageDaysToApproval: gcMetrics.averageDaysToApproval,
      
      // Sub Metrics
      subTotalCount: subMetrics.totalCount,
      subPendingCount: subMetrics.pendingCount,
      subSubmittedCount: subMetrics.submittedCount,
      subApprovedCount: subMetrics.approvedCount,
      subRejectedCount: subMetrics.rejectedCount,
      subTotalSubmitted: subMetrics.totalSubmitted,
      subTotalApproved: subMetrics.totalApproved,
      subApprovalRate: subMetrics.approvalRate,
      
      // Variance
      totalVariance: variance,
      variancePercentage,
      
      // Breakdowns
      bySubcontractor,
      byMonth,
      topChangeOrders
    };
  },
  
  /**
   * Calculate GC Change Order metrics
   */
  calculateGCMetrics(cos: ChangeOrder[]) {
    const totalCount = cos.length;
    const pendingCount = cos.filter(co => co.status === 'pending').length;
    const submittedCount = cos.filter(co => co.status === 'submitted').length;
    const approvedCount = cos.filter(co => co.status === 'approved').length;
    const rejectedCount = cos.filter(co => co.status === 'rejected').length;
    
    const totalSubmitted = cos.reduce((sum, co) => {
      const amount = Number(co.amountSubmitted) || Number(co.totalAmount) || 0;
      return sum + amount;
    }, 0);
    
    const totalApproved = cos.reduce((sum, co) => {
      return sum + (Number(co.amountApproved) || 0);
    }, 0);
    
    const approvalRate = submittedCount > 0 ? (approvedCount / submittedCount) * 100 : 0;
    
    // Calculate average days to approval
    const approvedCOs = cos.filter(co => co.status === 'approved' && co.submittedDate && co.approvedDate);
    const totalDays = approvedCOs.reduce((sum, co) => {
      if (co.submittedDate && co.approvedDate) {
        const submitted = new Date(co.submittedDate);
        const approved = new Date(co.approvedDate);
        const days = Math.floor((approved.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }
      return sum;
    }, 0);
    
    const averageDaysToApproval = approvedCOs.length > 0 ? totalDays / approvedCOs.length : 0;
    
    return {
      totalCount,
      pendingCount,
      submittedCount,
      approvedCount,
      rejectedCount,
      totalSubmitted,
      totalApproved,
      approvalRate,
      averageDaysToApproval
    };
  },
  
  /**
   * Calculate Subcontractor CO metrics
   */
  calculateSubMetrics(scos: SubcontractorChangeOrder[]) {
    const totalCount = scos.length;
    const pendingCount = scos.filter(sco => sco.status === 'pending').length;
    const submittedCount = scos.filter(sco => sco.status === 'submitted').length;
    const approvedCount = scos.filter(sco => sco.status === 'approved').length;
    const rejectedCount = scos.filter(sco => sco.status === 'rejected').length;
    
    const totalSubmitted = scos.reduce((sum, sco) => {
      return sum + (Number(sco.amountSubmitted) || 0);
    }, 0);
    
    const totalApproved = scos.reduce((sum, sco) => {
      return sum + (Number(sco.amountApproved) || 0);
    }, 0);
    
    const approvalRate = submittedCount > 0 ? (approvedCount / submittedCount) * 100 : 0;
    
    return {
      totalCount,
      pendingCount,
      submittedCount,
      approvedCount,
      rejectedCount,
      totalSubmitted,
      totalApproved,
      approvalRate
    };
  },
  
  /**
   * Calculate breakdown by subcontractor
   */
  calculateBySubcontractor(scos: SubcontractorChangeOrder[], subcontractors: any[]) {
    const subMap = new Map<number, any>();
    
    // Initialize subcontractor map
    subcontractors.forEach(sub => {
      subMap.set(sub.id, {
        subcontractorId: sub.id,
        subcontractorName: sub.name,
        scoCount: 0,
        totalSubmitted: 0,
        totalApproved: 0,
        approvalRate: 0,
        submittedCount: 0,
        approvedCount: 0
      });
    });
    
    // Aggregate SCO data
    scos.forEach(sco => {
      const sub = subMap.get(sco.subcontractorId);
      if (sub) {
        sub.scoCount++;
        sub.totalSubmitted += Number(sco.amountSubmitted) || 0;
        sub.totalApproved += Number(sco.amountApproved) || 0;
        
        if (sco.status === 'submitted') sub.submittedCount++;
        if (sco.status === 'approved') sub.approvedCount++;
      }
    });
    
    // Calculate approval rates and convert to array
    const result = Array.from(subMap.values()).map(sub => {
      sub.approvalRate = sub.submittedCount > 0 
        ? (sub.approvedCount / sub.submittedCount) * 100 
        : 0;
      
      // Remove temp counts
      delete sub.submittedCount;
      delete sub.approvedCount;
      
      return sub;
    });
    
    // Sort by total submitted descending
    return result.sort((a, b) => b.totalSubmitted - a.totalSubmitted);
  },
  
  /**
   * Calculate breakdown by month
   */
  calculateByMonth(cos: ChangeOrder[], scos: SubcontractorChangeOrder[]) {
    const monthMap = new Map<string, any>();
    
    // Process GC COs
    cos.forEach(co => {
      if (co.submittedDate) {
        const date = new Date(co.submittedDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            month: monthKey,
            gcSubmitted: 0,
            gcApproved: 0,
            subSubmitted: 0,
            subApproved: 0,
            variance: 0
          });
        }
        
        const month = monthMap.get(monthKey);
        month.gcSubmitted += Number(co.amountSubmitted) || Number(co.totalAmount) || 0;
        month.gcApproved += Number(co.amountApproved) || 0;
      }
    });
    
    // Process SCOs
    scos.forEach(sco => {
      if (sco.submittedDate) {
        const date = new Date(sco.submittedDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            month: monthKey,
            gcSubmitted: 0,
            gcApproved: 0,
            subSubmitted: 0,
            subApproved: 0,
            variance: 0
          });
        }
        
        const month = monthMap.get(monthKey);
        month.subSubmitted += Number(sco.amountSubmitted) || 0;
        month.subApproved += Number(sco.amountApproved) || 0;
      }
    });
    
    // Calculate variances and convert to array
    const result = Array.from(monthMap.values()).map(month => {
      month.variance = month.gcSubmitted - month.subSubmitted;
      return month;
    });
    
    // Sort by month
    return result.sort((a, b) => a.month.localeCompare(b.month));
  },
  
  /**
   * Get top change orders by value
   */
  getTopChangeOrders(cos: ChangeOrder[], limit: number = 10) {
    return cos
      .map(co => ({
        id: co.id,
        number: co.number,
        description: co.description || '',
        amount: Number(co.amountSubmitted) || Number(co.totalAmount) || 0,
        status: co.status
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  },
  
  /**
   * Calculate aggregations for multiple projects
   */
  async calculateCompanyAggregation(companyId: number) {
    const projects = await storage.getProjects(companyId);
    
    const aggregations = await Promise.all(
      projects.map(project => this.calculateProjectAggregation(project.id))
    );
    
    // Combine all aggregations
    const combined = {
      companyId,
      totalProjects: projects.length,
      totalGCCount: 0,
      totalGCSubmitted: 0,
      totalGCApproved: 0,
      totalSubCount: 0,
      totalSubSubmitted: 0,
      totalSubApproved: 0,
      totalVariance: 0,
      projects: aggregations
    };
    
    // Sum up totals
    aggregations.forEach(agg => {
      combined.totalGCCount += agg.gcTotalCount;
      combined.totalGCSubmitted += agg.gcTotalSubmitted;
      combined.totalGCApproved += agg.gcTotalApproved;
      combined.totalSubCount += agg.subTotalCount;
      combined.totalSubSubmitted += agg.subTotalSubmitted;
      combined.totalSubApproved += agg.subTotalApproved;
      combined.totalVariance += agg.totalVariance;
    });
    
    return combined;
  }
};