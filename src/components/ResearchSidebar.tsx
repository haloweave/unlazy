"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ExternalLink, BookOpen, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';
import ReactMarkdown from 'react-markdown';

interface ResearchResult {
  title: string;
  url: string;
  text: string;  
  highlights: string[];
  score: number;
  publishedDate?: string;
  author?: string;
}

interface ResearchSource {
  title: string;
  url: string;
  author?: string;
}

interface ResearchSidebarProps {
  content: string;
}

export default function ResearchSidebar({ content }: ResearchSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [summary, setSummary] = useState('');
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'academic'>('search');
  const [autoSuggestions, setAutoSuggestions] = useState<string[]>([]);
  const [showSources, setShowSources] = useState(false);

  // Auto-generate research suggestions based on content
  const generateSuggestions = useCallback((text: string) => {
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
  }, [setAutoSuggestions]);

  // Debounced version of the suggestions function
  const debouncedGenerateSuggestions = useMemo(
    () => debounce(generateSuggestions, 1000),
    [generateSuggestions]
  );

  useEffect(() => {
    debouncedGenerateSuggestions(content);
  }, [content, debouncedGenerateSuggestions]);

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
      setSummary(data.summary || '');
      setSources(data.sources || []);
      setFollowUpQuestions(data.followUpQuestions || []);
      setShowSources(false); // Reset sources visibility
    } catch (error) {
      console.error('Research error:', error);
      setResults([]);
      setSummary('');
      setSources([]);
      setFollowUpQuestions([]);
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
    icon: React.ComponentType<{ className?: string }>;
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-500"
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

        {/* Research Summary */}
        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Summary Content */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </div>

              {/* Follow-up Questions */}
              {followUpQuestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Related</h4>
                  {followUpQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(question.replace('?', ''));
                        performSearch(question.replace('?', ''));
                      }}
                      className="w-full text-left p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              {/* Sources Section */}
              {sources.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={() => setShowSources(!showSources)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3"
                  >
                    <span>Sources ({sources.length})</span>
                    {showSources ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showSources && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        {sources.map((source, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-2 p-2 bg-white rounded border border-gray-100 hover:border-gray-200 transition-colors"
                          >
                            <span className="text-xs font-medium text-gray-500 mt-1 flex-shrink-0">
                              [{index + 1}]
                            </span>
                            <div className="flex-1 min-w-0">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium line-clamp-2"
                              >
                                {source.title}
                              </a>
                              {source.author && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {source.author}
                                </p>
                              )}
                            </div>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!summary && !isLoading && autoSuggestions.length === 0 && (
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