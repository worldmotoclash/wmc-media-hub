
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface TabContentProps {
  title: string;
  description: string;
  message: string;
}

const TabContent: React.FC<TabContentProps> = ({ title, description, message }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="mb-4 text-gray-500">{title} Tab Content</div>
          <div className="text-sm text-gray-500">
            {message}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TabContent;
