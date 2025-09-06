
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

// Import our newly created components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import TabContent from '@/components/dashboard/TabContent';

const Dashboard: React.FC = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  
  // Updated status checks to be more flexible
  const isSecuredInvestor = user?.status?.toLowerCase().trim() === "secured investor";
  const isQualifiedInvestor = user?.status?.toLowerCase().trim() === "qualified investor";
  const isPotentialInvestor = user?.status?.toLowerCase().trim() === "potential investor";
  const hasBusinessPlanAccess = isSecuredInvestor || isQualifiedInvestor;
  
  // Log the user status for debugging
  useEffect(() => {
    if (user?.status) {
      console.log("Current user status:", user.status);
      console.log("isQualifiedInvestor:", isQualifiedInvestor);
      console.log("hasBusinessPlanAccess:", hasBusinessPlanAccess);
    }
  }, [user, isQualifiedInvestor, hasBusinessPlanAccess]);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Redirect if no user is logged in
    if (!user) {
      toast.error('Please log in to access the dashboard');
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSignOut = () => {
    setUser(null);
    toast.success('Successfully logged out');
    navigate('/');
  };

  const navigateToDocuments = () => {
    navigate('/documents');
  };

  const navigateToUpdates = () => {
    navigate('/updates');
  };

  const navigateToPerks = () => {
    window.open('https://id-preview--e0a76573-7507-4fa2-91b5-edf4d8045121.lovable.app/investment-opportunity', '_blank', 'noopener,noreferrer');
  };

  if (!user) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader handleSignOut={handleSignOut} />
      
      <main className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold mb-2 dark:text-white">Investor Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Welcome back {user.name}, 
            {hasBusinessPlanAccess 
              ? " you now have access to the " 
              : " check out our "}
            {hasBusinessPlanAccess ? (
              <a 
                href="/documents" 
                className="text-blue-600 hover:underline font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToDocuments();
                }}
              >
                business plan
              </a>
            ) : (
              <a 
                href="https://drive.google.com/file/d/1LZTSnrgpVAVZjq9DAORgzQaLpNG0R28v/view?usp=drive_link" 
                className="text-blue-600 hover:underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Investor Executive Summary Deck
              </a>
            )}
            {hasBusinessPlanAccess && "."}
          </p>
        </motion.div>
        
        {/* For debugging - temporarily display the actual user status */}
        <div className="text-xs text-gray-500 mb-4">Current status: {user.status}</div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents" onClick={navigateToDocuments}>Documents</TabsTrigger>
              {hasBusinessPlanAccess && <TabsTrigger value="financials">Financials</TabsTrigger>}
              <TabsTrigger value="perks" onClick={navigateToPerks}>Perks</TabsTrigger>
              <TabsTrigger value="updates" onClick={navigateToUpdates}>Updates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <DashboardOverview />
            </TabsContent>
            
            <TabsContent value="documents">
              <TabContent 
                title="Investment Documents" 
                description="Access all documents related to your investment"
                message="A complete list of investment documents would be displayed here"
              />
            </TabsContent>
            
            {hasBusinessPlanAccess && (
              <TabsContent value="financials">
                <TabContent 
                  title="Financial Information" 
                  description="Detailed financial data and reports"
                  message="Financial statements, projections, and analysis would be displayed here"
                />
              </TabsContent>
            )}
            
            <TabsContent value="perks">
              <TabContent 
                title="Investment Perks" 
                description="Explore the benefits and perks of investing"
                message="Investment perks and benefits information would be displayed here"
              />
            </TabsContent>
            
            <TabsContent value="updates">
              <TabContent 
                title="Company Updates" 
                description="Latest news and announcements"
                message="Recent company news, press releases, and updates would be displayed here"
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
