
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbShipment, handleSupabaseError } from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchTransporters } from './use-transporters';
import { fetchVehicles } from './use-vehicles';
import { fetchRoutes } from './use-routes';
import { fetchPackages } from './use-packages';

// Type for our app's shipment format
export interface Shipment {
  id: string;
  transporterId: string;
  transporterName?: string;
  vehicleId: string;
  vehicleNumber?: string;
  source: string;
  destination: string;
  quantityTons: number;
  status: string;
  departureTime: string;
  arrivalTime: string | null;
  remarks?: string;
  routeId?: string;
  packageId?: string;
  billingRatePerTon?: number;
  vendorRatePerTon?: number;
  created_at?: string;
}

// Convert DB format to app format
const dbToAppShipment = (dbShipment: DbShipment): Shipment => ({
  id: dbShipment.id,
  transporterId: dbShipment.transporter_id,
  vehicleId: dbShipment.vehicle_id,
  source: dbShipment.source,
  destination: dbShipment.destination,
  quantityTons: Number(dbShipment.quantity_tons),
  status: dbShipment.status,
  departureTime: dbShipment.departure_time,
  arrivalTime: dbShipment.arrival_time,
  remarks: dbShipment.remarks,
  routeId: dbShipment.route_id,
  packageId: dbShipment.package_id,
  created_at: dbShipment.created_at,
});

// Convert app format to DB format
const appToDbShipment = (shipment: Partial<Shipment>) => ({
  transporter_id: shipment.transporterId,
  vehicle_id: shipment.vehicleId,
  source: shipment.source,
  destination: shipment.destination,
  quantity_tons: shipment.quantityTons,
  status: shipment.status || 'Pending',
  departure_time: shipment.departureTime,
  arrival_time: shipment.arrivalTime,
  remarks: shipment.remarks,
  route_id: shipment.routeId,
  package_id: shipment.packageId && shipment.packageId !== 'none' ? shipment.packageId : null,
});

