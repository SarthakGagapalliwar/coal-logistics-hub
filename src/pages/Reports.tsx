
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Reports = () => {
  const { revenueData, shipmentStatusData, isLoading, error } = useAnalytics();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [shipmentReports, setShipmentReports] = useState<any[]>([]);
  const [isLoadingShipments, setIsLoadingShipments] = useState(false);
  
  // Calculate analytics metrics (only relevant for admins)
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

  // Load shipment reports when date range changes
  React.useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchShipmentReports();
    }
  }, [dateRange]);

  // Fetch shipment reports based on user role and date range
  const fetchShipmentReports = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    setIsLoadingShipments(true);
    
    try {
      // Create query - for regular users, only fetch their own shipments
      let query = supabase
        .from('shipments')
        .select(`
          id,
          source,
          destination,
          quantity_tons,
          departure_time,
          transporters:transporter_id (name),
          vehicles:vehicle_id (vehicle_number),
          packages:package_id (name)
        `);

      // If user is not an admin, filter by packages assigned to them
      if (user && user.role !== 'admin') {
        // First get user's assigned packages
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('assigned_packages')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          throw new Error(profileError.message);
        }
        
        // Filter shipments by the user's assigned packages
        if (profileData?.assigned_packages && profileData.assigned_packages.length > 0) {
          query = query.in('package_id', profileData.assigned_packages);
        } else {
          // If user has no assigned packages, return empty result
          setShipmentReports([]);
          setIsLoadingShipments(false);
          return;
        }
      }
      
      // Add date range filter and execute query
      const { data, error } = await query
        .gte('departure_time', dateRange.from.toISOString())
        .lte('departure_time', dateRange.to.toISOString())
        .order('departure_time', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Format the data for display
      setShipmentReports(data || []);
    } catch (err) {
      console.error('Error fetching shipment reports:', err);
      toast.error(`Failed to fetch shipment reports: ${(err as Error).message}`);
    } finally {
      setIsLoadingShipments(false);
    }
  };

  const handleExportExcel = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    setIsExporting(true);
    
    try {
      // Create query for export - get detailed shipment data
      let query = supabase
        .from('shipments')
        .select(`
          *,
          transporters:transporter_id (name),
          vehicles:vehicle_id (vehicle_number),
          routes:route_id (billing_rate_per_ton, vendor_rate_per_ton),
          packages:package_id (name)
        `);
        
      // Filter by user's assigned packages if not admin
      if (user && user.role !== 'admin') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('assigned_packages')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          throw new Error(profileError.message);
        }
        
        if (profileData?.assigned_packages && profileData.assigned_packages.length > 0) {
          query = query.in('package_id', profileData.assigned_packages);
        } else {
          toast.warning('No assigned packages to export');
          setIsExporting(false);
          return;
        }
      }
      
      // Apply date range filter and get data
      const { data, error } = await query
        .gte('departure_time', dateRange.from.toISOString())
        .lte('departure_time', dateRange.to.toISOString())
        .order('departure_time', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.length === 0) {
        toast.warning('No shipments found in the selected date range');
        setIsExporting(false);
        return;
      }
      
      // Format data for export - different fields for admin vs regular users
      const formattedData = data.map(shipment => {
        const baseFields = {
          'Package': shipment.packages?.name || 'N/A',
          'Source': shipment.source,
          'Destination': shipment.destination,
          'Transporter': shipment.transporters?.name || 'Unknown',
          'Vehicle': shipment.vehicles?.vehicle_number || 'Unknown',
          'Quantity (Tons)': shipment.quantity_tons,
          'Departure Time': format(parseISO(shipment.departure_time), 'PPP p'),
          'Status': shipment.status,
          'Arrival Time': shipment.arrival_time ? format(parseISO(shipment.arrival_time), 'PPP p') : 'Not arrived',
          'Remarks': shipment.remarks || '',
        };
        
        // Add billing information only for admins
        if (user?.role === 'admin') {
          return {
            ...baseFields,
            'ID': shipment.id,
            'Billing Rate (₹/Ton)': shipment.routes?.billing_rate_per_ton || 'N/A',
            'Vendor Rate (₹/Ton)': shipment.routes?.vendor_rate_per_ton || 'N/A',
          };
        }
        
        return baseFields;
      });
      
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
        </div>
        
        {/* Show different content based on user role */}
        {user?.role === 'admin' ? (
          <>
            {/* Admin view with metrics and charts */}
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
            
            <Tabs defaultValue="revenue" className="w-full mb-6">
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
          </>
        ) : null}
        
        {/* Shipment reports table - shown to all users */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Reports</CardTitle>
            <CardDescription>
              {dateRange?.from && dateRange?.to 
                ? `Shipments from ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}`
                : 'Select a date range to view shipments'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingShipments ? (
              <div className="h-60 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Package</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Transport</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Departure Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipmentReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          {dateRange?.from && dateRange?.to
                            ? 'No shipments found for the selected date range'
                            : 'Select a date range to view shipments'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      shipmentReports.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell>{shipment.packages?.name || 'N/A'}</TableCell>
                          <TableCell>{shipment.source}</TableCell>
                          <TableCell>{shipment.destination}</TableCell>
                          <TableCell>{shipment.transporters?.name || 'Unknown'}</TableCell>
                          <TableCell>{shipment.vehicles?.vehicle_number || 'Unknown'}</TableCell>
                          <TableCell>{shipment.quantity_tons} tons</TableCell>
                          <TableCell>{format(parseISO(shipment.departure_time), 'PPP')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
