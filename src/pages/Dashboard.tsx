
import React from 'react';
import PageTransition from '@/components/ui-custom/PageTransition';
import DashboardCard from '@/components/ui-custom/DashboardCard';
import DataTable from '@/components/ui-custom/DataTable';
import { useAuth } from '@/context/AuthContext';
import { 
  Truck, 
  Package, 
  Map, 
  TrendingUp,
  FileText,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  dashboardStats, 
  shipments, 
  formatCurrency, 
  formatDate 
} from '@/lib/data';
import { motion } from 'framer-motion';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

// Mock chart data
const revenueData = [
  { month: 'Jan', revenue: 950000, cost: 750000 },
  { month: 'Feb', revenue: 1050000, cost: 820000 },
  { month: 'Mar', revenue: 1200000, cost: 900000 },
  { month: 'Apr', revenue: 1100000, cost: 850000 },
  { month: 'May', revenue: 1150000, cost: 870000 },
  { month: 'Jun', revenue: 1250000, cost: 950000 },
];

const shipmentData = [
  { week: 'W1', count: 25 },
  { week: 'W2', count: 30 },
  { week: 'W3', count: 28 },
  { week: 'W4', count: 35 },
];

const Dashboard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Responsive columns for shipment table
  const shipmentColumns = [
    {
      header: "ID",
      accessorKey: "id",
    },
    {
      header: "Transporter",
      accessorKey: "transporterName",
    },
    {
      header: "Route",
      accessorKey: "route",
      cell: (row: any) => `${row.source} → ${row.destination}`,
    },
    {
      header: "Quantity",
      accessorKey: "quantityTons",
      cell: (row: any) => `${row.quantityTons} tons`,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.status === 'Delivered' ? 'bg-green-100 text-green-800' :
          row.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
          row.status === 'Scheduled' ? 'bg-purple-100 text-purple-800' :
          row.status === 'Delayed' ? 'bg-amber-100 text-amber-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      header: "Departure",
      accessorKey: "departureTime",
      cell: (row: any) => formatDate(row.departureTime),
    },
  ];

  // For mobile, show fewer columns
  const mobileShipmentColumns = isMobile 
    ? shipmentColumns.filter(col => 
        ['ID', 'Transporter', 'Status'].includes(col.header)
      ) 
    : shipmentColumns;
  
  const fadeInUpVariants = {
    initial: { opacity: 0, y: 10 },
    animate: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.05 * index,
        duration: 0.3,
        ease: "easeOut"
      }
    })
  };
  
  return (
    <PageTransition>
      <div className="container py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.username}! Here's an overview of your logistics operations.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Active Shipments"
            value={dashboardStats.activeShipments}
            icon={<Package size={24} />}
            description="Currently in transit"
            trend={{ value: dashboardStats.shipmentTrend, isPositive: true }}
          />
          
          <DashboardCard
            title="Total Vehicles"
            value={dashboardStats.totalVehicles}
            icon={<Truck size={24} />}
            description="All registered vehicles"
          />
          
          <DashboardCard
            title="Total Transporters"
            value={dashboardStats.totalTransporters}
            icon={<Truck size={24} />}
            description="Active transport companies"
          />
          
          <DashboardCard
            title="Monthly Revenue"
            value={formatCurrency(dashboardStats.revenueThisMonth)}
            icon={<TrendingUp size={24} />}
            description="Current month"
            trend={{ value: dashboardStats.revenueTrend, isPositive: true }}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            variants={fadeInUpVariants}
            initial="initial"
            animate="animate"
            custom={2}
          >
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs. Cost</CardTitle>
                <CardDescription>Monthly financial overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={revenueData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="month" />
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
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        name="Cost"
                        stroke="hsl(var(--secondary-foreground))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            variants={fadeInUpVariants}
            initial="initial"
            animate="animate"
            custom={3}
          >
            <Card>
              <CardHeader>
                <CardTitle>Weekly Shipments</CardTitle>
                <CardDescription>Number of shipments per week this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={shipmentData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name="Shipments"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <motion.div
            variants={fadeInUpVariants}
            initial="initial"
            animate="animate"
            custom={4}
          >
            <Card>
              <CardHeader>
                <CardTitle>Recent Shipments</CardTitle>
                <CardDescription>Latest shipment activities</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={shipments}
                  columns={mobileShipmentColumns}
                  searchKey="transporterName"
                  searchPlaceholder="Search by transporter..."
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
