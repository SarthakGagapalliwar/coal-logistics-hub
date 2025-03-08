
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import PageTransition from '@/components/ui-custom/PageTransition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/data';
import { TrendingUp, BarChart3, TrendingDown, FileSpreadsheet, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const [reportType, setReportType] = useState<string>('shipment-status');
  const [dateRange, setDateRange] = useState<string>('last-30-days');

  // Get date range based on selection
  const getDateRange = () => {
    const now = new Date();
    
    switch (dateRange) {
      case 'last-7-days':
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return { from: sevenDaysAgo.toISOString(), to: now.toISOString() };
      case 'last-30-days':
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return { from: thirtyDaysAgo.toISOString(), to: now.toISOString() };
      case 'last-90-days':
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);
        return { from: ninetyDaysAgo.toISOString(), to: now.toISOString() };
      default:
        const defaultRange = new Date(now);
        defaultRange.setDate(now.getDate() - 30);
        return { from: defaultRange.toISOString(), to: now.toISOString() };
    }
  };

  // Query for shipment status summary
  const { data: shipmentStatusData, isLoading: isShipmentStatusLoading } = useQuery({
    queryKey: ['reports', 'shipment-status', dateRange],
    queryFn: async () => {
      const { from, to } = getDateRange();
      
      // This query would group shipments by status
      const { data, error } = await supabase.rpc('get_shipment_status_summary', {
        date_from: from,
        date_to: to
      });
      
      if (error) throw new Error(error.message);
      
      // If the RPC is not set up yet, use mock data
      if (!data || data.length === 0) {
        return [
          { status: 'Delivered', count: 24 },
          { status: 'In Transit', count: 12 },
          { status: 'Scheduled', count: 8 },
          { status: 'Delayed', count: 5 },
          { status: 'Cancelled', count: 3 }
        ];
      }
      
      return data;
    }
  });

  // Query for transporter performance
  const { data: transporterPerformanceData, isLoading: isTransporterPerformanceLoading } = useQuery({
    queryKey: ['reports', 'transporter-performance', dateRange],
    queryFn: async () => {
      const { from, to } = getDateRange();
      
      // This query would calculate performance metrics for transporters
      const { data, error } = await supabase.rpc('get_transporter_performance', {
        date_from: from,
        date_to: to
      });
      
      if (error) throw new Error(error.message);
      
      // If the RPC is not set up yet, use mock data
      if (!data || data.length === 0) {
        return [
          { transporter_name: 'ABC Logistics', on_time_delivery_rate: 0.95, total_shipments: 42, total_weight: 840 },
          { transporter_name: 'XYZ Transport', on_time_delivery_rate: 0.87, total_shipments: 38, total_weight: 760 },
          { transporter_name: 'Fast Movers', on_time_delivery_rate: 0.92, total_shipments: 25, total_weight: 500 },
          { transporter_name: 'City Carriers', on_time_delivery_rate: 0.78, total_shipments: 18, total_weight: 360 },
          { transporter_name: 'Mountain Express', on_time_delivery_rate: 0.89, total_shipments: 15, total_weight: 300 }
        ];
      }
      
      return data;
    }
  });

  // Query for revenue trends
  const { data: revenueTrendData, isLoading: isRevenueTrendLoading } = useQuery({
    queryKey: ['reports', 'revenue-trend', dateRange],
    queryFn: async () => {
      const { from, to } = getDateRange();
      
      // This query would calculate revenue over time
      const { data, error } = await supabase.rpc('get_revenue_trend', {
        date_from: from,
        date_to: to
      });
      
      if (error) throw new Error(error.message);
      
      // If the RPC is not set up yet, use mock data
      if (!data || data.length === 0) {
        // Generate weekly revenue data for past 30 days
        return Array.from({ length: 4 }).map((_, i) => {
          const week = `Week ${i + 1}`;
          const revenue = 800000 + Math.random() * 400000;
          const cost = revenue * (0.65 + Math.random() * 0.1);
          return { period: week, revenue, cost, profit: revenue - cost };
        });
      }
      
      return data;
    }
  });

  // Determine which report to render
  const renderReport = () => {
    switch (reportType) {
      case 'shipment-status': {
        if (isShipmentStatusLoading) {
          return <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>;
        }
        
        return (
          <div className="space-y-6">
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shipmentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                  >
                    {shipmentStatusData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} shipments`, "Count"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shipmentStatusData?.map((item, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.status}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{item.count} shipments</div>
                    <div className="text-xs text-muted-foreground">
                      {((item.count / shipmentStatusData.reduce((sum, i) => sum + i.count, 0)) * 100).toFixed(1)}% of total
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      }
      
      case 'transporter-performance': {
        if (isTransporterPerformanceLoading) {
          return <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>;
        }
        
        return (
          <div className="space-y-6">
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={transporterPerformanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="transporter_name" 
                    angle={-45} 
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke="#8884d8" 
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#82ca9d" 
                    domain={[0, 'auto']}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'on_time_delivery_rate') {
                        return [`${(value * 100).toFixed(1)}%`, 'On-time Rate'];
                      }
                      return [value, name === 'total_shipments' ? 'Total Shipments' : 'Total Weight (tons)'];
                    }}
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="on_time_delivery_rate" 
                    fill="#8884d8" 
                    name="On-time Delivery Rate" 
                  />
                  <Bar 
                    yAxisId="right" 
                    dataKey="total_shipments" 
                    fill="#82ca9d" 
                    name="Total Shipments" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Transporter</th>
                    <th className="text-right py-3 px-4">On-time Rate</th>
                    <th className="text-right py-3 px-4">Shipments</th>
                    <th className="text-right py-3 px-4">Total Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {transporterPerformanceData?.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3 px-4">{item.transporter_name}</td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-medium ${
                          item.on_time_delivery_rate >= 0.9 ? 'text-green-600' : 
                          item.on_time_delivery_rate >= 0.8 ? 'text-amber-600' : 
                          'text-red-600'
                        }`}>
                          {(item.on_time_delivery_rate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">{item.total_shipments}</td>
                      <td className="text-right py-3 px-4">{item.total_weight} tons</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      
      case 'revenue-trend': {
        if (isRevenueTrendLoading) {
          return <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>;
        }
        
        return (
          <div className="space-y-6">
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueTrendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis 
                    tickFormatter={(value) => 
                      `₹${(value / 100000).toFixed(1)}L`
                    }
                  />
                  <Tooltip 
                    formatter={(value) => [`₹${(value as number).toLocaleString()}`, ""]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    name="Cost" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    name="Profit" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 bg-blue-50">
                  <CardTitle className="text-base flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4 text-blue-500" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {formatCurrency(revenueTrendData?.reduce((sum, item) => sum + item.revenue, 0) || 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 bg-red-50">
                  <CardTitle className="text-base flex items-center">
                    <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                    Total Cost
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {formatCurrency(revenueTrendData?.reduce((sum, item) => sum + item.cost, 0) || 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 bg-green-50">
                  <CardTitle className="text-base flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4 text-green-500" />
                    Total Profit
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {formatCurrency(revenueTrendData?.reduce((sum, item) => sum + item.profit, 0) || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }
      
      default:
        return <div>Select a report type to view analytics</div>;
    }
  };

  return (
    <PageTransition>
      <Helmet>
        <title>Reports | Coal Logistics Hub</title>
      </Helmet>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <Button variant="outline" className="flex items-center">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type" className="w-full">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shipment-status">Shipment Status</SelectItem>
                <SelectItem value="transporter-performance">Transporter Performance</SelectItem>
                <SelectItem value="revenue-trend">Revenue Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date-range">Time Period</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range" className="w-full">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-90-days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {reportType === 'shipment-status' ? 'Shipment Status Distribution' : 
                 reportType === 'transporter-performance' ? 'Transporter Performance Analysis' :
                 'Revenue Analysis'}
              </CardTitle>
              <CardDescription className="flex items-center mt-1">
                <Calendar className="mr-2 h-4 w-4" />
                {(() => {
                  const { from, to } = getDateRange();
                  return `${format(new Date(from), 'MMM d, yyyy')} - ${format(new Date(to), 'MMM d, yyyy')}`;
                })()}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {renderReport()}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Reports;
