import { db } from '../db';
import { changeOrders, documents, rateTables } from '../../shared/schema';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';

export interface AnalyticsData {
  costTrends: {
    monthly: Array<{
      month: string;
      labor: number;
      materials: number;
      equipment: number;
      disposal: number;
      total: number;
    }>;
    quarterly: Array<{
      quarter: string;
      labor: number;
      materials: number;
      equipment: number;
      disposal: number;
      total: number;
    }>;
  };
  anomalies: Array<{
    id: string;
    type: 'cost_spike' | 'unusual_pattern' | 'rate_deviation';
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: number;
    expectedValue: number;
    variance: number;
    date: string;
    category: string;
  }>;
  categoryBreakdown: Array<{
    category: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  efficiency: {
    rateUtilization: number;
    averageProcessingTime: number;
    accuracyRate: number;
    costPerChangeOrder: number;
  };
  predictions: Array<{
    period: string;
    predicted: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

export class AnalyticsService {
  async generateAnalytics(timeRange: string = '12m', category?: string, projectId?: number): Promise<AnalyticsData> {
    const endDate = new Date();
    const startDate = new Date();
    
    // Calculate date range
    switch (timeRange) {
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '24m':
        startDate.setMonth(startDate.getMonth() - 24);
        break;
      default: // 12m
        startDate.setMonth(startDate.getMonth() - 12);
    }

    const [costTrends, anomalies, categoryBreakdown, efficiency, predictions] = await Promise.all([
      this.generateCostTrends(startDate, endDate, category, projectId),
      this.detectAnomalies(startDate, endDate, category, projectId),
      this.generateCategoryBreakdown(startDate, endDate, category, projectId),
      this.calculateEfficiency(startDate, endDate, projectId),
      this.generatePredictions(startDate, endDate, category, projectId)
    ]);

    return {
      costTrends,
      anomalies,
      categoryBreakdown,
      efficiency,
      predictions
    };
  }

  private async generateCostTrends(startDate: Date, endDate: Date, category?: string, projectId?: number) {
    // Get change orders in date range, filtered by project if specified
    const whereConditions = [
      gte(changeOrders.createdAt, startDate),
      lte(changeOrders.createdAt, endDate)
    ];
    
    if (projectId) {
      whereConditions.push(eq(changeOrders.projectId, projectId));
    }
    
    const changeOrdersData = await db
      .select()
      .from(changeOrders)
      .where(and(...whereConditions))
      .orderBy(desc(changeOrders.createdAt));

    // Group by month
    const monthlyData = this.groupByMonth(changeOrdersData);
    const quarterlyData = this.groupByQuarter(changeOrdersData);

    return {
      monthly: monthlyData,
      quarterly: quarterlyData
    };
  }

  private groupByMonth(changeOrdersData: any[]) {
    const monthlyTotals = new Map<string, any>();
    
    changeOrdersData.forEach(order => {
      const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
      const month = orderDate.toISOString().substring(0, 7); // YYYY-MM
      const monthName = orderDate.toLocaleDateString('en-US', { month: 'short' });
      
      if (!monthlyTotals.has(month)) {
        monthlyTotals.set(month, {
          month: monthName,
          labor: 0,
          materials: 0,
          equipment: 0,
          disposal: 0,
          total: 0
        });
      }
      
      const monthData = monthlyTotals.get(month);
      const orderData = (order.data || {}) as any;
      
      monthData.labor += orderData.laborTotal || 0;
      monthData.materials += orderData.materialsTotal || 0;
      monthData.equipment += orderData.equipmentTotal || 0;
      monthData.disposal += orderData.disposalTotal || 0;
      monthData.total += parseFloat(order.totalAmount || '0');
    });

    return Array.from(monthlyTotals.values()).sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  }

  private groupByQuarter(changeOrdersData: any[]) {
    const quarterlyTotals = new Map<string, any>();
    
    changeOrdersData.forEach(order => {
      const date = order.createdAt ? new Date(order.createdAt) : new Date();
      const quarter = `Q${Math.floor((date.getMonth() + 3) / 3)} ${date.getFullYear()}`;
      
      if (!quarterlyTotals.has(quarter)) {
        quarterlyTotals.set(quarter, {
          quarter,
          labor: 0,
          materials: 0,
          equipment: 0,
          disposal: 0,
          total: 0
        });
      }
      
      const quarterData = quarterlyTotals.get(quarter);
      const orderData = (order.data || {}) as any;
      
      quarterData.labor += orderData.laborTotal || 0;
      quarterData.materials += orderData.materialsTotal || 0;
      quarterData.equipment += orderData.equipmentTotal || 0;
      quarterData.disposal += orderData.disposalTotal || 0;
      quarterData.total += parseFloat(order.totalAmount || '0');
    });

    return Array.from(quarterlyTotals.values());
  }

  private async detectAnomalies(startDate: Date, endDate: Date, category?: string, projectId?: number) {
    const whereConditions = [
      gte(changeOrders.createdAt, startDate),
      lte(changeOrders.createdAt, endDate)
    ];
    
    if (projectId) {
      whereConditions.push(eq(changeOrders.projectId, projectId));
    }
    
    const changeOrdersData = await db
      .select()
      .from(changeOrders)
      .where(and(...whereConditions));

    const anomalies: any[] = [];

    // Calculate statistical thresholds
    const totalAmounts = changeOrdersData.map(order => parseFloat(order.totalAmount || '0'));
    const mean = totalAmounts.reduce((sum, val) => sum + val, 0) / (totalAmounts.length || 1);
    const stdDev = Math.sqrt(
      totalAmounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (totalAmounts.length || 1)
    );

    // Detect cost spikes (values > 2 standard deviations above mean)
    changeOrdersData.forEach(order => {
      const amount = parseFloat(order.totalAmount || '0');
      const threshold = mean + (2 * stdDev);
      
      if (amount > threshold) {
        const variance = ((amount - mean) / (mean || 1)) * 100;
        anomalies.push({
          id: `spike-${order.id}`,
          type: 'cost_spike',
          severity: variance > 50 ? 'high' : variance > 25 ? 'medium' : 'low',
          description: `Change order cost ${variance.toFixed(1)}% above expected range`,
          value: amount,
          expectedValue: Math.round(mean),
          variance: variance,
          date: (order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString()).split('T')[0],
          category: 'Total Cost'
        });
      }
    });

    // Detect unusual patterns in rate usage
    const rateUsageAnomalies = await this.detectRateUsageAnomalies(changeOrdersData);
    anomalies.push(...rateUsageAnomalies);

    return anomalies.sort((a, b) => {
      const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private async detectRateUsageAnomalies(changeOrdersData: any[]) {
    const anomalies: any[] = [];
    
    // Get approved rate tables for comparison
    const approvedRates = await db
      .select()
      .from(rateTables)
      .where(eq(rateTables.isApproved, true));

    // Create rate lookup for expected values
    const rateMap = new Map<string, number>();
    approvedRates.forEach(table => {
      if (Array.isArray(table.data)) {
        table.data.forEach((rate: any) => {
          rateMap.set(rate.description.toLowerCase(), rate.rate);
        });
      }
    });

    // Check for rate deviations in change orders
    changeOrdersData.forEach(order => {
      const orderData = order.data || {};
      const entries = [
        ...(orderData.laborEntries || []),
        ...(orderData.materialEntries || []),
        ...(orderData.equipmentEntries || [])
      ];

      entries.forEach(entry => {
        const expectedRate = rateMap.get(entry.description?.toLowerCase());
        if (expectedRate && entry.rate) {
          const variance = ((entry.rate - expectedRate) / expectedRate) * 100;
          
          if (Math.abs(variance) > 15) { // 15% threshold
            anomalies.push({
              id: `rate-${order.id}-${entry.description}`,
              type: 'rate_deviation',
              severity: Math.abs(variance) > 30 ? 'high' : Math.abs(variance) > 20 ? 'medium' : 'low',
              description: `Rate deviation: ${entry.description}`,
              value: entry.rate,
              expectedValue: expectedRate,
              variance: variance,
              date: order.createdAt.toISOString().split('T')[0],
              category: entry.category || 'Unknown'
            });
          }
        }
      });
    });

    return anomalies;
  }

  private async generateCategoryBreakdown(startDate: Date, endDate: Date, category?: string, projectId?: number) {
    const whereConditions = [
      gte(changeOrders.createdAt, startDate),
      lte(changeOrders.createdAt, endDate)
    ];
    
    if (projectId) {
      whereConditions.push(eq(changeOrders.projectId, projectId));
    }
    
    const changeOrdersData = await db
      .select()
      .from(changeOrders)
      .where(and(...whereConditions));

    const totals = {
      labor: 0,
      materials: 0,
      equipment: 0,
      disposal: 0
    };

    changeOrdersData.forEach(order => {
      const orderData = (order.data || {}) as any;
      totals.labor += orderData.laborTotal || 0;
      totals.materials += orderData.materialsTotal || 0;
      totals.equipment += orderData.equipmentTotal || 0;
      totals.disposal += orderData.disposalTotal || 0;
    });

    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

    const colors = ['#03512A', '#22C55E', '#86EFAC', '#DCFCE7'];
    
    return Object.entries(totals).map(([key, value], index) => ({
      category: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      percentage: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
      color: colors[index]
    }));
  }

  private async calculateEfficiency(startDate: Date, endDate: Date, projectId?: number) {
    const whereConditions = [
      gte(changeOrders.createdAt, startDate),
      lte(changeOrders.createdAt, endDate)
    ];
    
    if (projectId) {
      whereConditions.push(eq(changeOrders.projectId, projectId));
    }
    
    const changeOrdersData = await db
      .select()
      .from(changeOrders)
      .where(and(...whereConditions));

    const documentsData = await db
      .select()
      .from(documents)
      .where(
        and(
          gte(documents.uploadedAt, startDate),
          lte(documents.uploadedAt, endDate)
        )
      );

    // Calculate rate utilization (how often approved rates are used)
    const approvedRatesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(rateTables)
      .where(eq(rateTables.isApproved, true));

    const rateUtilization = approvedRatesCount[0]?.count > 0 ? 
      Math.min(100, (changeOrdersData.length / approvedRatesCount[0].count) * 100) : 0;

    // Calculate average processing time
    const processedDocs = documentsData.filter(doc => doc.processedAt);
    const avgProcessingTime = processedDocs.length > 0 ?
      processedDocs.reduce((sum, doc) => {
        const processingTime = doc.processedAt && doc.uploadedAt ? 
          new Date(doc.processedAt).getTime() - new Date(doc.uploadedAt).getTime() : 0;
        return sum + processingTime;
      }, 0) / processedDocs.length / 1000 / 60 : 0; // Convert to minutes

    // Calculate accuracy rate (documents processed successfully)
    const successfulDocs = documentsData.filter(doc => doc.status === 'processed');
    const accuracyRate = documentsData.length > 0 ? 
      (successfulDocs.length / documentsData.length) * 100 : 0;

    // Calculate cost per change order
    const totalCost = changeOrdersData.reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0);
    const costPerChangeOrder = changeOrdersData.length > 0 ? 
      totalCost / changeOrdersData.length : 0;

    return {
      rateUtilization,
      averageProcessingTime: avgProcessingTime,
      accuracyRate,
      costPerChangeOrder
    };
  }

  private async generatePredictions(startDate: Date, endDate: Date, category?: string, projectId?: number) {
    const whereConditions = [
      gte(changeOrders.createdAt, startDate),
      lte(changeOrders.createdAt, endDate)
    ];
    
    if (projectId) {
      whereConditions.push(eq(changeOrders.projectId, projectId));
    }
    
    const changeOrdersData = await db
      .select()
      .from(changeOrders)
      .where(and(...whereConditions))
      .orderBy(changeOrders.createdAt);

    if (changeOrdersData.length < 3) {
      return []; // Need at least 3 data points for predictions
    }

    // Simple linear regression for trend prediction
    const monthlyTotals = this.groupByMonth(changeOrdersData);
    const predictions: any[] = [];

    // Calculate trend using last 6 months
    const recentData = monthlyTotals.slice(-6);
    if (recentData.length >= 2) {
      const trend = this.calculateTrend(recentData);
      const lastValue = recentData[recentData.length - 1].total;
      
      // Generate 6 months of predictions
      for (let i = 1; i <= 6; i++) {
        const predicted = lastValue + (trend * i);
        const confidence = Math.max(0.5, 1 - (i * 0.1)); // Decreasing confidence
        
        predictions.push({
          period: new Date(Date.now() + (i * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-US', { month: 'short' }),
          predicted: Math.max(0, predicted),
          confidence,
          trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
        });
      }
    }

    return predictions;
  }

  private calculateTrend(data: any[]) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, item) => sum + item.total, 0);
    const sumXY = data.reduce((sum, item, i) => sum + (i * item.total), 0);
    const sumXX = data.reduce((sum, _, i) => sum + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope || 0;
  }
}

export const analyticsService = new AnalyticsService();