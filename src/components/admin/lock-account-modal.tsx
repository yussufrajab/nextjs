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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldOff, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LockAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  userRole: string;
  adminId: string;
  onSuccess: () => void;
}

export function LockAccountModal({
  isOpen,
  onClose,
  userId,
  username,
  userRole,
  adminId,
  onSuccess,
}: LockAccountModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reason.length < 10) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a detailed reason (minimum 10 characters).',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/lock-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          adminId,
          reason,
          notes,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to lock account');
      }

      toast({
        title: 'Account Locked',
        description: `Successfully locked account for ${username}.`,
      });

      setReason('');
      setNotes('');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Lock Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-red-600" />
            Lock User Account
          </DialogTitle>
          <DialogDescription>
            Lock the account for <strong>{username}</strong> ({userRole}). This will prevent the user from logging in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Security Action</p>
                <p className="text-xs">
                  Locking this account will immediately prevent the user from accessing the system.
                  The user will be notified and can only be unlocked by an administrator.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Lockout <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reason"
              placeholder="e.g., Suspected unauthorized access, security policy violation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. This reason will be logged and shown to the user.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              Additional Notes <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g., User reported suspicious activity. Awaiting security review."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Internal notes for administrators. Not shown to the user.
            </p>
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
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lock Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
