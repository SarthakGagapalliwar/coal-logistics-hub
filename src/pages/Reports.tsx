import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, AlertTriangle, Download, CalendarIcon } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAnalytics } from '@/hooks/use-analytics';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { utils, writeFile } from 'xlsx';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { DateRange } from 'react-day-picker';

const Reports = () => {
  const { revenueData, shipmentStatusData, isLoading, error } = useAnalytics();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [isExporting, setIsExporting] = useState(false);
  
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCost = revenueData.reduce((sum, item) => sum + item.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  
  const totalShipments = shipmentStatusData.reduce((sum, item) => sum + item.count, 0);
  const completedShipments = shipmentStatusData.find(s => s.status === 'Completed')?.count || 0;
  const inTransitShipments = shipmentStatusData.find(s => s.status === 'In Transit')?.count || 0;

  const statusData = [
    { name: 'Completed', value: completedShipments },
    { name: 'In Transit', value: inTransitShipments },
    { name: 'Pending', value: totalShipments - completedShipments - inTransitShipments },
  ].filter(item => item.value > 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9467BD'];

  const handleExportExcel = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    setIsExporting(true);
    
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          transporters:transporter_id (name),
          vehicles:vehicle_id (vehicle_number)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      const filteredShipments = data.filter(shipment => {
        const departureDate = parseISO(shipment.departure_time);
        return (
          isAfter(departureDate, dateRange.from!) && 
          isBefore(departureDate, dateRange.to!)
        );
      });
      
      if (filteredShipments.length === 0) {
        toast.warning('No shipments found in the selected date range');
        setIsExporting(false);
        return;
      }
      
      const formattedData = filteredShipments.map(shipment => ({
        'ID': shipment.id,
        'Transporter': shipment.transporters?.name || 'Unknown',
        'Vehicle': shipment.vehicles?.vehicle_number || 'Unknown',
        'Source': shipment.source,
        'Destination': shipment.destination,
        'Quantity (Tons)': shipment.quantity_tons,
        'Status': shipment.status,
        'Departure Time': format(parseISO(shipment.departure_time), 'PPP p'),
        'Arrival Time': shipment.arrival_time ? format(parseISO(shipment.arrival_time), 'PPP p') : 'Not arrived',
        'Remarks': shipment.remarks || '',
      }));
      
      const worksheet = utils.json_to_sheet(formattedData);
      
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Shipments');
      
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');
      const filename = `Shipments_${fromDate}_to_${toDate}.xlsx`;
      
      writeFile(workbook, filename);
      
      toast.success('Shipment report downloaded successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(`Failed to export shipments: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2">
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Select date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      className="pointer-events-auto p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <Button 
                onClick={handleExportExcel} 
                disabled={isExporting || !dateRange?.from || !dateRange?.to}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Excel
              </Button>
            </div>
          )}
        </div>
        
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
