
import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";

interface InvestDialogProps {
  trigger: React.ReactNode;
  defaultTier?: string;
  onAfterSubmit?: () => void;  // Add this new prop
}

export const InvestDialog: React.FC<InvestDialogProps> = ({
  trigger,
  defaultTier,
  onAfterSubmit,
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const { user } = useUser();
  const formRef = useRef<HTMLFormElement>(null);

  // Use the logged-in user's name, fallback to "Investor"
  const userName = user?.name || "Investor";
  const userEmail = user?.email || "";
  const subject = defaultTier ? `Investor Inquiry: ${defaultTier}` : "Investor Inquiry";

  // Split name into first and last name
  const nameParts = userName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter your message.");
      return;
    }
    setSubmitting(true);
    try {
      if (formRef.current) {
        // Create a hidden iframe for form submission to prevent page navigation
        const iframe = document.createElement('iframe');
        iframe.name = 'hidden_submit_frame';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        // Set the form to target the hidden iframe
        formRef.current.target = 'hidden_submit_frame';
        formRef.current.submit();
        
        // Remove iframe after submission
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 5000);
        
        setShowThankYou(true);
        // Clear input state for next open
        setMessage("");
      }
    } catch (err) {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    // Only call onAfterSubmit when the dialog is closed and we've shown the thank you message
    if (showThankYou && onAfterSubmit) {
      // Small delay to ensure proper execution order
      setTimeout(() => {
        onAfterSubmit();
      }, 100);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { 
      if (v === false) {
        handleDialogClose();
      } else {
        setOpen(v);
      }
      if (!v) setShowThankYou(false); 
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        {!showThankYou ? (
          <form 
            ref={formRef}
            onSubmit={handleSubmit}
            method="POST"
            action="https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8"
          >
            <input type="hidden" name="oid" value="00D5e000000HEcP" />
            <input type="hidden" name="first_name" value={firstName} />
            <input type="hidden" name="last_name" value={lastName} />
            <input type="hidden" name="email" value={userEmail} />
            <input type="hidden" name="lead_source" value="Investor Portal" />
            <input type="hidden" name="description" value={`Investment Tier: ${defaultTier || 'Not Specified'}\n\nMessage: ${message}`} />
            
            <DialogHeader>
              <DialogTitle>
                Invest in {defaultTier || "World Moto Clash"}
              </DialogTitle>
              <DialogDescription>
                Submit your interest and our team will connect with you soon.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <div className="text-base text-gray-700 dark:text-gray-200">
                {user ? (
                  <>
                    Hi <span className="font-semibold">{userName}</span>
                    <span className="ml-1 text-xs font-mono text-gray-500">{userEmail}</span>
                  </>
                ) : (
                  <>Hi, Investor!</>
                )}
              </div>
              <Textarea
                required
                placeholder="Write a bit about your interest, or any questions you have"
                minLength={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={submitting}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={submitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col items-center py-8">
            <div className="text-2xl font-semibold text-green-600 mb-2 text-center">
              Thank you {userName} for your interest in {defaultTier || "World Moto Clash"}!
            </div>
            <div className="text-gray-600 dark:text-gray-300 text-center">
              Our team will reach out soon to your email: <span className="font-mono font-semibold">{userEmail}</span>
            </div>
            <DialogFooter className="mt-8">
              <Button
                onClick={() => {
                  setShowThankYou(false);
                  setOpen(false);
                }}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvestDialog;
