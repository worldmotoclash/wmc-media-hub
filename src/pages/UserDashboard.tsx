
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import AnimatedLogo from '@/components/AnimatedLogo';
import { LayoutDashboard, Calendar, FileText, MessageSquare, LogOut } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Redirect if no user is logged in
    if (!user) {
      toast.error('Please log in to access the dashboard');
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    setUser(null);
    toast.success('Successfully logged out');
    navigate('/');
  };

  if (!user) {
    return null; // Don't render anything while redirecting
  }

  const isSecuredInvestor = user.status === "Secured Investor";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AnimatedLogo />
            <span className="text-xl font-semibold">User Portal</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <div className="font-medium">{user.name}</div>
              <div className="text-gray-500">{user.status}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <Button 
              variant="outline" 
              className="border-black text-black hover:bg-black/5"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Dashboard Sidebar and Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:w-64 bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-fit"
          >
            <nav className="space-y-1">
              <Button variant="ghost" className="w-full justify-start font-normal bg-gray-100">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" className="w-full justify-start font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </Button>
              <Button variant="ghost" className="w-full justify-start font-normal">
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </Button>
              <Button variant="ghost" className="w-full justify-start font-normal">
                <MessageSquare className="mr-2 h-4 w-4" />
                Support
              </Button>
            </nav>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Account Status</h4>
                <div className="text-xs text-gray-500 mb-2">{user.status}</div>
                <Progress value={isSecuredInvestor ? 100 : 30} className="h-2" />
                <div className="mt-2 text-xs text-gray-500">
                  {isSecuredInvestor ? "Full access enabled" : "30% features available"}
                </div>
                {!isSecuredInvestor && (
                  <Button className="mt-4 w-full text-xs" size="sm">
                    Upgrade Plan
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1"
          >
            <h1 className="text-2xl font-bold mb-1">Welcome back, {user.name.split(' ')[0]}!</h1>
            <p className="text-gray-600 mb-6">Here's an overview of your account.</p>
            
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-white border border-gray-200">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isSecuredInvestor && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Total Points</CardTitle>
                        <CardDescription>Your accumulated points</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">1,250</div>
                        <p className="text-sm text-green-600">+150 this month</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Completed Tasks</CardTitle>
                      <CardDescription>Tasks you've finished</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">24</div>
                      <p className="text-sm text-gray-500">Out of 30 assigned</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Next Milestone</CardTitle>
                      <CardDescription>Your upcoming achievement</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-medium">
                        {isSecuredInvestor ? "Gold Status" : "Silver Status"}
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{isSecuredInvestor ? "85%" : "75%"}</span>
                        </div>
                        <Progress value={isSecuredInvestor ? 85 : 75} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest actions and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { date: "Today", title: "Completed profile setup", time: "10:30 AM" },
                        { date: "Yesterday", title: "Uploaded new documents", time: "3:45 PM" },
                        { date: "Sep 28", title: "Attended online seminar", time: "1:15 PM" },
                        { date: "Sep 25", title: "Updated contact information", time: "11:20 AM" }
                      ].map((item, index) => (
                        <div key={index} className="flex items-start pb-4 last:pb-0 last:border-0 border-b border-gray-100">
                          <div className="w-full">
                            <div className="flex justify-between items-center mb-1">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-xs text-gray-500">{item.time}</div>
                            </div>
                            <div className="text-sm text-gray-500">{item.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>Detailed log of your recent actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      Activity history will be displayed here
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>Manage your account preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      Account settings will be displayed here
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
