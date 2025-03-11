
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

export interface AnalyticsData {
  revenueData: RevenueData[];
  shipmentStatusData: ShipmentStatusCount[];
  weeklyShipmentData: WeeklyShipmentCount[];
  dashboardStats: DashboardStats;
}
