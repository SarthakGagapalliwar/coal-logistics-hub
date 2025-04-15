
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Download, CalendarIcon, ArrowUpDown } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAnalytics } from '@/hooks/use-analytics';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
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
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const isAdmin = user?.role === 'admin';
  
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

  // For regular users: Load all their shipment reports on component mount
  // For admins: Load all shipments regardless of date
  React.useEffect(() => {
    if (user) {
      if (user.role !== 'admin') {
        fetchAllUserShipments();
      } else {
        fetchAllShipments();
      }
    }
  }, [user]);

  // Fetch all shipments for admin regardless of date
  const fetchAllShipments = async () => {
    if (!isAdmin) return;
    
    setIsLoadingShipments(true);
    
    try {
      const { data, error } = await supabase
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
        `)
        .order('departure_time', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setShipmentReports(data || []);
    } catch (err) {
      console.error('Error fetching all shipment reports:', err);
      toast.error(`Failed to fetch shipment reports: ${(err as Error).message}`);
    } finally {
      setIsLoadingShipments(false);
    }
  };

  // Fetch all shipments for a regular user regardless of date
  const fetchAllUserShipments = async () => {
    if (!user) return;
    
    setIsLoadingShipments(true);
    
    try {
      // First get user's assigned packages
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('assigned_packages')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        throw new Error(profileError.message);
      }
      
      // Return early if user has no assigned packages
      if (!profileData?.assigned_packages || profileData.assigned_packages.length === 0) {
        setShipmentReports([]);
        setIsLoadingShipments(false);
        return;
      }
      
      // Fetch shipments filtered by the user's assigned packages
      const { data, error } = await supabase
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
        `)
        .in('package_id', profileData.assigned_packages)
        .order('departure_time', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setShipmentReports(data || []);
    } catch (err) {
      console.error('Error fetching user shipment reports:', err);
      toast.error(`Failed to fetch shipment reports: ${(err as Error).message}`);
    } finally {
      setIsLoadingShipments(false);
    }
  };

  // Sort shipments based on sortField and sortDirection
  const handleSort = (field: string) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New sort field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sorted shipments
  const getSortedShipments = () => {
    if (!sortField) return shipmentReports;
    
    return [...shipmentReports].sort((a, b) => {
      let valueA, valueB;
      
      // Handle nested properties
      if (sortField === 'transporters.name') {
        valueA = a.transporters?.name || '';
        valueB = b.transporters?.name || '';
      } else if (sortField === 'vehicles.vehicle_number') {
        valueA = a.vehicles?.vehicle_number || '';
        valueB = b.vehicles?.vehicle_number || '';
      } else if (sortField === 'packages.name') {
        valueA = a.packages?.name || '';
        valueB = b.packages?.name || '';
      } else {
        valueA = a[sortField] || '';
        valueB = b[sortField] || '';
      }
      
      // Sort strings case-insensitively
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      // Sort numbers
      const comparison = valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const handleExportExcel = async () => {
    if (isAdmin && (!dateRange?.from || !dateRange?.to)) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    setIsExporting(true);
    
    try {
      // Create query for export
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
      } else if (isAdmin && dateRange?.from && dateRange?.to) {
        // Apply date range filter only for admins
        query = query
          .gte('departure_time', dateRange.from.toISOString())
          .lte('departure_time', dateRange.to.toISOString());
      }
      
      // Order by departure time
      query = query.order('departure_time', { ascending: false });
      
      // Get the data
      const { data, error } = await query;
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.length === 0) {
        toast.warning('No shipments found to export');
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
          'Remarks': shipment.remarks || '',
        };
        
        // Add billing information only for admins
        if (isAdmin) {
          const billingRate = shipment.routes?.billing_rate_per_ton || 0;
          const vendorRate = shipment.routes?.vendor_rate_per_ton || 0;
          const quantity = parseFloat(shipment.quantity_tons) || 0;
          
          const billingAmount = billingRate * quantity;
          const vendorAmount = vendorRate * quantity;
          const profit = billingAmount - vendorAmount;
          
          return {
            ...baseFields,
            'ID': shipment.id,
            'Billing Rate (₹/Ton)': billingRate,
            'Vendor Rate (₹/Ton)': vendorRate,
            'Billing Amount (₹)': billingAmount,
            'Vendor Amount (₹)': vendorAmount,
            'Profit (₹)': profit,
            'Profit per Shipment (₹)': profit,
          };
        }
        
        return baseFields;
      });
      
      const worksheet = utils.json_to_sheet(formattedData);
      
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Shipments');
      
      const filename = isAdmin && dateRange?.from && dateRange?.to
        ? `Shipments_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`
        : `Shipments_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      writeFile(workbook, filename);
      
      toast.success('Shipment report downloaded successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(`Failed to export shipments: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Table columns definition - same for both admin and regular users
  const shipmentColumns = [
    { 
      header: "Package",
      accessorKey: "packages.name",
      cell: (row: any) => row.packages?.name || 'N/A'
    },
    {
      header: "Source",
      accessorKey: "source"
    },
    {
      header: "Destination",
      accessorKey: "destination"
    },
    {
      header: "Transport",
      accessorKey: "transporters.name",
      cell: (row: any) => row.transporters?.name || 'Unknown'
    },
    {
      header: "Vehicle",
      accessorKey: "vehicles.vehicle_number",
      cell: (row: any) => row.vehicles?.vehicle_number || 'Unknown'
    },
    {
      header: "Quantity",
      accessorKey: "quantity_tons",
      cell: (row: any) => `${row.quantity_tons} tons`
    },
    {
      header: "Departure Date",
      accessorKey: "departure_time",
      cell: (row: any) => format(parseISO(row.departure_time), 'PPP')
    }
  ];

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

  const sortedShipments = getSortedShipments();

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          
          {/* Export button - visible to all users, but date selection only for admins */}
          <div className="flex items-center gap-2">
            {isAdmin && (
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
            )}
            
            <Button 
              onClick={handleExportExcel} 
              disabled={isExporting || (isAdmin && (!dateRange?.from || !dateRange?.to))}
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
        
        {/* Shipment reports table - shown to all users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>
                {isAdmin ? 'Shipment Reports' : 'My Shipment Reports'}
              </CardTitle>
              <CardDescription>
                {isAdmin 
                  ? 'All shipments in the system'
                  : 'All shipments assigned to you'
                }
              </CardDescription>
            </div>
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
                      {isAdmin ? (
                        // For admin: sortable headers
                        <>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('packages.name')}
                          >
                            Package
                            <ArrowUpDown className="ml-2 h-4 w-4 inline-block" />
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('source')}
                          >
                            Source
                            <ArrowUpDown className="ml-2 h-4 w-4 inline-block" />
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('destination')}
                          >
                            Destination
                            <ArrowUpDown className="ml-2 h-4 w-4 inline-block" />
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('transporters.name')}
                          >
                            Transport
                            <ArrowUpDown className="ml-2 h-4 w-4 inline-block" />
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('vehicles.vehicle_number')}
                          >
                            Vehicle
                            <ArrowUpDown className="ml-2 h-4 w-4 inline-block" />
                          </TableHead>
                          <TableHead>
                            Quantity
                          </TableHead>
                          <TableHead>
                            Departure Date
                          </TableHead>
                        </>
                      ) : (
                        // For regular users: regular headers
                        shipmentColumns.map((column, index) => (
                          <TableHead key={index}>{column.header}</TableHead>
                        ))
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedShipments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={shipmentColumns.length} className="h-24 text-center">
                          {isAdmin
                            ? 'No shipments found in the system'
                            : 'No shipments have been assigned to you'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedShipments.map((shipment) => (
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
