import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase, DbShipment } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';

interface ShipmentWithDetails extends DbShipment {
  transporter_name?: string;
  vehicle_number?: string;
  billing_amount?: number;
  vendor_amount?: number;
}

const Reports = () => {
  const [shipments, setShipments] = useState<ShipmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('shipments')
          .select(`
            *,
            transporters:transporter_id(name),
            vehicles:vehicle_id(vehicle_number),
            routes:routes(id, billing_rate_per_ton, vendor_rate_per_ton)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Process the data to include billing amounts
        const processedData = data.map(shipment => {
          const route = shipment.routes;
          const billingRate = route?.billing_rate_per_ton || 0;
          const vendorRate = route?.vendor_rate_per_ton || 0;
          
          return {
            ...shipment,
            transporter_name: shipment.transporters?.name,
            vehicle_number: shipment.vehicles?.vehicle_number,
            billing_amount: shipment.quantity_tons * billingRate,
            vendor_amount: shipment.quantity_tons * vendorRate,
          };
        });

        setShipments(processedData);
      } catch (error) {
        console.error('Error fetching shipments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, []);

  // Calculate summary statistics
  const totalShipments = shipments.length;
  const completedShipments = shipments.filter(s => s.status === 'completed').length;
  const inTransitShipments = shipments.filter(s => s.status === 'in_transit').length;
  const totalRevenue = shipments.reduce((sum, s) => sum + Number(s.billing_amount || 0), 0);
  const totalCost = shipments.reduce((sum, s) => sum + (s.vendor_amount || 0), 0);
  const totalProfit = totalRevenue - totalCost;

  // Prepare data for charts
  const statusData = [
    { name: 'Completed', value: completedShipments },
    { name: 'In Transit', value: inTransitShipments },
    { name: 'Pending', value: totalShipments - completedShipments - inTransitShipments },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  // Group shipments by month for the revenue chart
  const monthlyData = shipments.reduce((acc, shipment) => {
    const date = new Date(shipment.created_at);
    const month = date.toLocaleString('default', { month: 'short' });
    
    if (!acc[month]) {
      acc[month] = {
        month,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }
    
    acc[month].revenue += Number(shipment.billing_amount || 0);
    acc[month].cost += Number(shipment.vendor_amount || 0);
    acc[month].profit += Number(shipment.billing_amount || 0) - Number(shipment.vendor_amount || 0);
    
    return acc;
  }, {} as Record<string, { month: string; revenue: number; cost: number; profit: number }>);

  const monthlyChartData = Object.values(monthlyData);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Reports & Analytics</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
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
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyChartData}
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
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
