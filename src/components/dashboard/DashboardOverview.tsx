
import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UserInfoCard from '@/components/UserInfoCard';
import RecentUpdates from './RecentUpdates';
import InvestmentPerformance from './InvestmentPerformance';
import KeyDocuments from './KeyDocuments';
import InvestorSupport from './InvestorSupport';
import { useUser } from '@/contexts/UserContext';
import { trackDocumentClick } from '@/services/loginService';

const DashboardOverview: React.FC = () => {
  const { user } = useUser();
  const [isTrackingVideo, setIsTrackingVideo] = useState(false);
  const [showVideoOverlay, setShowVideoOverlay] = useState(true);
  
  // Case-insensitive, trimmed logic for hiding chart
  const status = user?.status?.toLowerCase().trim();
  const isSecuredInvestor = status === "secured investor";
  const isQualifiedInvestor = status === "qualified investor";
  const isPotentialInvestor = status === "potential investor";
  const showInvestmentPerformance =
    isSecuredInvestor && !isQualifiedInvestor && !isPotentialInvestor;

  const handleMainVideoPlay = useCallback(async (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('[DashboardOverview] Main video play button clicked');
    
    if (isTrackingVideo) {
      console.log('[DashboardOverview] Video tracking already in progress, ignoring click');
      return;
    }
    
    if (!user?.id) {
      console.error('[DashboardOverview] No user ID available for tracking');
      return;
    }
    
    setIsTrackingVideo(true);
    
    try {
      console.log('[DashboardOverview] About to track main video click');
      
      await trackDocumentClick(
        user.id,
        'https://drive.google.com/file/d/1ZDIK7ACuHd8GRvIXtiVBabDx3D3Aski7/preview',
        'Video Clicked',
        'WMC Motorsports Reimagined!'
      );
      
      console.log('[DashboardOverview] Main video tracking completed');
      
      // Hide the overlay to show the video
      setShowVideoOverlay(false);
      console.log('[DashboardOverview] Video overlay hidden');
    } catch (error) {
      console.error('[DashboardOverview] Error tracking main video:', error);
    } finally {
      setIsTrackingVideo(false);
    }
  }, [user, isTrackingVideo]);

  return (
    <div className="space-y-8">
      {/* Video spanning full width */}
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="aspect-video w-full relative">
          {/* Video overlay that can be hidden */}
          {showVideoOverlay && (
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-t-lg cursor-pointer z-20"
              style={{
                backgroundImage: `url('/lovable-uploads/moto-grid.jpg')`
              }}
              onClick={handleMainVideoPlay}
              tabIndex={0}
              aria-label="Play WMC Motorsports Reimagined Video"
              role="button"
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMainVideoPlay(e);
                }
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-black/60 flex items-center justify-center">
                <div className="text-center text-white">
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">WMC Motorsports Reimagined!</h3>
                  <p className="text-lg opacity-90 mb-3">Click to play video</p>
                  <Play className="w-12 h-12 mx-auto opacity-90" />
                </div>
              </div>
            </div>
          )}
          
          {/* Video iframe */}
          <iframe
            id="dashboard-main-video"
            src="https://drive.google.com/file/d/1ZDIK7ACuHd8GRvIXtiVBabDx3D3Aski7/preview"
            title="WMC Motorsports Reimagined!"
            className="w-full h-full absolute inset-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          ></iframe>
        </div>
        <div className="p-4 text-base text-gray-600 text-center dark:text-gray-300">
          Experience the future of motorsports with WMC's innovative approach to racing entertainment
        </div>
      </div>

      {/* NDA Alert for potential investors - moved here after video */}
      {isPotentialInvestor && (
        <Alert variant="default" className="bg-yellow-50 border-yellow-200">
          <FileText className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            You need to complete the NDA to gain access to the business plan. 
            Download the blank NDA and send it to <span className="font-semibold">investors@worldmotoclash.com</span>.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Key Documents and Investor Support moved here */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KeyDocuments />
        <InvestorSupport />
      </div>
      
      {/* Investor Information and Recent Updates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UserInfoCard />
        <RecentUpdates />
      </div>
      
      {showInvestmentPerformance && (
        <div className="grid grid-cols-1 gap-6">
          <InvestmentPerformance />
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
