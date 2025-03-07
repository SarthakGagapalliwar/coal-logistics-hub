
// Mock data for the coal logistics application

// Transporters
export interface Transporter {
  id: string;
  name: string;
  gstn: string;
  contactPerson: string;
  contactNumber: string;
  address: string;
  createdAt: string;
}

export const transporters: Transporter[] = [
  {
    id: "T001",
    name: "Fast Track Logistics",
    gstn: "22AAAAA0000A1Z5",
    contactPerson: "Rajesh Kumar",
    contactNumber: "9876543210",
    address: "123 Transport Nagar, Delhi",
    createdAt: "2023-01-15T10:30:00Z",
  },
  {
    id: "T002",
    name: "Coal Carriers Ltd",
    gstn: "22BBBBB0000B1Z5",
    contactPerson: "Amit Singh",
    contactNumber: "9876543211",
    address: "456 Industrial Area, Mumbai",
    createdAt: "2023-02-20T09:15:00Z",
  },
  {
    id: "T003",
    name: "Mineral Movers",
    gstn: "22CCCCC0000C1Z5",
    contactPerson: "Priya Sharma",
    contactNumber: "9876543212",
    address: "789 Transport Hub, Kolkata",
    createdAt: "2023-03-05T14:45:00Z",
  },
  {
    id: "T004",
    name: "Highway Haulers",
    gstn: "22DDDDD0000D1Z5",
    contactPerson: "Vikram Patel",
    contactNumber: "9876543213",
    address: "101 Truck Terminal, Chennai",
    createdAt: "2023-04-10T11:20:00Z",
  },
  {
    id: "T005",
    name: "Coal Express",
    gstn: "22EEEEE0000E1Z5",
    contactPerson: "Sunita Verma",
    contactNumber: "9876543214",
    address: "202 Logistics Park, Hyderabad",
    createdAt: "2023-05-15T08:30:00Z",
  },
];

// Vehicles
export interface Vehicle {
  id: string;
  transporterId: string;
  transporterName: string;
  vehicleNumber: string;
  vehicleType: "Truck" | "Trailer" | "Dumper" | "Train";
  capacity: number;
  status: "Available" | "In Transit" | "Maintenance";
  lastMaintenance: string;
}

export const vehicles: Vehicle[] = [
  {
    id: "V001",
    transporterId: "T001",
    transporterName: "Fast Track Logistics",
    vehicleNumber: "DL01AB1234",
    vehicleType: "Truck",
    capacity: 20,
    status: "Available",
    lastMaintenance: "2023-06-01T00:00:00Z",
  },
  {
    id: "V002",
    transporterId: "T001",
    transporterName: "Fast Track Logistics",
    vehicleNumber: "DL01CD5678",
    vehicleType: "Dumper",
    capacity: 30,
    status: "In Transit",
    lastMaintenance: "2023-05-15T00:00:00Z",
  },
  {
    id: "V003",
    transporterId: "T002",
    transporterName: "Coal Carriers Ltd",
    vehicleNumber: "MH02EF9012",
    vehicleType: "Trailer",
    capacity: 35,
    status: "Available",
    lastMaintenance: "2023-06-10T00:00:00Z",
  },
  {
    id: "V004",
    transporterId: "T003",
    transporterName: "Mineral Movers",
    vehicleNumber: "WB03GH3456",
    vehicleType: "Truck",
    capacity: 25,
    status: "Maintenance",
    lastMaintenance: "2023-06-20T00:00:00Z",
  },
  {
    id: "V005",
    transporterId: "T004",
    transporterName: "Highway Haulers",
    vehicleNumber: "TN04IJ7890",
    vehicleType: "Dumper",
    capacity: 28,
    status: "In Transit",
    lastMaintenance: "2023-05-25T00:00:00Z",
  },
  {
    id: "V006",
    transporterId: "T005",
    transporterName: "Coal Express",
    vehicleNumber: "TS05KL1234",
    vehicleType: "Trailer",
    capacity: 40,
    status: "Available",
    lastMaintenance: "2023-06-05T00:00:00Z",
  },
];

// Routes
export interface Route {
  id: string;
  source: string;
  destination: string;
  distanceKm: number;
  billingRatePerTon: number;
  vendorRatePerTon: number;
  estimatedTime: number; // in hours
  createdAt: string;
}

export const routes: Route[] = [
  {
    id: "R001",
    source: "Jharia Coal Field",
    destination: "Delhi Power Plant",
    distanceKm: 1100,
    billingRatePerTon: 850,
    vendorRatePerTon: 750,
    estimatedTime: 24,
    createdAt: "2023-01-10T00:00:00Z",
  },
  {
    id: "R002",
    source: "Raniganj Coal Field",
    destination: "Mumbai Thermal Station",
    distanceKm: 1600,
    billingRatePerTon: 1200,
    vendorRatePerTon: 1050,
    estimatedTime: 36,
    createdAt: "2023-02-15T00:00:00Z",
  },
  {
    id: "R003",
    source: "Talcher Coal Field",
    destination: "Chennai Power Plant",
    distanceKm: 1300,
    billingRatePerTon: 1000,
    vendorRatePerTon: 900,
    estimatedTime: 30,
    createdAt: "2023-03-20T00:00:00Z",
  },
  {
    id: "R004",
    source: "Korba Coal Field",
    destination: "Hyderabad Steel Plant",
    distanceKm: 800,
    billingRatePerTon: 700,
    vendorRatePerTon: 600,
    estimatedTime: 18,
    createdAt: "2023-04-25T00:00:00Z",
  },
  {
    id: "R005",
    source: "Singrauli Coal Field",
    destination: "Bangalore Industrial Zone",
    distanceKm: 1500,
    billingRatePerTon: 1100,
    vendorRatePerTon: 950,
    estimatedTime: 34,
    createdAt: "2023-05-30T00:00:00Z",
  },
];

