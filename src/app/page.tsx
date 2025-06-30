"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Search, FileText, Zap, ArrowRight, AlertTriangle } from "lucide-react";

// Cycling typing animation with backspace effect
function CyclingTypewriter({ 
  baseText = "AI copilot for ", 
  cyclingWords = ["writing", "articles", "essays", "research", "stories", "blogs"], 
  className = "", 
  typeSpeed = 120,
  deleteSpeed = 80,
  pauseTime = 2000 
}: { 
  baseText?: string;
  cyclingWords?: string[];
  className?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseTime?: number;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const currentWord = cyclingWords[currentWordIndex];
    const currentWordPart = isDeleting 
      ? currentWord.substring(0, displayedText.length - baseText.length - 1)
      : currentWord.substring(0, displayedText.length - baseText.length + 1);

    if (!isDeleting && displayedText === baseText + currentWord) {
      // Finished typing current word, pause then start deleting
      setIsPaused(true);
      setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseTime);
      return;
    }

    if (isDeleting && displayedText === baseText) {
      // Finished deleting, move to next word
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % cyclingWords.length);
      return;
    }

    if (!isPaused) {
      const timeout = setTimeout(() => {
        if (isDeleting) {
          setDisplayedText(baseText + currentWordPart);
        } else {
          setDisplayedText(baseText + currentWordPart);
        }
      }, isDeleting ? deleteSpeed : typeSpeed);

      return () => clearTimeout(timeout);
    }
  }, [displayedText, currentWordIndex, isDeleting, isPaused, baseText, cyclingWords, typeSpeed, deleteSpeed, pauseTime]);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className={className}>
      {displayedText}
      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>|</span>
    </span>
  );
}

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const handleStartWriting = () => {
    if (user) {
      // User is logged in, redirect to /write
      router.push('/write');
    } else {
      // User is not logged in, redirect to login page
      router.push('/sign-in');
    }
  };


  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Document-like styling with subtle shadow */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section - Centered */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-6xl font-light text-gray-900 mb-8 leading-tight whitespace-nowrap"
            >
              <CyclingTypewriter 
                baseText="AI copilot for Writing "
                cyclingWords={["Articles", "Essays", "Research", "Stories", "Blogs", "Content", "Papers", "Reports"]}
                typeSpeed={120}
                deleteSpeed={80}
                pauseTime={2000}
              />
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="text-xl text-gray-600 mb-12 font-light"
            >
              Stops you being lazy
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              className="mb-16"
            >
              <motion.button
                onClick={handleStartWriting}
                disabled={!isLoaded}
                className="group inline-flex h-12 items-center justify-center rounded-full bg-black px-8 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{user ? 'Continue Writing' : 'Start Writing'}</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>

            {/* Condensed Message */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3 }}
              className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto mb-12"
            >
              While AI makes writers lazy with content generators, we empower your thinking with real-time fact-checking, 
              research assistance, and cognitive prompts. Perfect for students, journalists, and critical thinkers.
            </motion.p>

            {/* Minimal Features */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3.3 }}
              className="flex justify-center items-center space-x-8 text-gray-500"
            >
              <span className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Fact-checking
              </span>
              <span className="flex items-center text-sm">
                <Search className="h-4 w-4 text-blue-600 mr-2" />
                Research
              </span>
              <span className="flex items-center text-sm">
                <Zap className="h-4 w-4 text-yellow-600 mr-2" />
                Thinking prompts
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
