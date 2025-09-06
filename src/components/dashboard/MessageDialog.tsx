
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useUser } from '@/contexts/UserContext';
import MessageForm from './MessageForm';
import { submitMessageViaIframe, submitViaDirectUrl } from '@/utils/messageSubmission';

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientEmail?: string;
  recipientName?: string;
}

const MessageDialog: React.FC<MessageDialogProps> = ({ 
  open, 
  onOpenChange,
  recipientEmail = "sarah.mitchell@worldmotoclash.com",
  recipientName = "Sarah Mitchell"
}) => {
  const { user } = useUser();
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionStatus, setSubmissionStatus] = React.useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  
  const handleReset = () => {
    setSubject('');
    setMessage('');
    setIsSubmitting(false);
    setSubmissionStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionStatus('pending');
    
    try {
      console.log('Message submission initiated');
      
      // Get the member ID from the user context
      const memberId = user?.id || '0035e000003cugh';
      
      // Submit using iframe method
      const result = await submitMessageViaIframe({
        contactId: memberId,
        subject,
        message,
        recipientName
      });
      
      // Handle success with a longer timeout
      setTimeout(() => {
        console.log('Message successfully submitted');
        setSubmissionStatus('success');
        toast.success(`Message sent to ${recipientName}`, {
          description: "They will get back to you shortly.",
        });
        
        // Close dialog after submission
        onOpenChange(false);
        handleReset();
      }, 5000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmissionStatus('error');
      toast.error('Failed to send message. Please try again.');
      
      // Try fallback method
      console.log('Attempting fallback submission method...');
      const fallbackSuccess = submitViaDirectUrl({
        contactId: user?.id || '0035e000003cugh',
        subject,
        message,
        recipientName
      });
      
      if (fallbackSuccess) {
        setTimeout(() => {
          setSubmissionStatus('success');
          toast.success(`Message sent to ${recipientName}`, {
            description: "They will get back to you shortly.",
          });
          
          // Close dialog after submission
          onOpenChange(false);
          handleReset();
        }, 3000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleReset();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[550px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Send a Message</DialogTitle>
          <DialogDescription>
            Send a direct message to {recipientName}
          </DialogDescription>
        </DialogHeader>
        
        <MessageForm 
          subject={subject}
          setSubject={setSubject}
          message={message}
          setMessage={setMessage}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          recipientEmail={recipientEmail}
          recipientName={recipientName}
        />
      </DialogContent>
    </Dialog>
  );
};

export default MessageDialog;
