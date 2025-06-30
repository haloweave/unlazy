"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Brain, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import FlashcardOptions from "./FlashcardOptions";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string;
  content: string;
  role: "user" | "gpt";
  timestamp: Date;
  isThinking?: boolean;
}

export default function ChatInterface() {
  const { } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<null | Array<{ label: string; text: string; correct: boolean }>>(null);

  useEffect(() => {
    if (!sessionId) {
      setSessionId(uuidv4());
    }
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, sessionId }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();

      if (data.type === 'flashcards') {
        // Always append a GPT message (even if empty) so flashcards render
        const responseMessage = {
          id: (Date.now() + 2).toString(),
          content: "", // No text, just a placeholder for GPT
          role: "gpt" as const,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, responseMessage]);
        setOptions(data.options);
        setIsLoading(false);
        return;
      } else if (data.type === 'message') {
        const responseMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: data.message,
          role: "gpt",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, responseMessage]);
        setOptions(null);
      }
      // Trigger brain food animation (this would be handled by a global state or context)
      // For now, we'll just log it
      // console.log(`Earned ${data.brainFoodEarned} brain food!`);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        content: "Sorry, I'm having trouble thinking right now. Please try again!",
        role: "gpt",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for when a flashcard is selected and GPT replies
  const handleFlashcardComplete = async (label: string, text: string): Promise<void> => {
    const userMessage = `User selected: ${label}. ${text}`;
    const userMsg: Message = {
      id: Date.now().toString(),
      content: userMessage,
      role: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setOptions(null); // Hide options after interaction
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();
      if (data.type === 'flashcards') {
        const responseMessage = {
          id: (Date.now() + 2).toString(),
          content: "",
          role: "gpt" as const,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, responseMessage]);
        setOptions(data.options);
      } else if (data.type === 'message') {
        const gptMsg: Message = {
          id: (Date.now() + 1).toString(),
          content: data.message,
          role: "gpt",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, gptMsg]);
        setOptions(null);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        content: "Sorry, I'm having trouble thinking right now. Please try again!",
        role: "gpt",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // In your render, only show the chat UI if sessionId is set
  if (!sessionId) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Welcome to Unlazy.ai!</p>
            <p className="text-sm">Ask me anything and let&apos;s think together.</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-900"
                } ${message.isThinking ? "bg-yellow-100 text-yellow-800" : ""}`}
              >
                <div className="flex items-start space-x-2">
                  {message.role === "gpt" && (
                    <Brain className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Render FlashcardOptions below the last GPT message if options exist */}
        {options && messages.length > 0 && messages[messages.length - 1].role === "gpt" && (
          <div className="mt-4">
            <FlashcardOptions
              options={options}
              onSelect={handleFlashcardComplete as (label: string, text: string) => void}
              sessionId={sessionId}
            />
          </div>
        )}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Always show input bar */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="h-5 w-5" />
          </motion.button>
        </form>
      </div>
    </div>
  );
} 