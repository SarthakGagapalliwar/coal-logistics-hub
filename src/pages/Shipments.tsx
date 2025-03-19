import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import PageTransition from "@/components/ui-custom/PageTransition";
import DataTable from "@/components/ui-custom/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Edit,
  Trash,
  MapPin,
  Truck,
  Weight,
  Calendar,
} from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useShipments } from "@/hooks/use-shipments";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

const Shipments = () => {
  const {
    shipments,
    isLoading,
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
    isSubmitting,
    isDeleting,
    transporters,
    vehicles,
    routes,
  } = useShipments();

  const isMobile = useIsMobile();

  const { user } = useAuth();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not arrived";
    try {
      return format(new Date(dateString), "MMM d, yyyy HH:mm");
    } catch (error) {
      return "Invalid date";
    }
  };

  const columns = [
    {
      header: "ID",
      accessorKey: "id",
    },
    {
      header: "Source",
      accessorKey: "source",
    },
    {
      header: "Destination",
      accessorKey: "destination",
    },
    {
      header: "Transporter",
      accessorKey: "transporterName",
    },
    {
      header: "Vehicle",
      accessorKey: "vehicleNumber",
    },
    {
      header: "Quantity",
      accessorKey: "quantityTons",
      cell: (row: any) => `${row.quantityTons} tons`,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === "Completed"
              ? "bg-green-100 text-green-800"
              : row.status === "In Transit"
              ? "bg-blue-100 text-blue-800"
              : row.status === "Pending"
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Departure",
      accessorKey: "departureTime",
      cell: (row: any) => formatDate(row.departureTime),
    },
    {
      header: "Arrival",
      accessorKey: "arrivalTime",
      cell: (row: any) => formatDate(row.arrivalTime),
    },
  ];

  if (user?.role === "admin") {
    columns.push({
      header: "Actions",
      accessorKey: "actions",
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleEditShipment(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDeleteShipment(row.id)}
            disabled={isDeleting}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  const mobileColumns = isMobile
    ? columns.filter((col) =>
        ["Source", "Destination", "Status", "Actions"].includes(col.header)
      )
    : columns;

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Shipments | Coal Logistics Hub</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
              <p className="text-muted-foreground">
                Manage and track all coal shipments
              </p>
            </div>
            {user?.role === "admin" ? (
              <Button onClick={handleAddShipment}>
                <Plus className="mr-2 h-4 w-4" /> Add Shipment
              </Button>
            ) : (
              <div></div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Shipments List</CardTitle>
              <CardDescription>
                View and manage all coal shipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <DataTable
                  data={shipments}
                  columns={mobileColumns}
                  searchKey="source"
                  searchPlaceholder="Search shipments..."
                />
              )}
            </CardContent>
          </Card>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedShipment ? "Edit Shipment" : "Add New Shipment"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the shipment
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="routeId">Route (Optional)</Label>
                    <Select
                      value={formData.routeId}
                      onValueChange={(value) =>
                        handleSelectChange("routeId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a predefined route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map((route) => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.source} to {route.destination}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecting a route will auto-fill source and destination
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
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
                    <Label htmlFor="destination">Destination</Label>
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
                    <Label htmlFor="transporterId">Transporter</Label>
                    <Select
                      value={formData.transporterId}
                      onValueChange={(value) =>
                        handleSelectChange("transporterId", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transporter" />
                      </SelectTrigger>
                      <SelectContent>
                        {transporters.map((transporter) => (
                          <SelectItem
                            key={transporter.id}
                            value={transporter.id}
                          >
                            {transporter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleId">Vehicle</Label>
                    <Select
                      value={formData.vehicleId}
                      onValueChange={(value) =>
                        handleSelectChange("vehicleId", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles
                          .filter(
                            (v) =>
                              !formData.transporterId ||
                              v.transporterId === formData.transporterId
                          )
                          .map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicleNumber} ({vehicle.vehicleType})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantityTons">Quantity (tons)</Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="quantityTons"
                        name="quantityTons"
                        type="number"
                        min="1"
                        placeholder="Enter quantity in tons"
                        className="pl-10"
                        value={formData.quantityTons}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleSelectChange("status", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="departureTime">Departure Time</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="departureTime"
                        name="departureTime"
                        type="datetime-local"
                        className="pl-10"
                        value={
                          formData.departureTime
                            ? new Date(formData.departureTime)
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "";
                          setFormData((prev) => ({
                            ...prev,
                            departureTime: date,
                          }));
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrivalTime">Arrival Time (Optional)</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="arrivalTime"
                        name="arrivalTime"
                        type="datetime-local"
                        className="pl-10"
                        value={
                          formData.arrivalTime
                            ? new Date(formData.arrivalTime)
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "";
                          setFormData((prev) => ({
                            ...prev,
                            arrivalTime: date,
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Textarea
                    id="remarks"
                    name="remarks"
                    placeholder="Enter any additional notes or remarks"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                        {selectedShipment ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{selectedShipment ? "Update" : "Add"} Shipment</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Shipments;
