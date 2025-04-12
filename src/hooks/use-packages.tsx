import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

// Type for package from database
interface DbPackage {
  id: string;
  name: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

// Type for package in application
export interface Package {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// Convert DB format to app format
const dbToAppPackage = (dbPackage: DbPackage): Package => ({
  id: dbPackage.id,
  name: dbPackage.name,
  createdById: dbPackage.created_by_id,
  createdAt: dbPackage.created_at,
  updatedAt: dbPackage.updated_at,
});

// Convert app format to DB format
const appToDbPackage = (pkg: Partial<Package>) => ({
  name: pkg.name,
});

// Isolate the data fetching function
export const fetchPackages = async () => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('packages')
    .select('*');
  
  if (error) {
    console.error('Error fetching packages:', error);
    throw new Error(error.message);
  }
  
  return (data as DbPackage[]).map(dbToAppPackage);
};

export const usePackages = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
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

  // Query to fetch packages
  const { 
    data: packages = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['packages'],
    queryFn: fetchPackages,
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
      
      console.log("Adding package with data:", packageData);
      
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
      
      // Convert to DB format for the update operation
      const dbData = appToDbPackage(rest);
      
      console.log("Updating package with ID:", id, "Data:", dbData);
      
      const { data, error } = await supabase
        .from('packages')
        .update(dbData)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error("Error updating package:", error);
        throw new Error(error.message);
      }
      
      return data && data[0] ? dbToAppPackage(data[0] as DbPackage) : packageData;
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
    console.log("Setting selected package for edit:", pkg);
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
    allUsers
  };
};
