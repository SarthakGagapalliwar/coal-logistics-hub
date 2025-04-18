import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbShipment, handleSupabaseError } from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchTransporters } from './use-transporters';
import { fetchVehicles } from './use-vehicles';
import { fetchRoutes } from './use-routes';
import { fetchPackages } from './use-packages';
import { fetchMaterials } from './use-materials';
import { useAuth } from '@/context/AuthContext';

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
  packageName?: string;
  materialId?: string;
  materialName?: string;
  billingRatePerTon?: number;
  vendorRatePerTon?: number;
  created_at?: string;
}

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
  materialId: dbShipment.material_id,
  created_at: dbShipment.created_at,
});

const appToDbShipment = (shipment: Partial<Shipment>) => ({
  transporter_id: shipment.transporterId || null,
  vehicle_id: shipment.vehicleId || null,
  source: shipment.source,
  destination: shipment.destination,
  quantity_tons: shipment.quantityTons,
  status: shipment.status || 'Pending',
  departure_time: shipment.departureTime,
  arrival_time: shipment.arrivalTime,
  remarks: shipment.remarks,
  route_id: shipment.routeId || null,
  package_id: shipment.packageId && shipment.packageId !== 'none' ? shipment.packageId : null,
  material_id: shipment.materialId && shipment.materialId !== 'none' ? shipment.materialId : null,
});

