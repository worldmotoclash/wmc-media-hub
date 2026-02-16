import React, { useState, useEffect } from "react";
import { X, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "pwa-install-prompt-dismissed";

const isIosSafari = () => {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);
  return isIos && isSafari;
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

export const PWAInstallPrompt: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isIosSafari() && !isStandalone() && !localStorage.getItem(DISMISS_KEY)) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-safe">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-lg max-w-md mx-auto relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={dismiss}
        >
          <X className="w-4 h-4" />
        </Button>
        <div className="flex items-start gap-3 pr-6">
          <img
            src="/pwa-192x192.png"
            alt="WMC"
            className="w-12 h-12 rounded-xl flex-shrink-0"
          />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Install WMC Media Hub</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add to your home screen for full-screen access and faster loads.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <span>Tap</span>
              <Share className="w-3.5 h-3.5 inline" />
              <span>then</span>
              <PlusSquare className="w-3.5 h-3.5 inline" />
              <span className="font-medium text-foreground">"Add to Home Screen"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
