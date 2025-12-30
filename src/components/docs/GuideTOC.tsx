import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TOCItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
}

interface GuideTOCProps {
  items: TOCItem[];
}

export const GuideTOC: React.FC<GuideTOCProps> = ({ items }) => {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

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

    items.forEach((item) => {
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
            className="absolute bottom-20 right-4 w-72 bg-card border border-border rounded-lg shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-foreground mb-3">Contents</h3>
            <nav className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    activeId === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.title}
                </button>
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
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-all",
                    activeId === item.id
                      ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.title}
                </button>
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
