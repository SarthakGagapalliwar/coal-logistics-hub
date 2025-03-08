
import React from 'react';
import { Helmet } from 'react-helmet';
import PageTransition from '@/components/ui-custom/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const Shipments = () => {
  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Shipments | Coal Logistics Hub</title>
        </Helmet>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Shipment Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track and manage all your shipments in one place. This dashboard provides real-time updates on shipment status, location, and delivery estimates.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Shipments;
