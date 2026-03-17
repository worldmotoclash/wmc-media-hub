import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { MediaNavigation } from "@/components/media/MediaNavigation";
import { useCreatorGuard } from "@/hooks/useCreatorGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  User,
  Car,
  Users,
  MapPin,
  Box,
  Loader2,
  Plus,
  Filter,
  Grid3X3,
  List,
  Eye,
} from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface CharacterItem {
  id: string;
  name: string;
  element_type: string;
  image_url: string;
  thumbnail_url: string | null;
  description: string | null;
  tags: string[] | null;
  style_profile: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

const elementTypeIcons: Record<string, React.ReactNode> = {
  person: <User className="h-4 w-4" />,
  character: <User className="h-4 w-4" />,
  vehicle: <Car className="h-4 w-4" />,
  group: <Users className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  object: <Box className="h-4 w-4" />,
};

const elementTypeColors: Record<string, string> = {
  person: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  character: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  vehicle: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  group: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  location: "bg-green-500/20 text-green-400 border-green-500/30",
  object: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function CharacterLibrary() {
  const { user } = useUser();
  const navigate = useNavigate();

  const creatorBlocked = useCreatorGuard();
  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access this page');
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user || creatorBlocked) return null;

  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", tags: "" });
  const [saving, setSaving] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCharacter, setDeletingCharacter] = useState<CharacterItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewCharacter, setPreviewCharacter] = useState<CharacterItem | null>(null);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("character_library")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCharacters(data || []);
    } catch (error) {
      console.error("Error loading characters:", error);
      toast.error("Failed to load character library");
    } finally {
      setLoading(false);
    }
  };

  const filteredCharacters = characters.filter((char) => {
    const matchesSearch =
      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || char.element_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = [...new Set(characters.map((c) => c.element_type))];

  const openEditDialog = (character: CharacterItem) => {
    setEditingCharacter(character);
    setEditForm({
      name: character.name,
      description: character.description || "",
      tags: character.tags?.join(", ") || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCharacter) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("character_library")
        .update({
          name: editForm.name,
          description: editForm.description || null,
          tags: editForm.tags ? editForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCharacter.id);

      if (error) throw error;
      toast.success("Character updated");
      setEditDialogOpen(false);
      loadCharacters();
    } catch (error) {
      console.error("Error updating character:", error);
      toast.error("Failed to update character");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (character: CharacterItem) => {
    setDeletingCharacter(character);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCharacter) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("character_library")
        .delete()
        .eq("id", deletingCharacter.id);

      if (error) throw error;
      toast.success("Character deleted");
      setDeleteDialogOpen(false);
      loadCharacters();
    } catch (error) {
      console.error("Error deleting character:", error);
      toast.error("Failed to delete character");
    } finally {
      setDeleting(false);
    }
  };

  const openPreview = (character: CharacterItem) => {
    setPreviewCharacter(character);
    setPreviewDialogOpen(true);
  };

  const getStyleProfileSummary = (profile: Json | null) => {
    if (!profile || typeof profile !== "object") return null;
    const p = profile as Record<string, unknown>;
    const details: string[] = [];
    if (p.clothing) details.push(`Clothing: ${p.clothing}`);
    if (p.colors && Array.isArray(p.colors)) details.push(`Colors: ${(p.colors as string[]).join(", ")}`);
    if (p.distinguishingFeatures) details.push(`Features: ${p.distinguishingFeatures}`);
    return details.length > 0 ? details : null;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <MediaNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Character Library</h1>
            <p className="text-muted-foreground mt-1">
              Manage saved subject references for Style Lock consistency
            </p>
          </div>
          <Button onClick={() => navigate("/admin/media/generate")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add from Generate
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <span>{filteredCharacters.length} of {characters.length} characters</span>
          {uniqueTypes.length > 0 && (
            <span className="flex items-center gap-2">
              {uniqueTypes.slice(0, 4).map((type) => (
                <Badge key={type} variant="outline" className={elementTypeColors[type] || ""}>
                  {elementTypeIcons[type]}
                  <span className="ml-1">{characters.filter((c) => c.element_type === type).length}</span>
                </Badge>
              ))}
            </span>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCharacters.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No characters found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "Start by saving subject references from the Generate page"}
            </p>
            <Button onClick={() => navigate("/admin/media/generate")}>
              Go to Generate
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredCharacters.map((character) => (
              <Card
                key={character.id}
                className="group overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => openPreview(character)}
              >
                <div className="relative aspect-square">
                  <img
                    src={character.thumbnail_url || character.image_url}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge className={`text-xs ${elementTypeColors[character.element_type] || ""}`}>
                      {elementTypeIcons[character.element_type]}
                      <span className="ml-1">{character.element_type}</span>
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4 text-white" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPreview(character); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(character); }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); openDeleteDialog(character); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium truncate">{character.name}</h3>
                  {character.tags && character.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {character.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {character.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{character.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCharacters.map((character) => (
              <Card
                key={character.id}
                className="group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => openPreview(character)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <img
                    src={character.thumbnail_url || character.image_url}
                    alt={character.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{character.name}</h3>
                      <Badge className={`text-xs ${elementTypeColors[character.element_type] || ""}`}>
                        {elementTypeIcons[character.element_type]}
                        <span className="ml-1">{character.element_type}</span>
                      </Badge>
                    </div>
                    {character.description && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {character.description}
                      </p>
                    )}
                    {character.tags && character.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {character.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPreview(character); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(character); }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); openDeleteDialog(character); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Character</DialogTitle>
            <DialogDescription>Update the character details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                placeholder="santa, christmas, character"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Character</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCharacter?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewCharacter?.name}
              <Badge className={elementTypeColors[previewCharacter?.element_type || ""] || ""}>
                {elementTypeIcons[previewCharacter?.element_type || ""]}
                <span className="ml-1">{previewCharacter?.element_type}</span>
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img
                src={previewCharacter?.image_url}
                alt={previewCharacter?.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-4">
              {previewCharacter?.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm">{previewCharacter.description}</p>
                </div>
              )}
              {previewCharacter?.tags && previewCharacter.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewCharacter.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {getStyleProfileSummary(previewCharacter?.style_profile || null) && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Style Profile</h4>
                  <ul className="text-sm space-y-1">
                    {getStyleProfileSummary(previewCharacter?.style_profile || null)?.map((detail, i) => (
                      <li key={i} className="text-muted-foreground">{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-4 border-t">
                Added {previewCharacter?.created_at ? new Date(previewCharacter.created_at).toLocaleDateString() : "Unknown"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setPreviewDialogOpen(false);
                if (previewCharacter) openEditDialog(previewCharacter);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
