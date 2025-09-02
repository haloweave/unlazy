"use client";

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Star, X } from 'lucide-react';

interface PowerUserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PowerUserFeedbackModal({ isOpen, onClose }: PowerUserFeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setFeedback('');
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFeedback('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex items-center space-x-1 text-yellow-500">
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                  <h2 className="text-lg font-semibold">You&apos;re a power user! 🚀</h2>
                </div>
                <p className="text-base leading-relaxed text-gray-600">
                  <strong>Help us shape the future of Unlazy</strong> - What&apos;s working? What&apos;s not working? What would you like to see in the future?
                </p>
              </div>

              {/* Content */}
              <div className="mb-6">
                <Textarea
                  value={feedback}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                  placeholder="Your honest feedback helps us build something amazing..."
                  className="min-h-[120px] resize-none w-full"
                />
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isSubmitting}
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
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}