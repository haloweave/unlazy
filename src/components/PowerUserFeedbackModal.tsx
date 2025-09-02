"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Star } from 'lucide-react';

interface PowerUserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PowerUserFeedbackModal({ isOpen, onClose }: PowerUserFeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFeedback('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/power-user-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });

      if (response.ok) {
        setFeedback('');
        setIsSubmitting(false);
        onClose();
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Failed to submit power user feedback:', error);
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Still mark as shown even if they skip
    fetch('/api/power-user-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: 'User skipped feedback' }),
    }).catch(console.error);
    
    setFeedback('');
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    setFeedback('');
    setIsSubmitting(false);
    onClose();
  };

  // Don't render anything if not open to ensure clean unmount
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onPointerDownOutside={handleClose} 
        onEscapeKeyDown={handleClose}
        onInteractOutside={handleClose}
      >
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-yellow-500">
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
            </div>
            <DialogTitle className="text-lg">You&apos;re a power user! 🚀</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed">
            <strong>Help us shape the future of Unlazy</strong> - What&apos;s working? What&apos;s not working? What would you like to see in the future?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Textarea
            value={feedback}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
            placeholder="Your honest feedback helps us build something amazing..."
            className="min-h-[120px] resize-none"
          />
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="sm:mr-2"
          >
            Maybe later
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !feedback.trim()}
            className="bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              'Send Feedback'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}