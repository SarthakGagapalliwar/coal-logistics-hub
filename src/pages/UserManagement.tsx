
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

interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  created_at: string;
  assigned_package_id?: string | null;
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
    assigned_package_id: "" as string | null,
  });
  const [editFormData, setEditFormData] = useState({
    assigned_package_id: "" as string | null,
  });

  useEffect(() => {
    // Redirect if not admin
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
        .select("id, username, role, created_at, assigned_package_id")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      console.log("Profiles data fetched:", data);

      // Fetch emails separately from auth.users
      // Note: In a real app with admin access, you'd use Supabase admin functions
      // For now, we'll use a workaround to approximate this functionality
      const emailsData = await Promise.all(
        data.map(async (profile) => {
          // Try to fetch email from the auth schema (this is just for demo, in production use admin API)
          try {
            // We're making a direct query to mimic getting user data
            // In a real app, you'd use supabase-js admin client or create a secure edge function
            const { data: userData, error: userError } = await supabase
              .rpc('get_user_email', { user_id: profile.id })
              .select('email')
              .single();

            return {
              id: profile.id,
              email: userData?.email || `${profile.username}@example.com`, // Fallback for demo
            };
          } catch (err) {
            console.error("Error fetching email for user:", err);
            return {
              id: profile.id,
              email: `${profile.username}@example.com`, // Fallback email format
            };
          }
        })
      );

      console.log("Emails data:", emailsData);

      // Combine profile data with emails
      const usersWithEmails = data.map((profile) => {
        const emailData = emailsData.find((e) => e.id === profile.id);
        return {
          ...profile,
          email: emailData?.email || "No email available",
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
  
  const handlePackageChange = (value: string) => {
    setFormData({
      ...formData,
      assigned_package_id: value === "none" ? null : value,
    });
  };

  const handleCreateUser = async () => {
    setIsLoading(true);
    try {
      console.log("Creating new user with:", { 
        email: formData.email, 
        username: formData.username, 
        role: formData.role,
        assigned_package_id: formData.assigned_package_id
      });
      
      // Use the createUser method from AuthContext
      const result = await createUser(
        formData.email,
        formData.password,
        formData.username,
        formData.role
      );

      if (result) {
        toast.success(`User created successfully`);
        
        // Add the newly created user to the list with the password for admin view
        const newUser: User = {
          id: "temp-" + Date.now(), // This will be replaced on next fetch
          email: formData.email,
          username: formData.username,
          role: formData.role,
          assigned_package_id: formData.assigned_package_id,
          created_at: new Date().toISOString(),
          password: formData.password // Store password temporarily for admin view
        };
        
        setUsers([newUser, ...users]);
        setOpen(false);
        resetForm();
        
        // Refresh the user list after a short delay to get the actual user record
        setTimeout(() => {
          fetchUsers();
        }, 1000);
      } else {
        toast.error("Failed to create user");
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      // More user-friendly error messages
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
      assigned_package_id: userItem.assigned_package_id || null,
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
          assigned_package_id: editFormData.assigned_package_id === "none" ? null : editFormData.assigned_package_id 
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      
      toast.success("User updated successfully");
      
      // Update the local state
      const updatedUsers = users.map(u => {
        if (u.id === selectedUser.id) {
          return {
            ...u,
            assigned_package_id: editFormData.assigned_package_id
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
      // If user had an assigned package, we need to reassign or clean up
      if (selectedUser.assigned_package_id) {
        // Clear package assignment before deleting user
        const { error: packageError } = await supabase
          .from('packages')
          .update({ assigned_package_id: null })
          .eq('id', selectedUser.assigned_package_id);
          
        if (packageError) {
          console.error("Error clearing package assignment:", packageError);
        }
      }
      
      // Delete the user from auth schema via RPC function
      // Note: In a real app, you'd use Supabase admin functions or a secure edge function
      const { error } = await supabase
        .rpc('delete_user', { user_id: selectedUser.id });

      if (error) throw error;
      
      toast.success("User deleted successfully");
      
      // Remove from local state
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Failed to delete user: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPackageChange = (value: string) => {
    setEditFormData({
      ...editFormData,
      assigned_package_id: value === "none" ? null : value,
    });
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      username: "",
      role: "user",
      assigned_package_id: null,
    });
  };

  // Check if user is admin before rendering the page
  if (user?.role !== "admin") {
    return null;
  }

  // Helper function to get package name by ID
  const getPackageName = (packageId: string | null | undefined) => {
    if (!packageId) return "None";
    const pkg = packages.find(p => p.id === packageId);
    return pkg ? pkg.name : "Unknown Package";
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
                  <Label htmlFor="assigned_package">Assign Package</Label>
                  <Select
                    value={formData.assigned_package_id || "none"}
                    onValueChange={handlePackageChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <TableHead>Assigned Package</TableHead>
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
                        <TableCell>{getPackageName(userItem.assigned_package_id)}</TableCell>
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update package assignment for {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_assigned_package">Assign Package</Label>
              <Select
                value={editFormData.assigned_package_id || "none"}
                onValueChange={handleEditPackageChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Delete Confirmation Dialog */}
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
