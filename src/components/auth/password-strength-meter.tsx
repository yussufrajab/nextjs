'use client';

import React from 'react';
import { getPasswordFeedback, PASSWORD_MIN_LENGTH } from '@/lib/password-utils';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthMeter({
  password,
  showRequirements = false,
}: PasswordStrengthMeterProps) {
  const feedback = getPasswordFeedback(password);

  // Color mapping for strength
  const strengthColors = {
    weak: 'bg-red-500',
    medium: 'bg-orange-500',
    strong: 'bg-yellow-500',
    'very-strong': 'bg-green-500',
  };

  const strengthTextColors = {
    weak: 'text-red-600',
    medium: 'text-orange-600',
    strong: 'text-yellow-600',
    'very-strong': 'text-green-600',
  };

  // Width mapping for progress bar
  const strengthWidths = {
    weak: 'w-1/4',
    medium: 'w-2/4',
    strong: 'w-3/4',
    'very-strong': 'w-full',
  };

  // Check password requirements
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&#^()_+\-=\[\]{}|;:,.<>?]/.test(password);
  const hasCharacterType = hasUppercase || hasLowercase || hasNumber || hasSpecial;
  const isNotCommon = feedback.score > 1; // Not weak (0-1)

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2 mt-2">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">Password strength:</span>
          <span className={cn('font-medium capitalize', strengthTextColors[feedback.strength])}>
            {feedback.strength.replace('-', ' ')}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 rounded-full',
              strengthColors[feedback.strength],
              strengthWidths[feedback.strength]
            )}
          />
        </div>
      </div>

      {/* Crack Time Display */}
      {password && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Estimated crack time: <span className="font-medium">{feedback.crackTimeDisplay}</span>
        </p>
      )}

      {/* Feedback Messages */}
      {feedback.feedback.warning && (
        <p className="text-sm text-orange-600 dark:text-orange-400">
          {feedback.feedback.warning}
        </p>
      )}

      {feedback.feedback.suggestions.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {feedback.feedback.suggestions.map((suggestion, index) => (
            <p key={index} className="text-xs">
              • {suggestion}
            </p>
          ))}
        </div>
      )}

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Password must have:</p>
          <ul className="space-y-1 text-xs">
            <li className={cn('flex items-center gap-2', hasMinLength ? 'text-green-600' : 'text-gray-500')}>
              <span className={cn('text-lg', hasMinLength ? '✓' : '○')}>{hasMinLength ? '✓' : '○'}</span>
              At least {PASSWORD_MIN_LENGTH} characters
            </li>
            <li className={cn('flex items-center gap-2', hasCharacterType ? 'text-green-600' : 'text-gray-500')}>
              <span className={cn('text-lg', hasCharacterType ? '✓' : '○')}>{hasCharacterType ? '✓' : '○'}</span>
              At least one: uppercase, lowercase, number, or special character
            </li>
            <li className={cn('flex items-center gap-2', isNotCommon ? 'text-green-600' : 'text-gray-500')}>
              <span className={cn('text-lg', isNotCommon ? '✓' : '○')}>{isNotCommon ? '✓' : '○'}</span>
              Not a common password
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
