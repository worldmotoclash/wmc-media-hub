
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

interface MessageFormProps {
  subject: string;
  setSubject: (subject: string) => void;
  message: string;
  setMessage: (message: string) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  recipientEmail: string;
  recipientName: string;
}

const MessageForm: React.FC<MessageFormProps> = ({
  subject,
  setSubject,
  message,
  setMessage,
  isSubmitting,
  onCancel,
  onSubmit,
  recipientEmail,
  recipientName
}) => {
  const { user } = useUser();
  const formRef = React.useRef<HTMLFormElement | null>(null);
  
  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4" ref={formRef}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="from-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            From
          </label>
          <Input
            id="from-name"
            value={user?.name || ''}
            disabled
            className="bg-gray-50 dark:bg-gray-800"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="from-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Email
          </label>
          <Input
            id="from-email"
            value={user?.email || ''}
            disabled
            className="bg-gray-50 dark:bg-gray-800"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="to" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          To
        </label>
        <Input
          id="to"
          value={recipientEmail}
          disabled
          className="bg-gray-50 dark:bg-gray-800"
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="subject" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Subject
        </label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter subject"
          className="border-gray-200 dark:border-gray-700"
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Message
        </label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="min-h-[150px] border-gray-200 dark:border-gray-700"
          required
        />
      </div>
      
      <div className="flex gap-3 justify-end">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || !message.trim()}
          className="bg-black text-white hover:bg-black/80"
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </form>
  );
};

export default MessageForm;
