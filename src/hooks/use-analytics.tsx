
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsData } from '@/utils/analytics-utils';
import { 
  RevenueData, 
  ShipmentStatusCount, 
  WeeklyShipmentCount, 
  DashboardStats 
} from '@/types/analytics';

export { 
  RevenueData, 
  ShipmentStatusCount, 
  WeeklyShipmentCount, 
  DashboardStats 
};

export const useAnalytics = () => {
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalyticsData,
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
