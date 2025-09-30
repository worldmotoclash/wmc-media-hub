import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeNames: Record<string, string> = {
  "/admin/media": "Media Hub",
  "/admin/media/library": "Asset Library",
  "/admin/media/content": "Content Library",
  "/admin/media/upload": "Upload",
  "/admin/media/models": "Model Marketplace",
  "/admin/media/generate": "Generate",
  "/admin/media/playlists": "Playlists",
  "/admin/media/scene-detection": "Scene Detection",
};

export function MediaNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentName = routeNames[currentPath] || "Media";

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/media" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Hub</span>
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
                  <BreadcrumbPage>{currentName}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
