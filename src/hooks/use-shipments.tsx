import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbShipment, handleSupabaseError } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTransporters } from './use-transporters';
import { useVehicles } from './use-vehicles';
import { useRoutes } from './use-routes';

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
});

// Convert app format to DB format
const appToDbShipment = (shipment: Partial<Shipment>) => ({
  transporter_id: shipment.transporterId,
  vehicle_id: shipment.vehicleId,
  source: shipment.source,
  destination: shipment.destination,
  quantity_tons: shipment.quantityTons,
  status: shipment.status,
  departure_time: shipment.departureTime,
  arrival_time: shipment.arrivalTime,
  remarks: shipment.remarks,
});

export const useShipments = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  
  const { transporters } = useTransporters();
  const { vehicles } = useVehicles();
  const { routes } = useRoutes();
  
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
  });

  // Query to fetch shipments
  const { 
    data: shipments = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
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
      
      return data.map((shipment: any) => ({
        ...dbToAppShipment(shipment),
        transporterName: shipment.transporters?.name || 'Unknown',
        vehicleNumber: shipment.vehicles?.vehicle_number || 'Unknown',
      }));
    }
  });

  // Mutation to add a new shipment
  const addShipmentMutation = useMutation({
    mutationFn: async (shipment: Omit<Shipment, 'id'>) => {
      const { data, error } = await supabase
        .from('shipments')
        .insert(appToDbShipment(shipment))
        .select(`
          *,
          transporters:transporter_id (name),
          vehicles:vehicle_id (vehicle_number)
        `)
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return {
        ...dbToAppShipment(data),
        transporterName: data.transporters?.name || 'Unknown',
        vehicleNumber: data.vehicles?.vehicle_number || 'Unknown',
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
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
      const { error } = await supabase
        .from('shipments')
        .update(appToDbShipment(shipment))
        .eq('id', shipment.id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return shipment;
    },
    onSuccess: (shipment) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
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
    
    // If we're selecting a route, auto-fill source and destination
    if (name === 'routeId') {
      const selectedRoute = routes.find(route => route.id === value);
      if (selectedRoute) {
        setFormData(prev => ({
          ...prev,
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

  // Handle shipment deletion
  const handleDeleteShipment = (id: string) => {
    deleteShipmentMutation.mutate(id);
  };

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
    handleDeleteShipment,
    isSubmitting: addShipmentMutation.isPending || updateShipmentMutation.isPending,
    isDeleting: deleteShipmentMutation.isPending,
    transporters,
    vehicles,
    routes,
  };
};
