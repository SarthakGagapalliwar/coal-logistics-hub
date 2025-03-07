
import React from 'react';
import { Helmet } from 'react-helmet';
import PageTransition from '@/components/ui-custom/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  
  return (
    <PageTransition>
      <Helmet>
        <title>Settings | Coal Logistics Hub</title>
      </Helmet>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Username</h3>
                  <p className="text-sm text-muted-foreground">{user?.username}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Role</h3>
                  <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure your account settings and preferences. Manage notifications, security options, and personal information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Settings;
