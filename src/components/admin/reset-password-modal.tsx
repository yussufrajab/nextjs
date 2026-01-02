'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, KeyRound, Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { validatePasswordComplexity, isCommonPassword } from '@/lib/password-utils';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  adminId: string;
  onSuccess: () => void;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  userId,
  username,
  adminId,
  onSuccess,
}: ResetPasswordModalProps) {
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [customPassword, setCustomPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate custom password if provided
    if (!autoGenerate) {
      if (customPassword.length < 8) {
        toast({
          title: 'Password Too Short',
          description: 'Password must be at least 8 characters.',
          variant: 'destructive',
        });
        return;
      }

      if (!validatePasswordComplexity(customPassword)) {
        toast({
          title: 'Weak Password',
          description: 'Password must contain at least one uppercase, lowercase, number, or special character.',
          variant: 'destructive',
        });
        return;
      }

      if (isCommonPassword(customPassword)) {
        toast({
          title: 'Common Password',
          description: 'This password is too common. Please choose a stronger password or use auto-generate.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          adminId,
          temporaryPassword: autoGenerate ? undefined : customPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setGeneratedPassword(data.data.temporaryPassword);

      toast({
        title: 'Password Reset Successfully',
        description: `Temporary password has been set for ${username}. Make sure to copy it before closing.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Reset Failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Temporary password copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !generatedPassword) {
      setCustomPassword('');
      setAutoGenerate(true);
      onClose();
    } else if (generatedPassword) {
      // Confirm before closing if password was generated
      if (confirm('Are you sure you want to close? Make sure you have copied the temporary password.')) {
        setGeneratedPassword(null);
        setCustomPassword('');
        setAutoGenerate(true);
        setCopied(false);
        setIsSubmitting(false);
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            Reset User Password
          </DialogTitle>
          <DialogDescription>
            Reset the password for <strong>{username}</strong>. A temporary password will be created that expires in 7 days.
          </DialogDescription>
        </DialogHeader>

        {!generatedPassword ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Temporary Password Policy</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Password expires in 7 days</li>
                    <li>User must change password on first login</li>
                    <li>User will receive a notification (if enabled)</li>
                    <li>This action will be logged in the audit trail</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="autoGenerate" className="text-sm font-medium">
                  Auto-Generate Password
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically create a secure random password
                </p>
              </div>
              <Switch
                id="autoGenerate"
                checked={autoGenerate}
                onCheckedChange={setAutoGenerate}
                disabled={isSubmitting}
              />
            </div>

            {!autoGenerate && (
              <div className="space-y-2">
                <Label htmlFor="customPassword">
                  Custom Temporary Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customPassword"
                  type="password"
                  placeholder="Enter custom password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                {customPassword && (
                  <PasswordStrengthMeter
                    password={customPassword}
                    showRequirements
                  />
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium mb-2">
                Password reset successfully!
              </p>
              <p className="text-xs text-green-700">
                Share this temporary password with the user securely. They must change it on first login.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedPassword}
                  readOnly
                  className="font-mono text-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>Important:</strong> This password will only be shown once. Make sure to copy it before closing this dialog.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleClose}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
