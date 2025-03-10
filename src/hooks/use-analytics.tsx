
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Types for the analytics data
export interface RevenueData {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ShipmentStatusCount {
  status: string;
  count: number;
}

export interface WeeklyShipmentCount {
  week: string;
  count: number;
}

export interface DashboardStats {
  activeShipments: number;
  totalVehicles: number;
  totalTransporters: number;
  revenueThisMonth: number;
  shipmentTrend: number;
  revenueTrend: number;
}

export const useAnalytics = () => {
  // Fetch all the data we need for analytics
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      console.log('Fetching analytics data...');
      
      // Get all shipments with route data for financial calculations
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select(`
          *,
          routes:route_id (billing_rate_per_ton, vendor_rate_per_ton)
        `);
      
      if (shipmentsError) {
        console.error('Error fetching shipments:', shipmentsError);
        throw shipmentsError;
      }
      
      // Get count of transporters
      const { count: transportersCount, error: transportersError } = await supabase
        .from('transporters')
        .select('*', { count: 'exact', head: true });
      
      if (transportersError) {
        console.error('Error fetching transporters count:', transportersError);
        throw transportersError;
      }
      
      // Get count of vehicles
      const { count: vehiclesCount, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });
      
      if (vehiclesError) {
        console.error('Error fetching vehicles count:', vehiclesError);
        throw vehiclesError;
      }
      
      // Calculate monthly revenue data
      const monthlyData: Record<string, RevenueData> = {};
      
      // Get current month and previous month for trends
      const now = new Date();
      const currentMonth = now.toLocaleString('default', { month: 'short' });
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1)
        .toLocaleString('default', { month: 'short' });
      
      let currentMonthRevenue = 0;
      let previousMonthRevenue = 0;
      let currentMonthShipments = 0;
      let previousMonthShipments = 0;
      
      shipments.forEach((shipment) => {
        // Skip if missing essential data
        if (!shipment.quantity_tons) return;
        
        const billingRate = shipment.routes?.billing_rate_per_ton || 0;
        const vendorRate = shipment.routes?.vendor_rate_per_ton || 0;
        const revenue = shipment.quantity_tons * billingRate;
        const cost = shipment.quantity_tons * vendorRate;
        const profit = revenue - cost;
        
        // Get the month from the shipment's creation date
        const date = new Date(shipment.created_at);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        
        // For trend calculations
        const shipmentMonth = date.toLocaleString('default', { month: 'short' });
        if (shipmentMonth === currentMonth) {
          currentMonthRevenue += revenue;
          currentMonthShipments++;
        } else if (shipmentMonth === previousMonth) {
          previousMonthRevenue += revenue;
          previousMonthShipments++;
        }
        
        // Initialize the month data if it doesn't exist
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        
        // Add the shipment's financial data to the month
        monthlyData[month].revenue += revenue;
        monthlyData[month].cost += cost;
        monthlyData[month].profit += profit;
      });
      
      // Convert monthly data to array and sort by month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueData = Object.values(monthlyData).sort((a, b) => 
        monthNames.indexOf(a.month) - monthNames.indexOf(b.month)
      );
      
      // Count shipments by status
      const statusCounts: Record<string, number> = {};
      shipments.forEach((shipment) => {
        const status = shipment.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      const shipmentStatusData = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      }));
      
      // Calculate weekly shipment counts for the current month
      const weeklyShipments: Record<string, number> = {
        'W1': 0, 'W2': 0, 'W3': 0, 'W4': 0, 'W5': 0
      };
      
      const currentYear = now.getFullYear();
      const currentMonthNum = now.getMonth();
      
      shipments.forEach((shipment) => {
        const date = new Date(shipment.created_at);
        const shipmentYear = date.getFullYear();
        const shipmentMonth = date.getMonth();
        
        // Only include shipments from the current month
        if (shipmentYear === currentYear && shipmentMonth === currentMonthNum) {
          const day = date.getDate();
          const weekNum = Math.ceil(day / 7);
          const weekKey = `W${weekNum}`;
          
          if (weeklyShipments[weekKey] !== undefined) {
            weeklyShipments[weekKey]++;
          }
        }
      });
      
      const weeklyShipmentData = Object.entries(weeklyShipments)
        .filter(([_, count]) => count > 0) // Only include weeks with shipments
        .map(([week, count]) => ({
          week,
          count,
        }));
      
      // Calculate revenue trend (percentage change)
      const revenueTrend = previousMonthRevenue > 0 
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : 0;
      
      // Calculate shipment trend (percentage change)
      const shipmentTrend = previousMonthShipments > 0
        ? ((currentMonthShipments - previousMonthShipments) / previousMonthShipments) * 100
        : 0;
      
      // Count active shipments (in_transit status)
      const activeShipments = shipments.filter(s => s.status === 'in_transit').length;
      
      const dashboardStats: DashboardStats = {
        activeShipments,
        totalVehicles: vehiclesCount || 0,
        totalTransporters: transportersCount || 0,
        revenueThisMonth: currentMonthRevenue,
        shipmentTrend,
        revenueTrend,
      };
      
      return {
        revenueData,
        shipmentStatusData,
        weeklyShipmentData,
        dashboardStats,
      };
    },
  });
  
  return {
    revenueData: analyticsData?.revenueData || [],
    shipmentStatusData: analyticsData?.shipmentStatusData || [],
    weeklyShipmentData: analyticsData?.weeklyShipmentData || [],
    dashboardStats: analyticsData?.dashboardStats || {
      activeShipments: 0,
      totalVehicles: 0,
      totalTransporters: 0,
      revenueThisMonth: 0,
      shipmentTrend: 0,
      revenueTrend: 0,
    },
    isLoading,
    error,
  };
};
