
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MessageDialog from './MessageDialog';
import { Phone } from 'lucide-react';

const InvestorSupport: React.FC = () => {
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Investor Support</CardTitle>
        <CardDescription className="text-base">Get support for your investment questions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <h4 className="text-base font-medium mb-2 dark:text-gray-200">Your Dedicated Investor Relations Contact</h4>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-medium dark:text-gray-300">
              SM
            </div>
            <div>
              <div className="text-lg font-medium dark:text-white">Sarah Mitchell</div>
              <div className="text-base text-gray-500 dark:text-gray-400">Investor Relations Manager</div>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setIsMessageDialogOpen(true);
                }}
                className="text-base text-blue-600 hover:underline dark:text-blue-400"
              >
                sarah.mitchell@worldmotoclash.com
              </a>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <a 
                  href="tel:+18552WMCLASH" 
                  className="text-base text-gray-700 hover:underline dark:text-gray-200"
                >
                  +1 (855) 296-2527
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Button 
            className="w-full bg-black hover:bg-black/80 text-white text-base"
            onClick={() => window.open('https://calendar.app.google/2qCX5aGphMmqUG5y5', '_blank', 'noopener,noreferrer')}
          >
            Schedule a Call
          </Button>
          <Button 
            variant="outline" 
            className="w-full dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 text-base"
            onClick={() => setIsMessageDialogOpen(true)}
          >
            Send a Message
          </Button>
        </div>
        
        <MessageDialog 
          open={isMessageDialogOpen} 
          onOpenChange={setIsMessageDialogOpen}
          recipientName="Sarah Mitchell"
          recipientEmail="sarah.mitchell@worldmotoclash.com"
        />
      </CardContent>
    </Card>
  );
};

export default InvestorSupport;
