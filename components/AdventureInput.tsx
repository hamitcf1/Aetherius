import React, { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
};

const AdventureInput = React.forwardRef<HTMLTextAreaElement, Props>(
  ({ value, onChange, onSend, placeholder, disabled = false, rows = 1 }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
      const ta = (ref as any)?.current || innerRef.current;
      if (!ta) return;
      ta.style.height = 'auto';
      ta.style.height = Math.min(200, ta.scrollHeight) + 'px';
    }, [value, ref]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!disabled) onSend();
      }
    };

    return (
      <textarea
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        autoCapitalize="none"
        autoCorrect="off"
        className="flex-1 bg-skyrim-paper/30 border border-skyrim-border rounded p-2 text-sm text-skyrim-text placeholder-gray-500 resize-none focus:border-skyrim-gold focus:outline-none disabled:opacity-50 font-sans normal-case"
        aria-label="Adventure input"
      />
    );
  }
);

export default AdventureInput;
