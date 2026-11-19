import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 text-slate-500 dark:text-slate-400 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Smartphone className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" strokeWidth={1.5} />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
