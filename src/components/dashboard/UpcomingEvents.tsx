
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const UpcomingEvents: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Upcoming Events</CardTitle>
        <CardDescription>Scheduled investor events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium">Tenative WMC #1 - Texas Tornado COTA</div>
          <div className="text-xs text-gray-500">Oct 17-19th, 2025 </div>
        </div>
        <div>
          <div className="text-sm font-medium">Investor Meet & Greet</div>
          <div className="text-xs text-gray-500">Nov 5, 2025 • Austin, TX</div>
        </div>
        <div>
          <div className="text-sm font-medium">2024 Strategy Presentation</div>
          <div className="text-xs text-gray-500">Dec 10, 2025 • 11:00 AM EST</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full text-sm">View All Events</Button>
      </CardFooter>
    </Card>
  );
};

export default UpcomingEvents;
