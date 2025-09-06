
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Video, Headphones } from 'lucide-react';
import { companyUpdates } from '@/data/companyUpdates';
import { useUser } from '@/contexts/UserContext';
import { trackDocumentClick } from '@/services/loginService';
import { TRACKING_ACTIONS } from '@/constants/trackingActions';

const RecentUpdates: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const recentUpdates = companyUpdates.slice(0, 3);

  const handleViewAll = () => {
    navigate('/updates');
  };

  // Centralized click tracking
  const handleTrackedClick =
    (url: string, type: string, title: string) =>
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (user?.id) {
        let action: string;
        if (type === 'video') action = TRACKING_ACTIONS.VIDEO_CLICKED;
        else if (type === 'audio') action = TRACKING_ACTIONS.AUDIO_CLICKED;
        else if (type === 'website') action = TRACKING_ACTIONS.DOCUMENT_CLICKED;
        else action = TRACKING_ACTIONS.DOCUMENT_CLICKED;
        await trackDocumentClick(user.id, url, action, title);
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recent Updates</CardTitle>
        <CardDescription className="text-base">Latest company updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentUpdates.map((update, index) => (
          <div key={index} className="border-b pb-3 last:border-b-0 last:pb-0">
            <div className="text-lg font-medium">{update.title}</div>
            <div className="text-base text-gray-500 mb-2">{update.date}</div>
            <div className="flex gap-2 mt-1">
              {update.url && (
                <Button 
                  variant="outline" 
                  size="sm"
                  asChild
                  className="h-8 text-xs text-blue-600"
                >
                  <a 
                    href={update.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleTrackedClick(update.url, "website", update.title)}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Website
                  </a>
                </Button>
              )}
              {update.documentUrl && (
                <Button 
                  variant="outline" 
                  size="sm"
                  asChild
                  className={`h-8 text-xs ${
                    update.documentType === 'audio' ? 'text-orange-600' : 'text-emerald-600'
                  }`}
                >
                  <a
                    href={update.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleTrackedClick(update.documentUrl, update.documentType || "document", update.title)}
                  >
                    {update.documentType === 'video' ? (
                      <>
                        <Video className="mr-1 h-3 w-3" />
                        Video
                      </>
                    ) : update.documentType === 'audio' ? (
                      <>
                        <Headphones className="mr-1 h-3 w-3" />
                        Audio
                      </>
                    ) : (
                      <>
                        <FileText className="mr-1 h-3 w-3" />
                        Document
                      </>
                    )}
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full text-base" onClick={handleViewAll}>
          View All Updates
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RecentUpdates;
