"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';

interface ResearchResult {
  title: string;
  url: string;
  text: string;
  highlights: string[];
  score: number;
  publishedDate?: string;
  author?: string;
}

interface ResearchSidebarProps {
  content: string;
}

export default function ResearchSidebar({ content }: ResearchSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'academic'>('search');
  const [autoSuggestions, setAutoSuggestions] = useState<string[]>([]);

  // Auto-generate research suggestions based on content
  const generateSuggestions = useCallback(
    debounce((text: string) => {
      if (!text || text.length < 50) return;

      // Extract key topics and entities from the text
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const suggestions = sentences
        .slice(-3) // Last 3 sentences
        .map(sentence => {
          // Extract main concepts
          const words = sentence.trim().split(' ');
          if (words.length < 5) return null;
          
          // Create research query from sentence
          return words.slice(0, 8).join(' ').replace(/[^\w\s]/g, '').trim();
        })
        .filter(Boolean) as string[];

      setAutoSuggestions(suggestions);
    }, 1000),
    []
  );

  useEffect(() => {
    generateSuggestions(content);
  }, [content, generateSuggestions]);

  const performSearch = async (query: string, type: 'search' | 'academic' = activeTab) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          type, 
          documentContent: content // Pass document content for LLM context
        }),
      });

      if (!response.ok) throw new Error('Research request failed');

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Research error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const TabButton = ({ 
    id, 
    label, 
    icon: Icon, 
    active 
  }: { 
    id: 'search' | 'academic';
    label: string;
    icon: any;
    active: boolean;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Research Assistant
        </h2>
        
        {/* Tabs */}
        <div className="flex space-x-1 mb-4">
          <TabButton
            id="search"
            label="General Search"
            icon={Search}
            active={activeTab === 'search'}
          />
          <TabButton
            id="academic"
            label="Academic Research"
            icon={BookOpen}
            active={activeTab === 'academic'}
          />
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${activeTab === 'academic' ? 'Find academic research...' : 'Search for information...'}`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <motion.button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </motion.button>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Auto Suggestions */}
        {autoSuggestions.length > 0 && results.length === 0 && !isLoading && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Suggested Research
            </h3>
            <div className="space-y-2">
              {autoSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(suggestion);
                    performSearch(suggestion);
                  }}
                  className="w-full text-left p-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm leading-tight">
                      {result.title}
                    </h3>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 ml-2 flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  
                  <p className="text-gray-600 text-xs mb-2 line-clamp-3">
                    {result.text}
                  </p>

                  {result.highlights && result.highlights.length > 0 && (
                    <div className="mb-2">
                      {result.highlights.slice(0, 2).map((highlight, i) => (
                        <div key={i} className="text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1 mb-1">
                          "{highlight}"
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {result.author && `${result.author} • `}
                      {result.publishedDate && new Date(result.publishedDate).toLocaleDateString()}
                    </span>
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      Score: {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {results.length === 0 && !isLoading && autoSuggestions.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Search className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              Start writing to get research suggestions, or search manually above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}