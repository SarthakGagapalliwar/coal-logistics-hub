
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
import { UserRole } from "@/context/AuthContext";

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
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    role: "user" as UserRole,
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={user?.role === 'admin' ? 6 : 5} className="text-center py-6">
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
