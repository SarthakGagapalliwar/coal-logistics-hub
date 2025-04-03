
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { usePackages } from '@/hooks/use-packages';
import { useRoutes } from '@/hooks/use-routes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

// Form schema for package creation/update
const packageSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
  weightKg: z.coerce.number().positive({ message: "Weight must be positive." }),
  dimensions: z.string().optional(),
  status: z.string(),
  routeId: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  trackingNumber: z.string().optional(),
  vendorRate: z.coerce.number().optional().nullable(),
  billingRate: z.coerce.number().optional().nullable(),
});

type PackageFormValues = z.infer<typeof packageSchema>;

const PackageForm = () => {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { selectedPackage, addPackageMutation, updatePackageMutation } = usePackages();
  const { routes } = useRoutes();
  const [routeRates, setRouteRates] = useState<{ billing: number | null, vendor: number | null }>({ billing: null, vendor: null });

  // Fetch all users for user assignment (admin only)
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!isAdmin || !isAuthenticated) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username');
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && isAuthenticated,
  });
  
  // Initialize form with default values or selected package
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: '',
      description: '',
      weightKg: 0,
      dimensions: '',
      status: 'pending',
      routeId: null,
      assignedUserId: null,
      trackingNumber: '',
      vendorRate: null,
      billingRate: null,
    },
  });

  // Update form values when selected package changes
  useEffect(() => {
    if (selectedPackage) {
      form.reset({
        name: selectedPackage.name,
        description: selectedPackage.description || '',
        weightKg: selectedPackage.weightKg,
        dimensions: selectedPackage.dimensions || '',
        status: selectedPackage.status,
        routeId: selectedPackage.routeId || null,
        assignedUserId: selectedPackage.assignedUserId || null,
        trackingNumber: selectedPackage.trackingNumber || '',
        vendorRate: selectedPackage.vendorRate || null,
        billingRate: selectedPackage.billingRate || null,
      });
      
      // If route is selected, update rate values
      if (selectedPackage.routeId) {
        const selectedRoute = routes.find(r => r.id === selectedPackage.routeId);
        if (selectedRoute) {
          setRouteRates({
            billing: selectedRoute.billingRatePerTon,
            vendor: selectedRoute.vendorRatePerTon,
          });
        }
      }
    }
  }, [selectedPackage, routes, form]);

  // Handle route change to update rate values
  const handleRouteChange = (routeId: string) => {
    const selectedRoute = routes.find(r => r.id === routeId);
    if (selectedRoute) {
      setRouteRates({
        billing: selectedRoute.billingRatePerTon,
        vendor: selectedRoute.vendorRatePerTon,
      });
      
      form.setValue('vendorRate', selectedRoute.vendorRatePerTon);
      form.setValue('billingRate', selectedRoute.billingRatePerTon);
    } else {
      setRouteRates({ billing: null, vendor: null });
      form.setValue('vendorRate', null);
      form.setValue('billingRate', null);
    }
  };

  // Handle form submission
  const onSubmit = (values: PackageFormValues) => {
    // Ensure required fields are present
    const packageData = {
      name: values.name,
      description: values.description,
      weightKg: values.weightKg,
      dimensions: values.dimensions,
      status: values.status,
      routeId: values.routeId,
      assignedUserId: values.assignedUserId,
      trackingNumber: values.trackingNumber,
      vendorRate: values.vendorRate,
      billingRate: values.billingRate,
    };

    if (selectedPackage) {
      // Update existing package
      updatePackageMutation.mutate({
        id: selectedPackage.id,
        ...packageData,
      });
    } else {
      // Create new package
      addPackageMutation.mutate(packageData);
    }
  };

  const isSubmitting = addPackageMutation.isPending || updatePackageMutation.isPending;

  // Generate a random tracking number
  const generateTrackingNumber = () => {
    const prefix = 'PKG';
    const randomPart = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    const trackingNumber = `${prefix}${randomPart}`;
    form.setValue('trackingNumber', trackingNumber);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-lg font-semibold">
          {selectedPackage ? 'Edit Package' : 'Add New Package'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Package Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="trackingNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking Number</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={generateTrackingNumber}
                  >
                    Generate
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="weightKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (kg)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="dimensions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dimensions (L×W×H cm)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 30×20×10" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="routeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Route</FormLabel>
                <Select 
                  value={field.value || ""} 
                  onValueChange={(value) => {
                    field.onChange(value === "none" ? null : value);
                    if (value !== "none") handleRouteChange(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.source} to {route.destination} ({route.distanceKm} km)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {isAdmin && (
            <FormField
              control={form.control}
              name="assignedUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign User</FormLabel>
                  <Select 
                    value={field.value || ""} 
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vendorRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Rate</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    value={field.value === null ? '' : field.value} 
                    onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </FormControl>
                {routeRates.vendor !== null && (
                  <p className="text-xs text-muted-foreground">
                    Route vendor rate: {routeRates.vendor}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="billingRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Rate</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    value={field.value === null ? '' : field.value} 
                    onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </FormControl>
                {routeRates.billing !== null && (
                  <p className="text-xs text-muted-foreground">
                    Route billing rate: {routeRates.billing}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedPackage ? 'Update Package' : 'Create Package'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PackageForm;
