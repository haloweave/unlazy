"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from 'react';
import { CheckCircle, Search, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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

function AnimatedHeading() {
  const fullTextInitial = "Built to Assist—Not to write";
  const fullTextFinal = "Built to Assist, Not to write";
  const [displayedText, setDisplayedText] = useState(fullTextInitial);
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState('initial'); // 'initial', 'deleting', 'typing'
  const hyphenIndex = fullTextInitial.indexOf('—');
  const commaIndex = fullTextFinal.indexOf(',');

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    const typeSpeed = 100; // Speed for typing the comma
    const deleteSpeed = 80; // Speed for deleting the em-dash
    const pauseBeforeDelete = 1500; // Pause before starting deletion

    if (phase === 'initial') {
      timeout = setTimeout(() => {
        setPhase('deleting');
      }, pauseBeforeDelete);
    } else if (phase === 'deleting') {
      if (displayedText.length > hyphenIndex) {
        timeout = setTimeout(() => {
          setDisplayedText(fullTextInitial.substring(0, displayedText.length - 1));
        }, deleteSpeed);
      } else {
        setPhase('typing');
      }
    } else if (phase === 'typing') {
      if (displayedText.length < fullTextFinal.length) {
        timeout = setTimeout(() => {
          setDisplayedText(fullTextFinal.substring(0, displayedText.length + 1));
        }, typeSpeed);
      }
    }

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [displayedText, phase, fullTextInitial, fullTextFinal, hyphenIndex, commaIndex]);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <>
      {displayedText}
      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>|</span>
    </>
  );
}

export default function HomePage() {
  const { user } = useUser();


  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Document-like styling with subtle shadow */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-4xl mx-auto text-center px-4">
          {/* Hero Section - Centered */}
          <div className="mb-8 sm:mb-16">
            <div className="text-3xl sm:text-4xl md:text-6xl font-light text-gray-900 mb-6 sm:mb-8 leading-tight">
              <AnimatedHeading />
            </div>

            <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 font-light">
              Fact-check, research, and fix grammar - all in one place.
            </p>

            {/* CTA Button */}
            <div className="mb-8 sm:mb-16">
              <Button
                asChild
                size="lg"
                className="group h-12 sm:h-14 px-16 sm:px-24 text-sm sm:text-base font-medium rounded-lg bg-black hover:bg-black/90 transition-all duration-200"
              >
                <a href={user ? '/write' : '/sign-in'}>
                  <span>{user ? 'Continue Writing' : 'Write Smarter for free'}</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </div>

            {/* Condensed Message */}
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8 sm:mb-12 px-4">
              According to MIT, people are accumulating concerning amounts of cognitive debt because they offload writing to AI. AI is best used for fact-checking, fast, source-based research, and fixing grammar. Unlazy helps you do exactly that - without losing your voice.
            </p>

            {/* Minimal Features */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 text-gray-500">
              <span className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                Fact-checking
              </span>
              <span className="flex items-center text-sm">
                <Search className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                Research
              </span>
              <span className="flex items-center text-sm">
                <Zap className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0" />
                Thinking prompts
              </span>
            </div>

            {/* Idea TBD Widget */}
            <div className="mt-12 sm:mt-16">
              <a
                href="https://ideatbd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-shadow shadow-sm hover:shadow-md"
              >
                <div className="text-sm text-center">
                  <div><span role="img" aria-label="lightbulb">💡</span> <strong>Built by Idea TBD</strong></div>
                  <div className="text-xs">The Best Builder Community</div>
                </div>
              </a>
            </div>

          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 py-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <a
            href="https://haloweave.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Powered by <strong>Haloweave</strong> - Your AI product partner
          </a>
        </div>
      </footer>
      
    </div>
  );
}
