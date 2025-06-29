"use client";

import { useState, useEffect } from "react";
import { Brain, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface BrainFoodCounterProps {
  initialCount?: number;
}

export default function BrainFoodCounter({ initialCount = 0 }: BrainFoodCounterProps) {
  const [count, setCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);
  const router = useRouter();

  // Simulate brain food earning (in real app, this would come from API)
  useEffect(() => {
    const interval = setInterval(() => {
      // Random chance to earn brain food
      if (Math.random() < 0.1) {
        setCount(prev => prev + 1);
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    router.push("/brain");
  };

  return (
    <motion.button
      onClick={handleClick}
      className="relative flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 cursor-pointer group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative">
        <Brain className="h-6 w-6 text-indigo-600" />
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <motion.span 
        className="font-bold text-gray-900 text-lg"
        key={count}
        initial={{ scale: 1.2, color: "#f59e0b" }}
        animate={{ scale: 1, color: "#111827" }}
        transition={{ duration: 0.3 }}
      >
        {count}
      </motion.span>
      
      <span className="text-sm text-gray-600 font-medium">Brain Food</span>
    </motion.button>
  );
} 