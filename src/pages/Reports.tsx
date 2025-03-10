
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, AlertTriangle } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAnalytics } from '@/hooks/use-analytics';

const Reports = () => {
  const { revenueData, shipmentStatusData, isLoading, error } = useAnalytics();

  // Calculate summary statistics
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCost = revenueData.reduce((sum, item) => sum + item.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  
  const totalShipments = shipmentStatusData.reduce((sum, item) => sum + item.count, 0);
  const completedShipments = shipmentStatusData.find(s => s.status === 'Completed')?.count || 0;
  const inTransitShipments = shipmentStatusData.find(s => s.status === 'In Transit')?.count || 0;

  // For pie chart
  const statusData = [
    { name: 'Completed', value: completedShipments },
    { name: 'In Transit', value: inTransitShipments },
    { name: 'Pending', value: totalShipments - completedShipments - inTransitShipments },
  ].filter(item => item.value > 0); // Only include statuses with values

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9467BD'];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading reports data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container py-6 flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">Error loading reports data</p>
            <p className="text-muted-foreground">{(error as Error).message}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Reports & Analytics</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Revenue</CardTitle>
              <CardDescription>All time earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Profit</CardTitle>
              <CardDescription>Revenue minus costs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₹{totalProfit.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Shipment Count</CardTitle>
              <CardDescription>Total shipments processed</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalShipments}</p>
              <p className="text-sm text-muted-foreground">{completedShipments} completed</p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
            <TabsTrigger value="shipments">Shipment Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue & Profit</CardTitle>
                <CardDescription>Financial performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={revenueData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₹${value}`, undefined]} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                        <Bar dataKey="profit" name="Profit" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-muted-foreground">No revenue data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shipments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipment Status Distribution</CardTitle>
                <CardDescription>Current status of all shipments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Shipments']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-muted-foreground">No shipment data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
