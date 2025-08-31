import React from 'react';
import { cn } from '@/lib/utils';

interface SuggestionCardProps {
  title: string;
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  className?: string;
}

export function SuggestionCard({
  title,
  suggestions,
  onSuggestionClick,
  className,
}: SuggestionCardProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-center mb-2 text-sm text-muted-foreground">
        <span>{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="px-3 py-2 text-sm text-left transition-colors bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
