
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

// Type for package from database
interface DbPackage {
  id: string;
  name: string;
  description: string | null;
  weight_kg: number;
  dimensions: string | null;
  status: string;
  route_id: string | null;
  assigned_user_id: string | null;
  created_by_id: string;
  billing_rate: number | null;
  vendor_rate: number | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

// Type for package in application
export interface Package {
  id: string;
  name: string;
  description: string | null;
  weightKg: number;
  dimensions: string | null;
  status: string;
  routeId: string | null;
  routeName?: string;
  source?: string;
  destination?: string;
  assignedUserId: string | null;
  assignedUsername?: string;
  createdById: string;
  billingRate: number | null;
  vendorRate: number | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

// Convert DB format to app format
const dbToAppPackage = (dbPackage: DbPackage): Package => ({
  id: dbPackage.id,
  name: dbPackage.name,
  description: dbPackage.description,
  weightKg: dbPackage.weight_kg,
  dimensions: dbPackage.dimensions,
  status: dbPackage.status,
  routeId: dbPackage.route_id,
  assignedUserId: dbPackage.assigned_user_id,
  createdById: dbPackage.created_by_id,
  billingRate: dbPackage.billing_rate,
  vendorRate: dbPackage.vendor_rate,
  trackingNumber: dbPackage.tracking_number,
  createdAt: dbPackage.created_at,
  updatedAt: dbPackage.updated_at,
});

// Convert app format to DB format
const appToDbPackage = (pkg: Partial<Package>) => ({
  name: pkg.name,
  description: pkg.description,
  weight_kg: pkg.weightKg,
  dimensions: pkg.dimensions,
  status: pkg.status,
  route_id: pkg.routeId,
  assigned_user_id: pkg.assignedUserId,
  billing_rate: pkg.billingRate,
  vendor_rate: pkg.vendorRate,
  tracking_number: pkg.trackingNumber,
});

export const usePackages = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // Fetch all users for admin assignment
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
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching packages");
      
      // Step 1: Get packages with route information
      let query = supabase
        .from('packages')
        .select(`*`);
      
      // If not admin, only fetch packages for this user
      if (!isAdmin) {
        query = query.or(`assigned_user_id.eq.${user.id},created_by_id.eq.${user.id}`);
      }
      
      const { data: packagesData, error } = await query;
      
      if (error) {
        console.error('Error fetching packages:', error);
        throw new Error(error.message);
      }
      
      console.log("Packages fetched:", packagesData);
      
      // Step 2: Fetch route information separately
      const routeIds = packagesData
        .map((pkg: any) => pkg.route_id)
        .filter((id: string | null) => id !== null);
        
      let routesData = [];
      if (routeIds.length > 0) {
        const { data: routes, error: routesError } = await supabase
          .from('routes')
          .select('id, source, destination')
          .in('id', routeIds);
          
        if (routesError) {
          console.error('Error fetching routes:', routesError);
        } else {
          routesData = routes || [];
          console.log("Routes fetched:", routesData);
        }
      }
      
      // Step 3: Fetch user information separately
      const userIds = packagesData
        .map((pkg: any) => pkg.assigned_user_id)
        .filter((id: string | null) => id !== null);
        
      let usersData = [];
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
          
        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else {
          usersData = users || [];
          console.log("Users fetched for packages:", usersData);
        }
      }
      
      // Create maps for quick lookups
      const routeMap = routesData.reduce((map: Record<string, any>, route: any) => {
        map[route.id] = route;
        return map;
      }, {});
      
      const userMap = usersData.reduce((map: Record<string, string>, user: any) => {
        map[user.id] = user.username;
        return map;
      }, {});
      
      // Combine all data
      return packagesData.map((item: any): Package => {
        const pkg = dbToAppPackage(item as DbPackage);
        
        // Add route info
        if (pkg.routeId && routeMap[pkg.routeId]) {
          const route = routeMap[pkg.routeId];
          pkg.routeName = `${route.source} to ${route.destination}`;
          pkg.source = route.source;
          pkg.destination = route.destination;
        }
        
        // Add user info
        if (pkg.assignedUserId && userMap[pkg.assignedUserId]) {
          pkg.assignedUsername = userMap[pkg.assignedUserId];
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
    allUsers
  };
};
