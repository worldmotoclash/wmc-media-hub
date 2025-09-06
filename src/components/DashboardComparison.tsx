
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

const FeatureRow = ({ 
  feature, 
  investor, 
  user 
}: { 
  feature: string; 
  investor: boolean | string; 
  user: boolean | string;
}) => {
  return (
    <tr className="border-b border-gray-200">
      <td className="py-3 pl-4 pr-2 font-medium">{feature}</td>
      <td className="py-3 px-2 text-center">
        {typeof investor === 'boolean' ? (
          investor ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <X className="mx-auto h-5 w-5 text-gray-300" />
        ) : (
          <span>{investor}</span>
        )}
      </td>
      <td className="py-3 px-2 text-center">
        {typeof user === 'boolean' ? (
          user ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <X className="mx-auto h-5 w-5 text-gray-300" />
        ) : (
          <span>{user}</span>
        )}
      </td>
    </tr>
  );
};

const DashboardComparison: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-bold mb-2">Dashboard Comparison</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Compare the features available in our Investor and User dashboards to choose the right experience for your needs.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-center">Investor vs. User Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="col-span-1"></div>
                <div className="col-span-1">
                  <div className="bg-black text-white rounded-lg p-4 text-center">
                    <h3 className="font-bold">Investor Dashboard</h3>
                    <p className="text-sm opacity-80 mt-1">Premium Tier</p>
                  </div>
                </div>
                <div className="col-span-1">
                  <div className="bg-gray-200 rounded-lg p-4 text-center">
                    <h3 className="font-bold">User Dashboard</h3>
                    <p className="text-sm opacity-80 mt-1">Free Tier</p>
                  </div>
                </div>
              </div>
              
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 pl-4 pr-2 text-left font-semibold">Feature</th>
                    <th className="py-3 px-2 text-center font-semibold">Investor</th>
                    <th className="py-3 px-2 text-center font-semibold">User</th>
                  </tr>
                </thead>
                <tbody>
                  <FeatureRow feature="Investment Status Tracking" investor={true} user={false} />
                  <FeatureRow feature="Investment Amount" investor="$500,000+" user="N/A" />
                  <FeatureRow feature="Financial Reporting" investor={true} user={false} />
                  <FeatureRow feature="Performance Charts" investor={true} user={false} />
                  <FeatureRow feature="Quarterly Reports" investor={true} user={false} />
                  <FeatureRow feature="Points System" investor={false} user={true} />
                  <FeatureRow feature="Task Tracking" investor={false} user={true} />
                  <FeatureRow feature="Milestone Progress" investor={false} user={true} />
                  <FeatureRow feature="Activity Log" investor={true} user={true} />
                  <FeatureRow feature="Upcoming Events" investor={true} user="Limited" />
                  <FeatureRow feature="Company Updates" investor={true} user="Limited" />
                  <FeatureRow feature="Direct Support Contact" investor="Dedicated Manager" user="General Support" />
                  <FeatureRow feature="Document Access" investor="Full Access" user="Limited Access" />
                </tbody>
              </table>
              
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="col-span-1"></div>
                <div className="col-span-1">
                  <Button asChild className="w-full bg-black hover:bg-black/80 text-white">
                    <Link to="/dashboard">View Investor Dashboard</Link>
                  </Button>
                </div>
                <div className="col-span-1">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/user-dashboard">View User Dashboard</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardComparison;
