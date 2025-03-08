
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbShipment, handleSupabaseError } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTransporters, Transporter } from './use-transporters';

// Type for our app's shipment format
export interface Shipment {
  id: string;
  transporterId: string;
  transporterName: string;
  vehicleId: string;
  vehicleNumber: string;
  source: string;
  destination: string;
  quantityTons: number;
  status: 'Scheduled' | 'In Transit' | 'Delivered' | 'Delayed' | 'Cancelled';
  departureTime: string;
  arrivalTime: string | null;
  remarks: string;
}

// Convert DB format to app format
const dbToAppShipment = async (dbShipment: DbShipment): Promise<Shipment> => {
  // Fetch transporter name
  const { data: transporterData } = await supabase
    .from('transporters')
    .select('name')
    .eq('id', dbShipment.transporter_id)
    .single();
    
  // Fetch vehicle number
  const { data: vehicleData } = await supabase
    .from('vehicles')
    .select('vehicle_number')
    .eq('id', dbShipment.vehicle_id)
    .single();
  
  return {
    id: dbShipment.id,
    transporterId: dbShipment.transporter_id,
    transporterName: transporterData?.name || 'Unknown',
    vehicleId: dbShipment.vehicle_id,
    vehicleNumber: vehicleData?.vehicle_number || 'Unknown',
    source: dbShipment.source,
    destination: dbShipment.destination,
    quantityTons: dbShipment.quantity_tons,
    status: dbShipment.status as Shipment['status'],
    departureTime: dbShipment.departure_time,
    arrivalTime: dbShipment.arrival_time,
    remarks: dbShipment.remarks || '',
  };
};

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
  
  const [formData, setFormData] = useState({
    transporterId: '',
    vehicleId: '',
    source: '',
    destination: '',
    quantityTons: '',
    status: 'Scheduled',
    departureTime: '',
    remarks: '',
  });

  // Query to fetch available vehicles for a selected transporter
  const { data: availableVehicles = [] } = useQuery({
    queryKey: ['vehicles', formData.transporterId],
    queryFn: async () => {
      if (!formData.transporterId) return [];
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('transporter_id', formData.transporterId)
        .eq('status', 'Available');
      
      if (error) throw new Error(error.message);
      
      return data || [];
    },
    enabled: !!formData.transporterId,
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
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Convert all DB shipments to app format
      const appShipments = await Promise.all(
        (data as DbShipment[]).map(dbToAppShipment)
      );
      
      return appShipments;
    }
  });

  // Mutation to add a new shipment
  const addShipmentMutation = useMutation({
    mutationFn: async (shipment: Omit<Shipment, 'id' | 'transporterName' | 'vehicleNumber' | 'arrivalTime'>) => {
      // First, update the vehicle status to "In Transit"
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'In Transit' })
        .eq('id', shipment.vehicleId);
      
      if (vehicleError) {
        throw new Error(`Failed to update vehicle status: ${vehicleError.message}`);
      }
      
      // Then create the shipment
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          ...appToDbShipment(shipment),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        // Revert vehicle status if shipment creation fails
        await supabase
          .from('vehicles')
          .update({ status: 'Available' })
          .eq('id', shipment.vehicleId);
          
        throw new Error(error.message);
      }
      
      return await dbToAppShipment(data as DbShipment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Shipment created successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create shipment: ${error.message}`);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success(`Shipment updated successfully`);
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
      // First get the shipment to know which vehicle to update
      const { data: shipmentData, error: fetchError } = await supabase
        .from('shipments')
        .select('vehicle_id')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      // Update the vehicle status back to "Available"
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'Available' })
        .eq('id', shipmentData.vehicle_id);
      
      if (vehicleError) {
        throw new Error(`Failed to update vehicle status: ${vehicleError.message}`);
      }
      
      // Delete the shipment
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Shipment deleted successfully');
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
    
    // Reset vehicle selection if transporter changes
    if (name === 'transporterId') {
      setFormData(prev => ({ ...prev, vehicleId: '' }));
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
      status: 'Scheduled',
      departureTime: new Date().toISOString().slice(0, 16),
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
      status: formData.status as Shipment['status'],
      departureTime: formData.departureTime,
      remarks: formData.remarks,
    };
    
    if (selectedShipment) {
      // Update existing shipment
      updateShipmentMutation.mutate({
        ...selectedShipment,
        ...shipmentData,
      });
    } else {
      // Add new shipment
      addShipmentMutation.mutate(shipmentData as Omit<Shipment, 'id' | 'transporterName' | 'vehicleNumber' | 'arrivalTime'>);
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
    transporters,
    availableVehicles,
    handleInputChange,
    handleSelectChange,
    handleEditShipment,
    handleAddShipment,
    handleSubmit,
    handleDeleteShipment,
    isSubmitting: addShipmentMutation.isPending || updateShipmentMutation.isPending,
    isDeleting: deleteShipmentMutation.isPending,
  };
};
