import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function Button({ children, loading, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`
        neumorphic-button px-6 py-3 rounded-xl
        text-gray-700 font-semibold
        flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed
        ${props.className || ''}
      `}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}