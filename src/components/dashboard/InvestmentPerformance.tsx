
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const InvestmentPerformance: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment Performance</CardTitle>
        <CardDescription>Track the growth of your investment over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center border border-dashed border-gray-200 rounded-md">
          <div className="text-center">
            <div className="mb-2 text-gray-500">Performance Chart</div>
            <div className="text-sm text-gray-500">
              Interactive chart showing investment growth would be displayed here
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestmentPerformance;
