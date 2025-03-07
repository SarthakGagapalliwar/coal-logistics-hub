
import React from 'react';
import { Helmet } from 'react-helmet';
import PageTransition from '@/components/ui-custom/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Reports = () => {
  return (
    <PageTransition>
      <Helmet>
        <title>Reports | Coal Logistics Hub</title>
      </Helmet>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Analytics Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Access detailed reports and analytics about your logistics operations. Generate customized reports based on timeline, region, or transporter performance.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Reports;
