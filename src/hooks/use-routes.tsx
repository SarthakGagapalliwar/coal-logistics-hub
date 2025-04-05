
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbRoute, handleSupabaseError } from '@/lib/supabase';
import { toast } from 'sonner';
import { usePackages } from '@/hooks/use-packages';

// Type for route from database
export interface Route {
  id: string;
  source: string;
  destination: string;
  distanceKm: number;
  billingRatePerTon: number;
  vendorRatePerTon: number;
  estimatedTime: number;
  assignedPackageId?: string | null;
}

// Convert DB format to app format
const dbToAppRoute = (dbRoute: DbRoute): Route => ({
  id: dbRoute.id,
  source: dbRoute.source,
  destination: dbRoute.destination,
  distanceKm: dbRoute.distance_km,
  billingRatePerTon: dbRoute.billing_rate_per_ton,
  vendorRatePerTon: dbRoute.vendor_rate_per_ton,
  estimatedTime: dbRoute.estimated_time,
  assignedPackageId: dbRoute.assigned_package_id,
});

// Convert app format to DB format
const appToDbRoute = (route: Partial<Route>) => ({
  source: route.source,
  destination: route.destination,
  distance_km: route.distanceKm,
  billing_rate_per_ton: route.billingRatePerTon,
  vendor_rate_per_ton: route.vendorRatePerTon,
  estimated_time: route.estimatedTime,
  assigned_package_id: route.assignedPackageId,
});

export const useRoutes = () => {
  const queryClient = useQueryClient();
  const { packages } = usePackages();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    distanceKm: '',
    billingRatePerTon: '',
    vendorRatePerTon: '',
    estimatedTime: '',
    assignedPackageId: null as string | null,
  });

  // Query to fetch routes
  const { 
    data: routes = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*, packages:assigned_package_id(name)')
        .order('source');
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data.map((item: any) => {
        const route = dbToAppRoute(item as DbRoute);
        return {
          ...route,
          packageName: item.packages ? item.packages.name : null
        };
      });
    }
  });

  // Mutation to add a new route
  const addRouteMutation = useMutation({
    mutationFn: async (route: Omit<Route, 'id'>) => {
      const { data, error } = await supabase
        .from('routes')
        .insert(appToDbRoute(route))
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return dbToAppRoute(data as DbRoute);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success(`Route "${formData.source} to ${formData.destination}" added successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add route: ${error.message}`);
    }
  });

  // Mutation to update a route
  const updateRouteMutation = useMutation({
    mutationFn: async (route: Route) => {
      const { error } = await supabase
        .from('routes')
        .update(appToDbRoute(route))
        .eq('id', route.id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return route;
    },
    onSuccess: (route) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success(`Route "${route.source} to ${route.destination}" updated successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update route: ${error.message}`);
    }
  });

  // Mutation to delete a route
  const deleteRouteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      
      // Find the deleted route's name for the success message
      const deletedRoute = routes.find(r => r.id === variables);
      if (deletedRoute) {
        toast.success(`Route "${deletedRoute.source} to ${deletedRoute.destination}" deleted successfully`);
      } else {
        toast.success('Route deleted successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete route: ${error.message}`);
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle package selection
  const handlePackageChange = (packageId: string | null) => {
    setFormData(prev => ({ ...prev, assignedPackageId: packageId }));
  };

  // Set up to edit a route
  const handleEditRoute = (route: Route) => {
    setSelectedRoute(route);
    setFormData({
      source: route.source,
      destination: route.destination,
      distanceKm: route.distanceKm.toString(),
      billingRatePerTon: route.billingRatePerTon.toString(),
      vendorRatePerTon: route.vendorRatePerTon.toString(),
      estimatedTime: route.estimatedTime.toString(),
      assignedPackageId: route.assignedPackageId || null,
    });
    setOpenDialog(true);
  };

  // Set up to add a new route
  const handleAddRoute = () => {
    setSelectedRoute(null);
    resetForm();
    setOpenDialog(true);
  };

  // Reset the form
  const resetForm = () => {
    setFormData({
      source: '',
      destination: '',
      distanceKm: '',
      billingRatePerTon: '',
      vendorRatePerTon: '',
      estimatedTime: '',
      assignedPackageId: null,
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const routeData = {
      source: formData.source,
      destination: formData.destination,
      distanceKm: Number(formData.distanceKm),
      billingRatePerTon: Number(formData.billingRatePerTon),
      vendorRatePerTon: Number(formData.vendorRatePerTon),
      estimatedTime: Number(formData.estimatedTime),
      assignedPackageId: formData.assignedPackageId,
    };
    
    if (selectedRoute) {
      // Update existing route
      updateRouteMutation.mutate({
        id: selectedRoute.id,
        ...routeData
      });
    } else {
      // Add new route
      addRouteMutation.mutate(routeData as Omit<Route, 'id'>);
    }
  };

  // Handle route deletion
  const handleDeleteRoute = (id: string) => {
    deleteRouteMutation.mutate(id);
  };

  // Get package details by ID
  const getPackageById = (packageId: string | null | undefined) => {
    if (!packageId) return null;
    return packages.find(pkg => pkg.id === packageId);
  };

  return {
    routes,
    isLoading,
    error,
    openDialog,
    setOpenDialog,
    selectedRoute,
    formData,
    handleInputChange,
    handlePackageChange,
    handleEditRoute,
    handleAddRoute,
    handleSubmit,
    handleDeleteRoute,
    isSubmitting: addRouteMutation.isPending || updateRouteMutation.isPending,
    isDeleting: deleteRouteMutation.isPending,
    packages,
    getPackageById,
  };
};
