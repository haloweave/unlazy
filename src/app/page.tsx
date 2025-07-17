"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { CheckCircle, Search, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Cycling typing animation with backspace effect
function CyclingTypewriter({
  baseText="Built to Assist",
  cyclingWords=["—Not to Write.", ", Not to Write."],
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
  const { user } = useUser();


  return (
    <div
      className="min-h-screen bg-white relative overflow-hidden"
      style={{
        backgroundImage: `repeating-linear-gradient(
          to bottom,
          transparent,
          transparent 49px,
          rgba(12, 107, 0, 0.2) 49px,
          rgba(12, 107, 0, 0.2) 50px
        )`
      }}
    >
      <Navbar /> 
      {/* Document-like styling with subtle shadow */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-0 mt-8">
        <div className="max-w-4xl mx-auto text-center px-4">
          {/* Hero Section - Centered */}
          <div className="mb-8 flex flex-col items-center justify-center">
          <Image
            className="mb-4 w-40 h-9 sm:w-60 sm:h-14 md:w-80 md:h-18 lg:w-[400px] lg:h-[90px] md:mt-2 lg:mt-0"
            src="/assets/unlazy-logo.png"
            alt="Unlazy"
            width={0}
            height={0}
            sizes="(max-width: 768px) 160px, (max-width: 1024px) 240px, 400px"
            style={{ height: "auto" }}
          />

            <div className="text-3xl sm:text-3xl md:text-4xl lg:text-6xl font-light text-black/90 md:mt-4 lg:mt-2  leading-tight">
              <CyclingTypewriter
                baseText="Built to Assist"
                cyclingWords={["—Not to Write.", ", Not to Write."]}
                typeSpeed={120}
                deleteSpeed={80}
                pauseTime={2000}
              />
            </div>

            <p className="text-md text-black/70 mt-6 mb-6 sm:mt-5 lg:mt-6 lg:mb-10 font-light">
              Fact-check, research, and fix grammar - all in one place.
            </p>

            {/* CTA Button */}
            <div className="mb-8 md:mb-24 lg:mb-20 lg:mt-0 mt-5">
              <Button
                asChild
                size="lg"
                className="group h-12 sm:h-14 px-16 sm:px-24 text-sm sm:text-base font-medium rounded-full bg-[var(--brand-green)] hover:bg-[color-mix(in_srgb,var(--brand-green),#000_15%)] transition-all duration-200"
              >
                <a href={user ? '/write' : '/sign-in'}>
                  <span>{user ? 'Continue Writing' : 'Write Smarter for free'}</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </div>

            {/* Condensed Message */}
            <div className="flex flex-col items-center justify-center mb-12 sm:mt-8 md:mt-5 lg:mt-3">
              <p className="flex flex-col font-normal text-black/80 leading-relaxed max-w-3xl mx-auto">
                <span className="text-lg lg:text-xl font-light">
                  “According to MIT, <span className="font-bold">83% </span>
                  <span>of users who wrote with AI </span>
                </span>
                <span className="text-lg lg:text-xl font-light">
                  couldn’t recall a single sentence they had just written.”
                </span>
              </p>
              <div className="flex flex-row items-center justify-between w-full mt-0 md:mt-1">
                <Image src="/assets/mit-logo.png" alt="Unlazy" width={150} height={84} />
                <Link target="_blank" className="text-xs underline text-black/60 hover:text-black/80" href="https://www.media.mit.edu/publications/your-brain-on-chatgpt/">Your brain on chatGPT {'>'}</Link>
              </div>
            </div>

            {/* Minimal Features */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 text-black mt-0 lg:mb-1">
              <span className="flex items-center text-sm text-black/80">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                Fact Check
              </span>
              <span className="flex items-center text-sm text-black/80">
                <Search className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                Research
              </span>
              <span className="flex items-center text-sm text-black/80">
                <Zap className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0" />
                Grammar Check
              </span>
            </div>

            {/* Idea TBD Widget */}
            <div className="mt-12 md:mt-16 lg:mt-20">
              <a
                href="https://ideatbd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-black hover:bg-gray-100 transition-shadow shadow-sm hover:shadow-md"
              >
                <div className="text-sm text-center">
                  <div>
                    <strong><span role="img" aria-label="lightbulb">💡</span>Built by Idea TBD</strong>
                  </div>
                  <div className="text-xs">The Best Builder Community</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}