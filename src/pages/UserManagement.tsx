import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePackages } from "@/hooks/use-packages";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserRole } from "@/context/AuthContext";
import { Edit, Trash } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  created_at: string;
  assigned_packages?: string[] | null;
  password?: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { user, createUser } = useAuth();
  const { packages } = usePackages();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    role: "user" as UserRole,
    assigned_packages: [] as string[],
  });
  const [editFormData, setEditFormData] = useState({
    assigned_packages: [] as string[],
  });

  useEffect(() => {
    if (user && user.role !== "admin") {
      toast.error("You don't have permission to access this page");
      navigate("/dashboard");
    } else {
      fetchUsers();
    }
  }, [user, navigate]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching users from profiles table...");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, role, created_at, assigned_packages")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      console.log("Profiles data fetched:", data);

      const emailsData = await Promise.all(
        data.map(async (profile) => {
          try {
            const { data: userData, error: userError } = await supabase
              .rpc('get_user_email', { user_id: profile.id })
              .select('email')
              .single();

            return {
              id: profile.id,
              email: userData?.email || `${profile.username}@example.com`,
            };
          } catch (err) {
            console.error("Error fetching email for user:", err);
            return {
              id: profile.id,
              email: `${profile.username}@example.com`,
            };
          }
        })
      );

      console.log("Emails data:", emailsData);

      const usersWithEmails = data.map((profile) => {
        const emailData = emailsData.find((e) => e.id === profile.id);
        return {
          ...profile,
          email: emailData?.email || "No email available",
          assigned_packages: profile.assigned_packages || [],
        };
      });

      setUsers(usersWithEmails);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleChange = (value: string) => {
    setFormData({
      ...formData,
      role: value as UserRole,
    });
  };

  const handlePackageCheckboxChange = (packageId: string, checked: boolean) => {
    setFormData(prevState => {
      const currentPackages = [...prevState.assigned_packages];
      
      if (checked) {
        if (!currentPackages.includes(packageId)) {
          return {
            ...prevState,
            assigned_packages: [...currentPackages, packageId]
          };
        }
      } else {
        return {
          ...prevState,
          assigned_packages: currentPackages.filter(id => id !== packageId)
        };
      }
      
      return prevState;
    });
  };

  const handleEditPackageCheckboxChange = (packageId: string, checked: boolean) => {
    setEditFormData(prevState => {
      const currentPackages = [...prevState.assigned_packages];
      
      if (checked) {
        if (!currentPackages.includes(packageId)) {
          return {
            ...prevState,
            assigned_packages: [...currentPackages, packageId]
          };
        }
      } else {
        return {
          ...prevState,
          assigned_packages: currentPackages.filter(id => id !== packageId)
        };
      }
      
      return prevState;
    });
  };

  const handleCreateUser = async () => {
    setIsLoading(true);
    try {
      console.log("Creating new user with:", { 
        email: formData.email, 
        username: formData.username, 
        role: formData.role,
        assigned_packages: formData.assigned_packages
      });
      
      const result = await createUser(
        formData.email,
        formData.password,
        formData.username,
        formData.role
      );

      if (result) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ assigned_packages: formData.assigned_packages })
          .eq('id', result.id);

        if (updateError) {
          throw updateError;
        }
        
        toast.success(`User created successfully`);
        
        const newUser: User = {
          id: result.id,
          email: formData.email,
          username: formData.username,
          role: formData.role,
          assigned_packages: formData.assigned_packages,
          created_at: new Date().toISOString(),
          password: formData.password
        };
        
        setUsers([newUser, ...users]);
        setOpen(false);
        resetForm();
        
        setTimeout(() => {
          fetchUsers();
        }, 1000);
      } else {
        toast.error("Failed to create user");
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      if (error.message.includes("duplicate key")) {
        toast.error("Email already exists");
      } else if (error.message.includes("invalid email")) {
        toast.error("Please enter a valid email address");
      } else if (error.message.includes("password")) {
        toast.error("Password must be at least 6 characters");
      } else {
        toast.error(error.message || "Failed to create user");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (userItem: User) => {
    setSelectedUser(userItem);
    setEditFormData({
      assigned_packages: userItem.assigned_packages || [],
    });
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (userItem: User) => {
    setSelectedUser(userItem);
    setDeleteDialogOpen(true);
  };

  const saveUserEdit = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          assigned_packages: editFormData.assigned_packages
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      
      toast.success("User updated successfully");
      
      const updatedUsers = users.map(u => {
        if (u.id === selectedUser.id) {
          return {
            ...u,
            assigned_packages: editFormData.assigned_packages
          };
        }
        return u;
      });
      
      setUsers(updatedUsers);
      setEditDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Failed to update user: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .rpc('delete_user', { user_id: selectedUser.id });

      if (error) throw error;
      
      toast.success("User deleted successfully");
      
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Failed to delete user: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      username: "",
      role: "user",
      assigned_packages: [],
    });
  };

  if (user?.role !== "admin") {
    return null;
  }

  const getPackageNames = (packageIds: string[] | null | undefined) => {
    if (!packageIds || packageIds.length === 0) return "None";
    
    return packageIds
      .map(id => {
        const pkg = packages.find(p => p.id === id);
        return pkg ? pkg.name : "Unknown";
      })
      .join(", ");
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>User Management | Coal Logistics Hub</title>
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Create New User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. They'll be able to login with these credentials.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Assign Packages</Label>
                  <ScrollArea className="h-60 border rounded-md p-2">
                    <div className="space-y-2">
                      {packages.length > 0 ? (
                        packages.map((pkg) => (
                          <div key={pkg.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`create-package-${pkg.id}`}
                              checked={formData.assigned_packages.includes(pkg.id)}
                              onCheckedChange={(checked) => handlePackageCheckboxChange(pkg.id, checked === true)}
                            />
                            <label 
                              htmlFor={`create-package-${pkg.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {pkg.name}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No packages available</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Manage system users and their access levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && users.length === 0 ? (
              <div className="flex justify-center py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Packages</TableHead>
                    <TableHead>Created</TableHead>
                    {user?.role === 'admin' && <TableHead>Password</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={user?.role === 'admin' ? 7 : 6} className="text-center py-6">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((userItem) => (
                      <TableRow key={userItem.id}>
                        <TableCell>{userItem.username}</TableCell>
                        <TableCell>{userItem.email}</TableCell>
                        <TableCell className="capitalize">{userItem.role}</TableCell>
                        <TableCell>{getPackageNames(userItem.assigned_packages)}</TableCell>
                        <TableCell>
                          {new Date(userItem.created_at).toLocaleDateString()}
                        </TableCell>
                        {user?.role === 'admin' && (
                          <TableCell>
                            {userItem.password ? userItem.password : "••••••••"}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleEditUser(userItem)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteUser(userItem)}
                              disabled={user.id === userItem.id}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update package assignments for {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assign Packages</Label>
              <ScrollArea className="h-60 border rounded-md p-2">
                <div className="space-y-2">
                  {packages.length > 0 ? (
                    packages.map((pkg) => (
                      <div key={pkg.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`edit-package-${pkg.id}`}
                          checked={editFormData.assigned_packages.includes(pkg.id)}
                          onCheckedChange={(checked) => handleEditPackageCheckboxChange(pkg.id, checked === true)}
                        />
                        <label 
                          htmlFor={`edit-package-${pkg.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {pkg.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No packages available</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveUserEdit} 
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user 
              account for {selectedUser?.username} and remove all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteUser}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default UserManagement;
