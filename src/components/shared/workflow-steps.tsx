'use client';

import { cn } from '@/lib/utils';
import { Check, X, Circle } from 'lucide-react';

export interface WorkflowStep {
  label: string;
  status: 'completed' | 'active' | 'pending' | 'rejected';
}

interface WorkflowStepsProps {
  steps: WorkflowStep[];
}

export function WorkflowSteps({ steps }: WorkflowStepsProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.label} className="flex items-center">
            {/* Step dot + label */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              <div
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300',
                  step.status === 'completed' &&
                    'bg-green-500 border-green-500 text-white shadow-sm shadow-green-200',
                  step.status === 'active' &&
                    'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-200',
                  step.status === 'pending' &&
                    'bg-white border-gray-300 text-gray-300',
                  step.status === 'rejected' &&
                    'bg-red-500 border-red-500 text-white shadow-sm shadow-red-200'
                )}
              >
                {step.status === 'completed' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                {step.status === 'active' && <div className="h-3 w-3 rounded-full bg-white" />}
                {step.status === 'pending' && <Circle className="h-3.5 w-3.5 stroke-[1.5]" />}
                {step.status === 'rejected' && <X className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'mt-1.5 text-[11px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded transition-colors',
                  step.status === 'completed' && 'text-green-700 bg-green-50',
                  step.status === 'active' && 'text-blue-700 bg-blue-50',
                  step.status === 'pending' && 'text-gray-400',
                  step.status === 'rejected' && 'text-red-700 bg-red-50'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-1.5 mb-5 rounded-full transition-colors duration-300',
                  step.status === 'completed'
                    ? 'bg-green-400'
                    : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
