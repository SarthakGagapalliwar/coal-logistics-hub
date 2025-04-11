import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui-custom/DataTable";
import { Plus, Pencil } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { usePackages } from "@/hooks/use-packages";
import PackageForm from "@/components/packages/PackageForm";
import PageTransition from "@/components/ui-custom/PageTransition";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Packages = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { 
    packages, 
    isLoading, 
    openDialog, 
    setOpenDialog, 
    selectedPackage, 
    handleAddPackage, 
    handleEditPackage,
  } = usePackages();
  
  const columns = [
    { header: "Name", accessorKey: "name" },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={() => handleEditPackage(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const getTitle = () => {
    if (isAdmin) {
      return "Package Management";
    }
    return "My Assigned Packages";
  };

  const getDescription = () => {
    if (isAdmin) {
      return "Manage all packages in the system";
    }
    return "View packages assigned to you";
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{getTitle()}</h1>
            {isAdmin && (
              <Button onClick={handleAddPackage}>
                <Plus className="mr-2 h-4 w-4" /> Add Package
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{isAdmin ? "All Packages" : "My Packages"}</CardTitle>
              <CardDescription>{getDescription()}</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={packages}
                columns={columns}
                searchPlaceholder="Search packages..."
                searchKey="name"
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-[600px]">
              <PackageForm />
            </DialogContent>
          </Dialog>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Packages;