// Isolate the data fetching function
export const fetchShipments = async () => {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select(`
        *,
        transporters:transporter_id (name),
        vehicles:vehicle_id (vehicle_number),
        routes:route_id (billing_rate_per_ton, vendor_rate_per_ton)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching shipments:', error);
      throw new Error(error.message);
    }
    
    return data.map((shipment: any) => ({
      ...dbToAppShipment(shipment),
      transporterName: shipment.transporters?.name || 'Unknown',
      vehicleNumber: shipment.vehicles?.vehicle_number || 'Unknown',
      billingRatePerTon: shipment.routes?.billing_rate_per_ton || null,
      vendorRatePerTon: shipment.routes?.vendor_rate_per_ton || null,
    }));
  } catch (err) {
    console.error('Error in shipments query:', err);
    throw err;
  }
};

export const useShipments = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  
  // Use separate queries for related data
  const { data: transporters = [] } = useQuery({
    queryKey: ['transporters'],
    queryFn: fetchTransporters
  });
  
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles
  });
  
  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: fetchRoutes
  });
  
  const { data: packages = [] } = useQuery({
    queryKey: ['packagesForShipments'],
    queryFn: fetchPackages
  });
  
  const [formData, setFormData] = useState({
    transporterId: '',
    vehicleId: '',
    source: '',
    destination: '',
    quantityTons: '',
    status: 'Pending',
    departureTime: '',
    arrivalTime: '',
    remarks: '',
    routeId: '',
    packageId: 'none',
    billingRatePerTon: null,
    vendorRatePerTon: null,
  });

  // Query to fetch shipments
  const { 
    data: shipments = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['shipments'],
    queryFn: fetchShipments
  });

  // Mutation to add a new shipment
  const addShipmentMutation = useMutation({
    mutationFn: async (shipment: Omit<Shipment, 'id'>) => {
      try {
        // Find route_id by source and destination if not provided
        let shipmentData = appToDbShipment(shipment);
        
        // If we have source and destination but no route_id, try to find a matching route
        if (!shipmentData.route_id && shipment.source && shipment.destination) {
          // If package is selected, filter routes by package
          const matchingRoute = shipment.packageId && shipment.packageId !== 'none'
            ? routes.find(route => 
                route.source.toLowerCase() === shipment.source.toLowerCase() && 
                route.destination.toLowerCase() === shipment.destination.toLowerCase() &&
                route.assignedPackageId === shipment.packageId
              )
            : routes.find(route => 
                route.source.toLowerCase() === shipment.source.toLowerCase() && 
                route.destination.toLowerCase() === shipment.destination.toLowerCase()
              );
          
          if (matchingRoute) {
            shipmentData.route_id = matchingRoute.id;
            console.log(`Found matching route: ${matchingRoute.id} for ${shipment.source} to ${shipment.destination}`);
          }
        }
        
        console.log('Creating shipment with data:', shipmentData);
        
        const { data, error } = await supabase
          .from('shipments')
          .insert(shipmentData)
          .select(`
            *,
            transporters:transporter_id (name),
            vehicles:vehicle_id (vehicle_number)
          `)
          .single();
        
        if (error) {
          console.error('Error adding shipment:', error);
          throw new Error(error.message);
        }
        
        return {
          ...dbToAppShipment(data),
          transporterName: data.transporters?.name || 'Unknown',
          vehicleNumber: data.vehicles?.vehicle_number || 'Unknown',
        };
      } catch (err) {
        console.error('Error in add shipment mutation:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(`Shipment from ${formData.source} to ${formData.destination} added successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add shipment: ${error.message}`);
    }
  });

  // Mutation to update a shipment
  const updateShipmentMutation = useMutation({
    mutationFn: async (shipment: Shipment) => {
      try {
        let shipmentData = appToDbShipment(shipment);
        
        // If we have source and destination but no route_id, try to find a matching route
        if (!shipmentData.route_id && shipment.source && shipment.destination) {
          // If package is selected, filter routes by package
          const matchingRoute = shipment.packageId && shipment.packageId !== 'none'
            ? routes.find(route => 
                route.source.toLowerCase() === shipment.source.toLowerCase() && 
                route.destination.toLowerCase() === shipment.destination.toLowerCase() &&
                route.assignedPackageId === shipment.packageId
              )
            : routes.find(route => 
                route.source.toLowerCase() === shipment.source.toLowerCase() && 
                route.destination.toLowerCase() === shipment.destination.toLowerCase()
              );
          
          if (matchingRoute) {
            shipmentData.route_id = matchingRoute.id;
            console.log(`Found matching route: ${matchingRoute.id} for ${shipment.source} to ${shipment.destination}`);
          }
        }
        
        console.log('Updating shipment with data:', shipmentData);
        console.log('Shipment ID:', shipment.id);
        
        const { error } = await supabase
          .from('shipments')
          .update(shipmentData)
          .eq('id', shipment.id);
        
        if (error) {
          console.error('Error updating shipment:', error);
          throw new Error(error.message);
        }
        
        return shipment;
      } catch (err) {
        console.error('Error in update shipment mutation:', err);
        throw err;
      }
    },
    onSuccess: (shipment) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(`Shipment from ${shipment.source} to ${shipment.destination} updated successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update shipment: ${error.message}`);
    }
  });

  // Mutation to delete a shipment
  const deleteShipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      
      // Find the deleted shipment for the success message
      const deletedShipment = shipments.find(s => s.id === variables);
      if (deletedShipment) {
        toast.success(`Shipment from ${deletedShipment.source} to ${deletedShipment.destination} deleted successfully`);
      } else {
        toast.success('Shipment deleted successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete shipment: ${error.message}`);
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If we're selecting a package, clear route selection
    if (name === 'packageId') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        routeId: '' // Reset route when package changes
      }));
    }
    // If we're selecting a route, auto-fill source and destination
    else if (name === 'routeId' && value) {
      const selectedRoute = routes.find(route => route.id === value);
      if (selectedRoute) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          source: selectedRoute.source,
          destination: selectedRoute.destination,
        }));
      }
    }
  };

  // Set up to edit a shipment
  const handleEditShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setFormData({
      transporterId: shipment.transporterId,
      vehicleId: shipment.vehicleId,
      source: shipment.source,
      destination: shipment.destination,
      quantityTons: shipment.quantityTons.toString(),
      status: shipment.status,
      departureTime: shipment.departureTime,
      arrivalTime: shipment.arrivalTime || '',
      remarks: shipment.remarks || '',
      routeId: shipment.routeId || '',
      packageId: shipment.packageId || 'none',
      billingRatePerTon: shipment.billingRatePerTon || null,
      vendorRatePerTon: shipment.vendorRatePerTon || null,
    });
    setOpenDialog(true);
  };

  // Set up to add a new shipment
  const handleAddShipment = () => {
    setSelectedShipment(null);
    resetForm();
    setOpenDialog(true);
  };

  // Reset the form
  const resetForm = () => {
    setFormData({
      transporterId: '',
      vehicleId: '',
      source: '',
      destination: '',
      quantityTons: '',
      status: 'Pending',
      departureTime: new Date().toISOString(),
      arrivalTime: '',
      remarks: '',
      routeId: '',
      packageId: 'none',
      billingRatePerTon: null,
      vendorRatePerTon: null,
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const shipmentData = {
      transporterId: formData.transporterId,
      vehicleId: formData.vehicleId,
      source: formData.source,
      destination: formData.destination,
      quantityTons: Number(formData.quantityTons),
      status: formData.status,
      departureTime: formData.departureTime,
      arrivalTime: formData.arrivalTime || null,
      remarks: formData.remarks,
      routeId: formData.routeId || undefined,
      packageId: formData.packageId === 'none' ? undefined : formData.packageId,
      billingRatePerTon: formData.billingRatePerTon,
      vendorRatePerTon: formData.vendorRatePerTon,
    };
    
    if (selectedShipment) {
      // Update existing shipment
      updateShipmentMutation.mutate({
        id: selectedShipment.id,
        ...shipmentData
      });
    } else {
      // Add new shipment
      addShipmentMutation.mutate(shipmentData as Omit<Shipment, 'id'>);
    }
  };

  // Define isSubmitting state
  const isSubmitting = addShipmentMutation.isPending || updateShipmentMutation.isPending;

  return {
    shipments,
    isLoading,
    error,
    openDialog,
    setOpenDialog,
    selectedShipment,
    formData,
    setFormData,
    handleInputChange,
    handleSelectChange,
    handleEditShipment,
    handleAddShipment,
    handleSubmit,
    isSubmitting,
    transporters,
    vehicles,
    routes,
    packages,
  };
};
