
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useShipments } from '@/hooks/use-shipments';

// Type for package from database
interface DbPackage {
  id: string;
  name: string;
  status: string;
  created_by_id: string;
  billing_rate: number | null;
  vendor_rate: number | null;
  created_at: string;
  updated_at: string;
  shipment_id: string | null;
}

// Type for package in application
export interface Package {
  id: string;
  name: string;
  status: string;
  createdById: string;
  billingRate: number | null;
  vendorRate: number | null;
  shipmentId: string | null;
  shipmentSource?: string;
  shipmentDestination?: string;
  createdAt: string;
  updatedAt: string;
}

// Convert DB format to app format
const dbToAppPackage = (dbPackage: DbPackage): Package => ({
  id: dbPackage.id,
  name: dbPackage.name,
  status: dbPackage.status,
  createdById: dbPackage.created_by_id,
  billingRate: dbPackage.billing_rate,
  vendorRate: dbPackage.vendor_rate,
  shipmentId: dbPackage.shipment_id,
  createdAt: dbPackage.created_at,
  updatedAt: dbPackage.updated_at,
});

// Convert app format to DB format
const appToDbPackage = (pkg: Partial<Package>) => ({
  name: pkg.name,
  status: pkg.status,
  billing_rate: pkg.billingRate,
  vendor_rate: pkg.vendorRate,
  shipment_id: pkg.shipmentId,
});

export const usePackages = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { shipments } = useShipments();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // Query to fetch all users for admin assignment
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!user || !isAdmin) return [];
      
      console.log("Fetching all users for admin assignment");
      
      // Using the new RLS policy, admin can fetch all profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role');
        
      if (error) {
        console.error('Error fetching users:', error);
        toast.error(`Failed to fetch users: ${error.message}`);
        return [];
      }
      
      console.log("Users fetched for assignment:", data);
      console.log("Total users found:", data ? data.length : 0);
      return data || [];
    },
    enabled: !!user && isAdmin
  });

  // Query to fetch all shipments for package assignment
  const { data: allShipments = [] } = useQuery({
    queryKey: ['allShipmentsForPackages'],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching all shipments for package assignment");
      
      const { data, error } = await supabase
        .from('shipments')
        .select('id, source, destination');
      
      if (error) {
        console.error('Error fetching shipments:', error);
        toast.error(`Failed to fetch shipments: ${error.message}`);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user
  });

  // Query to fetch packages
  const { 
    data: packages = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching packages");
      
      // Fetch packages with related shipment information
      let query = supabase
        .from('packages')
        .select(`
          *,
          shipments:shipment_id (source, destination)
        `);
      
      // If not admin, only fetch packages for this user
      if (!isAdmin) {
        // Using profiles.assigned_package_id to determine which packages the user can view
        const { data: userProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('assigned_package_id')
          .eq('id', user.id);
        
        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          throw new Error(profileError.message);
        }
        
        if (userProfiles && userProfiles.length > 0 && userProfiles[0].assigned_package_id) {
          query = query.eq('id', userProfiles[0].assigned_package_id);
        } else {
          // If no packages assigned, only show packages created by the user
          query = query.eq('created_by_id', user.id);
        }
      }
      
      const { data: packagesData, error } = await query;
      
      if (error) {
        console.error('Error fetching packages:', error);
        throw new Error(error.message);
      }
      
      console.log("Packages fetched:", packagesData);
      
      // Combine all data
      return packagesData.map((item: any): Package => {
        const pkg = dbToAppPackage(item as DbPackage);
        
        // Add shipment info
        if (pkg.shipmentId && item.shipments) {
          pkg.shipmentSource = item.shipments.source;
          pkg.shipmentDestination = item.shipments.destination;
        }
        
        return pkg;
      });
    },
    enabled: !!user
  });

  // Mutation to add a new package
  const addPackageMutation = useMutation({
    mutationFn: async (newPackage: Omit<Package, 'id' | 'createdById' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const packageData = {
        ...appToDbPackage(newPackage),
        created_by_id: user.id
      };
      
      const { data, error } = await supabase
        .from('packages')
        .insert(packageData)
        .select();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(`Package added successfully`);
      setOpenDialog(false);
      setSelectedPackage(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add package: ${error.message}`);
    }
  });

  // Mutation to update a package
  const updatePackageMutation = useMutation({
    mutationFn: async (packageData: Partial<Package> & { id: string }) => {
      const { id, ...rest } = packageData;
      
      const { error } = await supabase
        .from('packages')
        .update(appToDbPackage(rest))
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return packageData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(`Package updated successfully`);
      setOpenDialog(false);
      setSelectedPackage(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update package: ${error.message}`);
    }
  });

  // Mutation to delete a package
  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(`Package deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete package: ${error.message}`);
    }
  });

  // Handle edit package
  const handleEditPackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    setOpenDialog(true);
  };

  // Handle add package
  const handleAddPackage = () => {
    setSelectedPackage(null);
    setOpenDialog(true);
  };

  // Handle delete package
  const handleDeletePackage = (id: string) => {
    deletePackageMutation.mutate(id);
  };

  return {
    packages,
    isLoading,
    error,
    openDialog,
    setOpenDialog,
    selectedPackage,
    addPackageMutation,
    updatePackageMutation,
    deletePackageMutation,
    handleEditPackage,
    handleAddPackage,
    handleDeletePackage,
    isDeleting: deletePackageMutation.isPending,
    isLoadingUsers,
    refetch,
    allUsers,
    allShipments
  };
};
