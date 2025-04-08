import React, { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Plus,
  Edit,
  Trash,
  User,
  Mail,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/context/AuthContext';
import { Column } from '@/types/data-table';
import { toast } from 'sonner';

const UserManagement = () => {
  const {
    users,
    isLoading,
    openDialog,
    setOpenDialog,
    selectedUser,
    formData,
    setFormData,
    handleInputChange,
    handleSelectChange,
    handleEditUser,
    handleAddUser,
    handleSubmit,
    deleteUserMutation,
    updateUserMutation,
    addUserMutation,
    isSubmitting,
  } = useUsers();

  const isMobile = useIsMobile();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId]);
    } else {
      setSelectedUsers((prev) => prev.filter(id => id !== userId));
    }
  };

  const handleDeleteSelected = () => {
    selectedUsers.forEach((userId) => {
      deleteUserMutation.mutate(userId);
    });
    setSelectedUsers([]);
  };

  const columns: Column[] = [
    {
      header: 'Name',
      accessorKey: 'name',
      cell: (row: any) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: (row: any) => (
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4" />
          <span>{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'role',
    },
    {
      header: 'Status',
      accessorKey: 'is_active',
      cell: (row: any) => (
        <div className="flex items-center space-x-2">
          {row.is_active ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Active</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Inactive</span>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isAdmin) {
    columns.unshift({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(event) => {
            table.toggleAllPageRowsSelected(event.target.checked);
            if (event.target.checked) {
              const allUserIds = table.getRowModel().rows.map((row: any) => row.original.id);
              setSelectedUsers(allUserIds);
            } else {
              setSelectedUsers([]);
            }
          }}
          className="translate-y-[2px] rounded-sm"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(event) => {
            row.toggleSelected(event.target.checked);
            handleSelectUser(row.original.id, event.target.checked);
          }}
          className="translate-y-[2px] rounded-sm"
        />
      ),
      enableSorting: false,
      enableHiding: false
    });

    columns.push({
      header: 'Actions',
      accessorKey: 'actions',
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleEditUser(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  const mobileColumns = isMobile
    ? columns.filter((col) =>
        ['Name', 'Email', 'Role', 'Actions'].includes(col.header as string)
      )
    : columns;

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>User Management | Coal Logistics Hub</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                User Management
              </h1>
              <p className="text-muted-foreground">
                Manage and administer users of the application
              </p>
            </div>
            {isAdmin && (
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={selectedUsers.length === 0 || isSubmitting}
                >
                  <Trash className="mr-2 h-4 w-4" /> Delete Selected
                </Button>
                <Button onClick={handleAddUser} disabled={isSubmitting}>
                  <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users List</CardTitle>
              <CardDescription>
                View and manage all users in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <DataTable
                  data={users}
                  columns={mobileColumns}
                  searchKey="name"
                  searchPlaceholder="Search users..."
                />
              )}
            </CardContent>
          </Card>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedUser ? 'Edit User' : 'Add New User'}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the user
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter user's name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter user's email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleSelectChange('role', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!selectedUser}
                    disabled={!!selectedUser}
                  />
                  {selectedUser && (
                    <p className="text-xs text-muted-foreground">
                      Password cannot be changed for existing users.
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenDialog(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                        {selectedUser ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>{selectedUser ? 'Update' : 'Add'} User</>
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

export default UserManagement;
