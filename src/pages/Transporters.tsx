
import React, { useState } from 'react';
import PageTransition from '@/components/ui-custom/PageTransition';
import DataTable from '@/components/ui-custom/DataTable';
import { transporters, Transporter } from '@/lib/data';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Edit, Trash, User, Phone, MapPin, Building, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const Transporters = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const isMobile = useIsMobile();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    gstn: '',
    contactPerson: '',
    contactNumber: '',
    address: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditTransporter = (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setFormData({
      name: transporter.name,
      gstn: transporter.gstn,
      contactPerson: transporter.contactPerson,
      contactNumber: transporter.contactNumber,
      address: transporter.address,
    });
    setOpenDialog(true);
  };

  const handleAddTransporter = () => {
    setSelectedTransporter(null);
    setFormData({
      name: '',
      gstn: '',
      contactPerson: '',
      contactNumber: '',
      address: '',
    });
    setOpenDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This would typically send data to your backend
    // For demo purposes, we're just showing a toast
    toast.success(
      selectedTransporter 
        ? `Transporter "${formData.name}" updated successfully` 
        : `Transporter "${formData.name}" added successfully`
    );
    setOpenDialog(false);
  };

  // Columns for the data table
  const columns = [
    {
      header: 'ID',
      accessorKey: 'id',
    },
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'GST Number',
      accessorKey: 'gstn',
    },
    {
      header: 'Contact Person',
      accessorKey: 'contactPerson',
    },
    {
      header: 'Phone',
      accessorKey: 'contactNumber',
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      cell: (row: Transporter) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handleEditTransporter(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => toast.info(`Delete functionality would remove ${row.name}`)}
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
        ['ID', 'Name', 'Actions'].includes(col.header)
      )
    : columns;

  return (
    <PageTransition>
      <div className="container py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transporters</h1>
            <p className="text-muted-foreground">
              Manage transport companies and their details
            </p>
          </div>
          <Button onClick={handleAddTransporter}>
            <Plus className="mr-2 h-4 w-4" /> Add Transporter
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transporters List</CardTitle>
            <CardDescription>
              View and manage all registered transporters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={transporters}
              columns={mobileColumns}
              searchKey="name"
              searchPlaceholder="Search transporters..."
            />
          </CardContent>
        </Card>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedTransporter ? 'Edit Transporter' : 'Add New Transporter'}
              </DialogTitle>
              <DialogDescription>
                Fill in the details for the transport company
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter company name"
                      className="pl-10"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstn">GST Number</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="gstn"
                      name="gstn"
                      placeholder="Enter GST number"
                      className="pl-10"
                      value={formData.gstn}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      placeholder="Enter contact person"
                      className="pl-10"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      placeholder="Enter contact number"
                      className="pl-10"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                  <Input
                    id="address"
                    name="address"
                    placeholder="Enter company address"
                    className="pl-10"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedTransporter ? 'Update' : 'Add'} Transporter
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default Transporters;
