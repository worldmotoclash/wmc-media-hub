import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useEffect, useState } from "react";
import { fetchPlaylistData, SalesforcePlaylist } from "@/services/videoContentService";

const routeNames: Record<string, string> = {
  "/admin/media": "Media Hub",
  "/admin/media/library": "Media Library",
  "/admin/media/content": "Content Library",
  "/admin/media/upload": "Upload",
  "/admin/media/models": "Model Marketplace",
  "/admin/media/generate": "Generate",
  "/admin/media/playlists": "Playlists",
  "/admin/media/scene-detection": "Scene Detection",
  "/admin/media/characters": "Character Library",
  "/mediahub/diary": "Content Diary",
};

export function MediaNavigation() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentPath = location.pathname;
  const playlistId = searchParams.get('playlistId');
  const [currentPlaylist, setCurrentPlaylist] = useState<SalesforcePlaylist | null>(null);

  useEffect(() => {
    const loadPlaylistDetails = async () => {
      if (!playlistId) return;
      
      try {
        const playlists = await fetchPlaylistData();
        const playlist = playlists.find(p => p.Id === playlistId);
        setCurrentPlaylist(playlist || null);
      } catch (error) {
        console.error('Error loading playlist details:', error);
      }
    };

    loadPlaylistDetails();
  }, [playlistId]);

  const currentName = routeNames[currentPath] || "Media";
  const isPlaylistView = playlistId && (currentPath === "/admin/media/library" || currentPath === "/admin/media/content");
  const backPath = isPlaylistView ? "/admin/media/playlists" : "/admin/media";

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backPath} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isPlaylistView ? "Back to Playlists" : "Back to Hub"}
            </span>
          </Link>
        </Button>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin/media">Media Hub</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {currentPath !== "/admin/media" && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isPlaylistView ? (
                    <BreadcrumbLink asChild>
                      <Link to="/admin/media/playlists">Playlists</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{currentName}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {isPlaylistView && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {currentPlaylist?.Name || 'Loading...'}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