export const fetchShipments = async (isAdmin: boolean, userPackages: string[] = []) => {
  try {
    let query = supabase
      .from('shipments')
      .select(`
        *,
        transporters:transporter_id (name),
        vehicles:vehicle_id (vehicle_number),
        routes:route_id (billing_rate_per_ton, vendor_rate_per_ton),
        packages:package_id (name),
        materials:material_id (name)
      `)
      .order('created_at', { ascending: false });
    
    if (!isAdmin && userPackages.length > 0) {
      query = query.in('package_id', userPackages);
    } else if (!isAdmin) {
      return [];
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching shipments:', error);
      throw new Error(error.message);
    }
    
    return data.map((shipment: any) => ({
      ...dbToAppShipment(shipment),
      transporterName: shipment.transporters?.name || 'Unknown',
      vehicleNumber: shipment.vehicles?.vehicle_number || 'Unknown',
      packageName: shipment.packages?.name || 'None',
      materialName: shipment.materials?.name || 'None',
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
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
  
  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: fetchMaterials
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
    materialId: 'none',
    billingRatePerTon: null,
    vendorRatePerTon: null,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user || isAdmin) return { assigned_packages: [] };
      
      const { data, error } = await supabase
        .from('profiles')
        .select('assigned_packages')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching user profile:', error);
        return { assigned_packages: [] };
      }
      
      return data;
    },
    enabled: !!user && !isAdmin
  });
  
  const userPackages = userProfile?.assigned_packages || [];

  const { data: shipments = [], isLoading, error } = useQuery({
    queryKey: ['shipments', isAdmin, userPackages],
    queryFn: () => fetchShipments(isAdmin, userPackages),
    enabled: !!user
  });

  const addShipmentMutation = useMutation({
    mutationFn: async (shipment: Omit<Shipment, 'id'>) => {
      try {
        const shipmentData = appToDbShipment(shipment);
        
        console.log('Creating shipment with data:', shipmentData);
        
        if (!shipmentData.transporter_id) {
          throw new Error('Transporter is required');
        }
        
        if (!shipmentData.vehicle_id) {
          throw new Error('Vehicle is required');
        }
        
        const { data, error } = await supabase
          .from('shipments')
          .insert(shipmentData)
          .select(`
            *,
            transporters:transporter_id (name),
            vehicles:vehicle_id (vehicle_number),
            packages:package_id (name),
            materials:material_id (name)
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
          packageName: data.packages?.name || 'None',
          materialName: data.materials?.name || 'None',
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

  const updateShipmentMutation = useMutation({
    mutationFn: async (shipment: Shipment) => {
      try {
        const shipmentData = appToDbShipment(shipment);
        
        console.log('Updating shipment with data:', shipmentData);
        console.log('Shipment ID:', shipment.id);
        
        if (!shipmentData.transporter_id) {
          throw new Error('Transporter is required');
        }
        
        if (!shipmentData.vehicle_id) {
          throw new Error('Vehicle is required');
        }
        
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle special case for datetime-local inputs
    if (name === "departureTime" || name === "arrivalTime") {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'packageId') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        routeId: '' // Reset route when package changes
      }));
    } else if (name === 'routeId' && value) {
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

  const handleEditShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    
    let departureTimeFormatted = '';
    if (shipment.departureTime) {
      try {
        // Format the departure time for the datetime-local input
        // The format should be YYYY-MM-DDThh:mm
        const departureDate = new Date(shipment.departureTime);
        departureTimeFormatted = departureDate.toISOString().slice(0, 16);
      } catch (error) {
        console.error("Error formatting departure time:", error);
        departureTimeFormatted = '';
      }
    }
    
    let arrivalTimeFormatted = '';
    if (shipment.arrivalTime) {
      try {
        // Format the arrival time for the datetime-local input
        const arrivalDate = new Date(shipment.arrivalTime);
        arrivalTimeFormatted = arrivalDate.toISOString().slice(0, 16);
      } catch (error) {
        console.error("Error formatting arrival time:", error);
        arrivalTimeFormatted = '';
      }
    }
    
    setFormData({
      transporterId: shipment.transporterId,
      vehicleId: shipment.vehicleId,
      source: shipment.source,
      destination: shipment.destination,
      quantityTons: shipment.quantityTons.toString(),
      status: shipment.status,
      departureTime: departureTimeFormatted,
      arrivalTime: arrivalTimeFormatted,
      remarks: shipment.remarks || '',
      routeId: shipment.routeId || '',
      packageId: shipment.packageId || 'none',
      materialId: shipment.materialId || 'none',
      billingRatePerTon: shipment.billingRatePerTon || null,
      vendorRatePerTon: shipment.vendorRatePerTon || null,
    });
    
    setOpenDialog(true);
  };

  const handleAddShipment = () => {
    setSelectedShipment(null);
    resetForm();
    setOpenDialog(true);
  };

  const resetForm = () => {
    // Use the current date and time as default for new shipments
    const now = new Date();
    const formattedNow = now.toISOString().slice(0, 16);
    
    setFormData({
      transporterId: '',
      vehicleId: '',
      source: '',
      destination: '',
      quantityTons: '',
      status: 'Pending',
      departureTime: formattedNow,
      arrivalTime: '',
      remarks: '',
      routeId: '',
      packageId: 'none',
      materialId: 'none',
      billingRatePerTon: null,
      vendorRatePerTon: null,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.transporterId) {
      toast.error('Please select a transporter');
      return;
    }
    
    if (!formData.vehicleId) {
      toast.error('Please select a vehicle');
      return;
    }
    
    if (!formData.source || !formData.destination) {
      toast.error('Source and destination are required');
      return;
    }
    
    if (!formData.quantityTons) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    const shipmentData = {
      transporterId: formData.transporterId,
      vehicleId: formData.vehicleId,
      source: formData.source,
      destination: formData.destination,
      quantityTons: Number(parseFloat(formData.quantityTons).toFixed(5)),
      status: formData.status,
      departureTime: formData.departureTime,
      arrivalTime: formData.arrivalTime || null,
      remarks: formData.remarks,
      routeId: formData.routeId || undefined,
      packageId: formData.packageId === 'none' ? undefined : formData.packageId,
      materialId: formData.materialId === 'none' ? undefined : formData.materialId,
      billingRatePerTon: formData.billingRatePerTon,
      vendorRatePerTon: formData.vendorRatePerTon,
    };
    
    if (selectedShipment) {
      updateShipmentMutation.mutate({
        id: selectedShipment.id,
        ...shipmentData
      });
    } else {
      addShipmentMutation.mutate(shipmentData as Omit<Shipment, 'id'>);
    }
  };

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
    materials,
  };
};
