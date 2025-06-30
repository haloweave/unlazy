"use client";

import { useState, useCallback, useEffect } from 'react';
import { Search, Shield, AlertTriangle, CheckCircle, AlertCircle, Clock, RefreshCw, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';

interface FactCheckIssue {
  text: string;
  issue: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
  category?: string;
  importance?: 'critical' | 'moderate' | 'minor';
}

interface ResearchResult {
  title: string;
  url: string;
  text: string;
  highlights: string[];
  score: number;
  publishedDate?: string;
  author?: string;
}

interface TabbedSidebarProps {
  content: string;
}

export default function TabbedSidebar({ content }: TabbedSidebarProps) {
  const [factCheckEnabled, setFactCheckEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [factCheckIssues, setFactCheckIssues] = useState<FactCheckIssue[]>([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [isLoadingFactCheck, setIsLoadingFactCheck] = useState(false);
  const [lastFactChecked, setLastFactChecked] = useState<Date | null>(null);

  // Research functionality
  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoadingResearch(true);
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          type: 'search',
          documentContent: content
        }),
      });

      if (!response.ok) throw new Error('Research request failed');

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Research error:', error);
      setResults([]);
    } finally {
      setIsLoadingResearch(false);
    }
  };

  // Fact checking functionality
  const performFactCheck = useCallback(
    debounce(async (text: string) => {
      if (!text || text.length < 100 || !factCheckEnabled) {
        setFactCheckIssues([]);
        return;
      }

      setIsLoadingFactCheck(true);
      try {
        const response = await fetch('/api/factcheck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text, mode: 'realtime' }),
        });

        if (!response.ok) throw new Error('Fact-check request failed');

        const data = await response.json();
        
        if (Array.isArray(data.result)) {
          setFactCheckIssues(data.result);
        } else {
          setFactCheckIssues(data.result.issues || []);
        }
        
        setLastFactChecked(new Date());
      } catch (error) {
        console.error('Fact-check error:', error);
        setFactCheckIssues([]);
      } finally {
        setIsLoadingFactCheck(false);
      }
    }, 2000),
    [factCheckEnabled]
  );

  // Auto fact-check when enabled
  useEffect(() => {
    if (factCheckEnabled && content) {
      performFactCheck(content);
    } else {
      setFactCheckIssues([]);
    }
  }, [content, factCheckEnabled, performFactCheck]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return 'text-red-700 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'LOW': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM': return <AlertCircle className="h-4 w-4" />;
      case 'LOW': return <Clock className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Research</h2>
          </div>
          
          {/* Fact Check Toggle */}
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Fact Check</span>
            <motion.button
              onClick={() => setFactCheckEnabled(!factCheckEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                factCheckEnabled ? 'bg-black' : 'bg-gray-200'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  factCheckEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
                layout
              />
            </motion.button>
            {isLoadingFactCheck && (
              <RefreshCw className="h-4 w-4 animate-spin text-black" />
            )}
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for information..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <motion.button
            type="submit"
            disabled={isLoadingResearch || !searchQuery.trim()}
            className="bg-black text-white p-2 rounded-lg hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoadingResearch ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </motion.button>
        </form>

        {/* Status */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            {factCheckEnabled && factCheckIssues.length > 0 
              ? `${factCheckIssues.length} fact-check issues`
              : results.length > 0 
                ? `${results.length} research results`
                : 'Start searching or writing to see results'
            }
          </span>
          {lastFactChecked && factCheckEnabled && (
            <span>
              Last checked: {lastFactChecked.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Fact Check Issues (when enabled and found) */}
        {factCheckEnabled && factCheckIssues.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Fact Check Issues
            </h3>
            <div className="space-y-3">
              {factCheckIssues.map((issue, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-3 ${getConfidenceColor(issue.confidence)}`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getConfidenceIcon(issue.confidence)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">"{issue.text}"</p>
                      <p className="text-xs mb-2">{issue.issue}</p>
                      <div className="bg-white bg-opacity-50 rounded p-2">
                        <p className="text-xs font-medium">
                          Suggestion: {issue.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Research Results */}
        {results.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Research Results
            </h3>
            <div className="space-y-4">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm leading-tight">
                      {result.title}
                    </h4>
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
                        <div key={i} className="text-xs text-black bg-black/5 rounded px-2 py-1 mb-1">
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
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && (!factCheckEnabled || factCheckIssues.length === 0) && !isLoadingResearch && !isLoadingFactCheck && (
          <div className="text-center text-gray-500 py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm mb-2">Start researching</p>
            <p className="text-xs text-gray-400">
              Search above or toggle fact-checking to get started
            </p>
          </div>
        )}

        {/* Fact Check Enabled but No Issues */}
        {factCheckEnabled && factCheckIssues.length === 0 && !isLoadingFactCheck && content.length >= 100 && (
          <div className="text-center text-green-600 py-8">
            <CheckCircle className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm font-medium">No fact-checking issues detected</p>
            <p className="text-xs text-gray-500 mt-1">Your content looks good!</p>
          </div>
        )}

        {/* Fact Check Loading */}
        {isLoadingFactCheck && (
          <div className="text-center text-gray-500 py-8">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-black" />
            <p className="text-sm">Analyzing content for factual accuracy...</p>
          </div>
        )}
      </div>
    </div>
  );
}