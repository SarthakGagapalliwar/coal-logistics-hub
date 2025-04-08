
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
}

interface UserFormData {
  name: string;
  email: string;
  role: string;
  password: string;
}

export const useUsers = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'user',
    password: '',
  });

  // Query to fetch users from profiles table
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        // Get profiles with roles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }
        
        // Transform the profiles data
        const userProfiles = profiles.map(profile => ({
          id: profile.id,
          username: profile.username,
          email: profile.email || '', // If email is stored in profiles, use it
          role: profile.role,
          active: profile.active
        }));
        
        return userProfiles as User[];
      } catch (error) {
        console.error('Error in user fetching:', error);
        throw error;
      }
    },
  });

  // Mutation to add a new user
  const addUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      // Call the sign up function from Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.name,
            role: userData.role,
          },
        },
      });
      
      if (authError) throw authError;
      
      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User added successfully');
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add user: ${error.message}`);
    },
  });

  // Mutation to update a user
  const updateUserMutation = useMutation({
    mutationFn: async (user: User) => {
      // Update user in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          username: user.username,
          role: user.role,
          active: user.active
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  // Mutation to delete a user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete user using RPC function
      const { error } = await supabase.rpc('delete_user', { user_id: userId });
      
      if (error) throw error;
      
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Set up to edit a user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.username,
      email: user.email,
      role: user.role,
      password: '', // Password field will be disabled in edit mode
    });
    setOpenDialog(true);
  };

  // Set up to add a new user
  const handleAddUser = () => {
    setSelectedUser(null);
    resetForm();
    setOpenDialog(true);
  };

  // Reset the form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'user',
      password: '',
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUser) {
      // Update existing user
      updateUserMutation.mutate({
        ...selectedUser,
        username: formData.name,
        role: formData.role,
      });
    } else {
      // Add new user
      addUserMutation.mutate(formData);
    }
  };

  return {
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
    isSubmitting: addUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending,
  };
};