// Shipments
export interface Shipment {
  id: string;
  transporterId: string;
  transporterName: string;
  vehicleId: string;
  vehicleNumber: string;
  routeId: string;
  source: string;
  destination: string;
  coalType: "Thermal" | "Coking" | "Anthracite" | "Lignite";
  quantityTons: number;
  departureTime: string;
  estimatedArrivalTime: string;
  actualArrivalTime: string | null;
  status: "Scheduled" | "In Transit" | "Delivered" | "Delayed" | "Cancelled";
  billingStatus: "Pending" | "Invoiced" | "Paid";
  createdAt: string;
}

export const shipments: Shipment[] = [
  {
    id: "S001",
    transporterId: "T001",
    transporterName: "Fast Track Logistics",
    vehicleId: "V001",
    vehicleNumber: "DL01AB1234",
    routeId: "R001",
    source: "Jharia Coal Field",
    destination: "Delhi Power Plant",
    coalType: "Thermal",
    quantityTons: 18,
    departureTime: "2023-06-01T08:00:00Z",
    estimatedArrivalTime: "2023-06-02T08:00:00Z",
    actualArrivalTime: "2023-06-02T09:30:00Z",
    status: "Delivered",
    billingStatus: "Invoiced",
    createdAt: "2023-05-25T10:00:00Z",
  },
  {
    id: "S002",
    transporterId: "T002",
    transporterName: "Coal Carriers Ltd",
    vehicleId: "V003",
    vehicleNumber: "MH02EF9012",
    routeId: "R002",
    source: "Raniganj Coal Field",
    destination: "Mumbai Thermal Station",
    coalType: "Coking",
    quantityTons: 32,
    departureTime: "2023-06-05T07:00:00Z",
    estimatedArrivalTime: "2023-06-06T19:00:00Z",
    actualArrivalTime: null,
    status: "In Transit",
    billingStatus: "Pending",
    createdAt: "2023-05-30T11:30:00Z",
  },
  {
    id: "S003",
    transporterId: "T003",
    transporterName: "Mineral Movers",
    vehicleId: "V004",
    vehicleNumber: "WB03GH3456",
    routeId: "R003",
    source: "Talcher Coal Field",
    destination: "Chennai Power Plant",
    coalType: "Thermal",
    quantityTons: 25,
    departureTime: "2023-06-10T06:00:00Z",
    estimatedArrivalTime: "2023-06-11T12:00:00Z",
    actualArrivalTime: "2023-06-11T14:15:00Z",
    status: "Delivered",
    billingStatus: "Paid",
    createdAt: "2023-06-01T09:45:00Z",
  },
  {
    id: "S004",
    transporterId: "T004",
    transporterName: "Highway Haulers",
    vehicleId: "V005",
    vehicleNumber: "TN04IJ7890",
    routeId: "R004",
    source: "Korba Coal Field",
    destination: "Hyderabad Steel Plant",
    coalType: "Anthracite",
    quantityTons: 27,
    departureTime: "2023-06-15T08:30:00Z",
    estimatedArrivalTime: "2023-06-16T02:30:00Z",
    actualArrivalTime: null,
    status: "Delayed",
    billingStatus: "Pending",
    createdAt: "2023-06-10T15:20:00Z",
  },
  {
    id: "S005",
    transporterId: "T005",
    transporterName: "Coal Express",
    vehicleId: "V006",
    vehicleNumber: "TS05KL1234",
    routeId: "R005",
    source: "Singrauli Coal Field",
    destination: "Bangalore Industrial Zone",
    coalType: "Lignite",
    quantityTons: 38,
    departureTime: "2023-06-20T05:00:00Z",
    estimatedArrivalTime: "2023-06-21T15:00:00Z",
    actualArrivalTime: null,
    status: "Scheduled",
    billingStatus: "Pending",
    createdAt: "2023-06-15T12:10:00Z",
  },
];

// Dashboard stats
export interface DashboardStats {
  totalShipments: number;
  activeShipments: number;
  totalTransporters: number;
  totalVehicles: number;
  deliveredThisMonth: number;
  pendingInvoices: number;
  revenueThisMonth: number;
  costThisMonth: number;
  profitThisMonth: number;
  shipmentTrend: number;
  revenueTrend: number;
}

export const dashboardStats: DashboardStats = {
  totalShipments: 120,
  activeShipments: 45,
  totalTransporters: 12,
  totalVehicles: 78,
  deliveredThisMonth: 75,
  pendingInvoices: 23,
  revenueThisMonth: 1250000,
  costThisMonth: 950000,
  profitThisMonth: 300000,
  shipmentTrend: 12.5,
  revenueTrend: 8.3,
};

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
