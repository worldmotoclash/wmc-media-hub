import React, { useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOCIAL_PLATFORMS, extractHandle, isValidHandle, type SocialPlatform } from '@/utils/applicationProgress';

interface SocialHandleInputProps {
  platform: SocialPlatform;
  value: string;
  onChange: (handle: string) => void;
  disabled?: boolean;
}

const SocialHandleInput: React.FC<SocialHandleInputProps> = ({ platform, value, onChange, disabled }) => {
  const [touched, setTouched] = useState(false);
  const { prefix } = SOCIAL_PLATFORMS[platform];

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-strip if user pastes a full URL
    const raw = e.target.value;
    const handle = extractHandle(platform, raw);
    onChange(handle);
  }, [platform, onChange]);

  const handleBlur = () => setTouched(true);

  const showValid = touched && value && isValidHandle(value);
  const showWarning = touched && value && !isValidHandle(value);

  return (
    <div className={cn(
      "flex items-center rounded-md border border-input bg-background text-sm ring-offset-background",
      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      disabled && "opacity-50 cursor-not-allowed"
    )}>
      <span className="px-3 py-2 text-muted-foreground bg-muted border-r border-input rounded-l-md whitespace-nowrap text-xs">
        {prefix}
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="your-username"
        className="flex-1 h-10 px-3 py-2 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      {showValid && <CheckCircle2 className="w-4 h-4 text-green-500 mr-3 shrink-0" />}
      {showWarning && <AlertTriangle className="w-4 h-4 text-yellow-500 mr-3 shrink-0" />}
    </div>
  );
};

export default SocialHandleInput;
