
import React from 'react';
import { Helmet } from 'react-helmet';
import PageTransition from '@/components/ui-custom/PageTransition';
import DataTable from '@/components/ui-custom/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Edit, Trash, MapPin, Route as RouteIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRoutes } from '@/hooks/use-routes';
import { formatCurrency } from '@/lib/data';

const Routes = () => {
  const {
    routes,
    isLoading,
    openDialog,
    setOpenDialog,
    selectedRoute,
    formData,
    handleInputChange,
    handleEditRoute,
    handleAddRoute,
    handleSubmit,
    handleDeleteRoute,
    isSubmitting,
    isDeleting
  } = useRoutes();
  
  const isMobile = useIsMobile();

  // Columns for the data table
  const columns = [
    {
      header: 'ID',
      accessorKey: 'id',
    },
    {
      header: 'Source',
      accessorKey: 'source',
    },
    {
      header: 'Destination',
      accessorKey: 'destination',
    },
    {
      header: 'Distance',
      accessorKey: 'distanceKm',
      cell: (row: any) => `${row.distanceKm} km`,
    },
    {
      header: 'Billing Rate',
      accessorKey: 'billingRatePerTon',
      cell: (row: any) => formatCurrency(row.billingRatePerTon),
    },
    {
      header: 'Vendor Rate',
      accessorKey: 'vendorRatePerTon',
      cell: (row: any) => formatCurrency(row.vendorRatePerTon),
    },
    {
      header: 'Est. Time',
      accessorKey: 'estimatedTime',
      cell: (row: any) => `${row.estimatedTime} hrs`,
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handleEditRoute(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDeleteRoute(row.id)}
            disabled={isDeleting}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // For mobile, show fewer columns
  const mobileColumns = isMobile
    ? columns.filter(col => 
        ['Source', 'Destination', 'Distance', 'Actions'].includes(col.header)
      )
    : columns;

  return (
    <PageTransition>
      <Helmet>
        <title>Routes | Coal Logistics Hub</title>
      </Helmet>
      <div className="container py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
            <p className="text-muted-foreground">
              Manage transportation routes and rates
            </p>
          </div>
          <Button onClick={handleAddRoute}>
            <Plus className="mr-2 h-4 w-4" /> Add Route
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Routes List</CardTitle>
            <CardDescription>
              View and manage all defined transportation routes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <DataTable
                data={routes}
                columns={mobileColumns}
                searchKey="source"
                searchPlaceholder="Search by source location..."
              />
            )}
          </CardContent>
        </Card>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedRoute ? 'Edit Route' : 'Add New Route'}
              </DialogTitle>
              <DialogDescription>
                Fill in the details for the transportation route
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Source Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="source"
                      name="source"
                      placeholder="Enter source location"
                      className="pl-10"
                      value={formData.source}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination">Destination Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="destination"
                      name="destination"
                      placeholder="Enter destination location"
                      className="pl-10"
                      value={formData.destination}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distanceKm">Distance (km)</Label>
                  <div className="relative">
                    <RouteIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="distanceKm"
                      name="distanceKm"
                      type="number"
                      min="1"
                      placeholder="Enter distance in km"
                      className="pl-10"
                      value={formData.distanceKm}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedTime">Estimated Time (hours)</Label>
                  <Input
                    id="estimatedTime"
                    name="estimatedTime"
                    type="number"
                    min="1"
                    step="0.5"
                    placeholder="Enter estimated time in hours"
                    value={formData.estimatedTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billingRatePerTon">Billing Rate (₹ per ton)</Label>
                  <Input
                    id="billingRatePerTon"
                    name="billingRatePerTon"
                    type="number"
                    min="1"
                    placeholder="Enter billing rate per ton"
                    value={formData.billingRatePerTon}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorRatePerTon">Vendor Rate (₹ per ton)</Label>
                  <Input
                    id="vendorRatePerTon"
                    name="vendorRatePerTon"
                    type="number"
                    min="1"
                    placeholder="Enter vendor rate per ton"
                    value={formData.vendorRatePerTon}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                      {selectedRoute ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>{selectedRoute ? 'Update' : 'Add'} Route</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default Routes;
