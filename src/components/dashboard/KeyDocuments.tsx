import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { trackDocumentClick } from '@/services/loginService';

const KeyDocuments: React.FC = () => {
  const { user } = useUser();
  const isSecuredInvestor = user?.status?.toLowerCase().trim() === "secured investor";
  const isQualifiedInvestor = user?.status?.toLowerCase().trim() === "qualified investor"; 
  const hasBusinessPlanAccess = isSecuredInvestor || isQualifiedInvestor || user?.ndaSigned || false;

  // Helper to track and open in new tab
  const handleTrackedClick =
    (url: string, actionType: string, documentTitle: string) =>
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (user?.id) {
        await trackDocumentClick(user.id, url, actionType, documentTitle);
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Key Documents</CardTitle>
        <CardDescription className="text-base">Access your important documents</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasBusinessPlanAccess && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                <img 
                  src="/lovable-uploads/wmc-business-thumbnail.png" 
                  alt="WMC March 2025 Business Plan" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-lg font-medium dark:text-white">WMC March 2025 Business Plan</div>
                <div className="text-base text-gray-500 dark:text-gray-400">PDF • Google Drive</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400" asChild>
              <a
                href="https://drive.google.com/file/d/1CxlugbtMGzRGZQWWPhbVRka65yIGjXJw/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackedClick(
                  "https://drive.google.com/file/d/1CxlugbtMGzRGZQWWPhbVRka65yIGjXJw/view?usp=sharing",
                  "Document Clicked",
                  "WMC March 2025 Business Plan"
                )}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden">
              <img 
                src="/lovable-uploads/wmc-sizzle-thumbnail.png" 
                alt="WMC Motorsports Reimagined!" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-lg font-medium dark:text-white">WMC Motorsports Reimagined!</div>
              <div className="text-base text-gray-500 dark:text-gray-400">Video • Google Drive</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400" asChild>
            <a
              href="https://drive.google.com/file/d/1ZDIK7ACuHd8GRvIXtiVBabDx3D3Aski7/preview"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTrackedClick(
                "https://drive.google.com/file/d/1ZDIK7ACuHd8GRvIXtiVBabDx3D3Aski7/preview",
                "Video Clicked",
                "WMC Motorsports Reimagined!"
              )}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden">
              <img 
                src="/lovable-uploads/sponsor-primier-thumbnail.png" 
                alt="Investor Executive Summary Deck" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-lg font-medium dark:text-white">Investor Executive Summary Deck</div>
              <div className="text-base text-gray-500 dark:text-gray-400">PDF • Google Drive</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400" asChild>
            <a
              href="https://drive.google.com/file/d/1LZTSnrgpVAVZjq9DAORgzQaLpNG0R28v/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTrackedClick(
                "https://drive.google.com/file/d/1LZTSnrgpVAVZjq9DAORgzQaLpNG0R28v/view?usp=drive_link",
                "Document Clicked",
                "Investor Executive Summary Deck"
              )}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>

        {!hasBusinessPlanAccess && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                <img 
                  src="/lovable-uploads/blank-nda.png" 
                  alt="WMC NDA Document" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-lg font-medium dark:text-white">WMC NDA 2025 (Blank)</div>
                <div className="text-base text-gray-500 dark:text-gray-400">DOCX • Secure Storage</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400" asChild>
              <a
                href="/lovable-uploads/wmc-nda-2025-blank.docx"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackedClick(
                  "/lovable-uploads/wmc-nda-2025-blank.docx",
                  "Document Clicked",
                  "WMC NDA 2025 (Blank)"
                )}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full text-base dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" asChild>
          <Link to="/documents">View All Documents</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default KeyDocuments;
