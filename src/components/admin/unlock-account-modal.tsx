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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UnlockAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  adminId: string;
  onSuccess: () => void;
}

export function UnlockAccountModal({
  isOpen,
  onClose,
  userId,
  username,
  adminId,
  onSuccess,
}: UnlockAccountModalProps) {
  const [verificationNotes, setVerificationNotes] = useState('');
  const [identityVerified, setIdentityVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identityVerified) {
      toast({
        title: 'Verification Required',
        description: 'You must verify the user\'s identity before unlocking their account.',
        variant: 'destructive',
      });
      return;
    }

    if (verificationNotes.length < 10) {
      toast({
        title: 'Verification Notes Required',
        description: 'Please provide detailed verification notes (minimum 10 characters).',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/unlock-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          adminId,
          verificationNotes,
          identityVerified,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to unlock account');
      }

      toast({
        title: 'Account Unlocked',
        description: `Successfully unlocked account for ${username}.`,
      });

      setVerificationNotes('');
      setIdentityVerified(false);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Unlock Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setVerificationNotes('');
      setIdentityVerified(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Unlock User Account
          </DialogTitle>
          <DialogDescription>
            Unlock the account for <strong>{username}</strong>. Please verify the user's identity before proceeding.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Identity Verification Required</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Verify user's full name matches employment records</li>
                  <li>Confirm institution affiliation</li>
                  <li>Verify Employee ID or ZanID</li>
                  <li>Document method of verification (phone, email, in-person)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verificationNotes">
              Verification Notes <span className="text-red-500">*</span>
            </Label>
            <Input
              id="verificationNotes"
              placeholder="e.g., Verified via phone call on 2024-01-15. User confirmed full name, ZanID, and institution."
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[80px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. Include verification method and details.
            </p>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
            <Checkbox
              id="identityVerified"
              checked={identityVerified}
              onCheckedChange={(checked) => setIdentityVerified(checked as boolean)}
              disabled={isSubmitting}
            />
            <Label
              htmlFor="identityVerified"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I have verified the user's identity and confirm this unlock request is legitimate
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !identityVerified}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unlock Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
