import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export type RoleType = 'everyone' | 'viewer' | 'creator' | 'editor' | 'admin';

interface TOCItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
  isCategory?: boolean;
  role?: RoleType;
}

const roleStyles: Record<RoleType, { bg: string; text: string; border: string; label: string }> = {
  everyone: { 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-600 dark:text-emerald-400', 
    border: 'border-emerald-500/30',
    label: 'Everyone'
  },
  viewer: { 
    bg: 'bg-blue-500/10', 
    text: 'text-blue-600 dark:text-blue-400', 
    border: 'border-blue-500/30',
    label: 'Viewer'
  },
  creator: { 
    bg: 'bg-cyan-500/10', 
    text: 'text-cyan-600 dark:text-cyan-400', 
    border: 'border-cyan-500/30',
    label: 'Creator'
  },
  editor: { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-600 dark:text-amber-400', 
    border: 'border-amber-500/30',
    label: 'Editor'
  },
  admin: { 
    bg: 'bg-red-500/10', 
    text: 'text-red-600 dark:text-red-400', 
    border: 'border-red-500/30',
    label: 'Admin'
  },
};

export const GuideTOC: React.FC<GuideTOCProps> = ({ items }) => {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -66%' }
    );

    items.filter(item => !item.isCategory).forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Group items by category
  const groupedItems: { category: TOCItem | null; items: TOCItem[] }[] = [];
  let currentGroup: { category: TOCItem | null; items: TOCItem[] } = { category: null, items: [] };
  
  items.forEach((item) => {
    if (item.isCategory) {
      if (currentGroup.items.length > 0 || currentGroup.category) {
        groupedItems.push(currentGroup);
      }
      currentGroup = { category: item, items: [] };
    } else {
      currentGroup.items.push(item);
    }
  });
  if (currentGroup.items.length > 0 || currentGroup.category) {
    groupedItems.push(currentGroup);
  }

  const renderTOCItem = (item: TOCItem, inMobile = false) => (
    <button
      key={item.id}
      onClick={() => scrollToSection(item.id)}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
        activeId === item.id
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        !inMobile && activeId === item.id && "border-l-2 border-primary"
      )}
    >
      {item.title}
    </button>
  );

  const renderCategory = (group: { category: TOCItem | null; items: TOCItem[] }, inMobile = false) => {
    if (!group.category) {
      return group.items.map(item => renderTOCItem(item, inMobile));
    }

    const isCollapsed = collapsedCategories.has(group.category.id);
    const role = group.category.role;
    const style = role ? roleStyles[role] : null;

    return (
      <div key={group.category.id} className="mb-2">
        <button
          onClick={() => toggleCategory(group.category!.id)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors",
            style ? `${style.bg} ${style.text}` : "bg-muted/50 text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>{group.category.title}</span>
          </div>
          {style && (
            <Badge variant="outline" className={cn("text-xs", style.border, style.text)}>
              {style.label}
            </Badge>
          )}
        </button>
        {!isCollapsed && (
          <div className="ml-2 mt-1 space-y-1 border-l-2 border-border pl-2">
            {group.items.map(item => renderTOCItem(item, inMobile))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          className="rounded-full shadow-lg bg-background"
          onClick={scrollToTop}
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          className="rounded-full shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="absolute bottom-20 right-4 w-72 max-h-[60vh] bg-card border border-border rounded-lg shadow-xl p-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-foreground mb-3">Contents</h3>
            <nav className="space-y-1">
              {groupedItems.map((group, idx) => (
                <React.Fragment key={group.category?.id || `group-${idx}`}>
                  {renderCategory(group, true)}
                </React.Fragment>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">
            Contents
          </h3>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <nav className="space-y-1 pr-4">
              {groupedItems.map((group, idx) => (
                <React.Fragment key={group.category?.id || `group-${idx}`}>
                  {renderCategory(group)}
                </React.Fragment>
              ))}
            </nav>
          </ScrollArea>
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.print()}
            >
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};
