"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Shield, AlertTriangle, CheckCircle, RefreshCw, ExternalLink, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import ReactMarkdown from 'react-markdown';

interface FactCheckIssue {
  text: string;
  issue: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
  category?: string;
  importance?: 'critical' | 'moderate' | 'minor';
}

interface ResearchSource {
  title: string;
  url: string;
  author?: string;
}

interface TabbedSidebarProps {
  content: string;
}

export default function TabbedSidebar({ content }: TabbedSidebarProps) {
  const [factCheckEnabled, setFactCheckEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState('');
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [factCheckIssues, setFactCheckIssues] = useState<FactCheckIssue[]>([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [isLoadingFactCheck, setIsLoadingFactCheck] = useState(false);

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
      setSummary(data.summary || '');
      setSources(data.sources || []);
      setFollowUpQuestions(data.followUpQuestions || []);
      console.log('Received follow-up questions:', data.followUpQuestions); // Debug log
      setShowSources(false);
    } catch (error) {
      console.error('Research error:', error);
      setSummary('');
      setSources([]);
      setFollowUpQuestions([]);
    } finally {
      setIsLoadingResearch(false);
    }
  };

  // Fact checking functionality
  const performFactCheck = useCallback(async (text: string) => {
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
    } catch (error) {
      console.error('Fact-check error:', error);
      setFactCheckIssues([]);
    } finally {
      setIsLoadingFactCheck(false);
    }
  }, [factCheckEnabled, setFactCheckIssues, setIsLoadingFactCheck]);

  // Debounced version of the fact check function
  const debouncedFactCheck = useMemo(
    () => debounce(performFactCheck, 2000),
    [performFactCheck]
  );

  // Auto fact-check when enabled
  useEffect(() => {
    if (factCheckEnabled && content) {
      debouncedFactCheck(content);
    } else {
      setFactCheckIssues([]);
    }
  }, [content, factCheckEnabled, debouncedFactCheck]);

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


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col max-h-[80vh] overflow-hidden">
      {/* Compact Header */}
      <div className="p-2 bg-gray-50 border-b border-gray-200">
        {/* Search Input at Top */}
        <form onSubmit={handleSearch} className="flex space-x-1 mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent"
          />
          <motion.button
            type="submit"
            disabled={isLoadingResearch || !searchQuery.trim()}
            className="bg-black text-white p-1.5 rounded hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoadingResearch ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </motion.button>
        </form>

        {/* Fact Check Toggle */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {factCheckEnabled && factCheckIssues.length > 0 
              ? `${factCheckIssues.length} issues found`
              : summary 
                ? 'Research ready'
                : 'Ask me anything'
            }
          </div>
          
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3 text-gray-500" />
            <div className="relative group">
              <motion.button
                onClick={() => setFactCheckEnabled(!factCheckEnabled)}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                  factCheckEnabled ? 'bg-black' : 'bg-gray-200'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    factCheckEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                  layout
                />
              </motion.button>
            </div>
            {isLoadingFactCheck && (
              <RefreshCw className="h-3 w-3 animate-spin text-black" />
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Fact Check Issues (when enabled and found) */}
        {factCheckEnabled && factCheckIssues.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-red-700 mb-2 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Issues ({factCheckIssues.length})
            </h3>
            <div className="space-y-2">
              {factCheckIssues.map((issue, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded p-2 ${getConfidenceColor(issue.confidence)}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        issue.confidence === 'HIGH' ? 'bg-red-100 text-red-700' : 
                        issue.confidence === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {issue.confidence}
                      </span>
                    </div>
                    <p className="text-xs font-medium">&ldquo;{issue.text}&rdquo;</p>
                    <p className="text-xs text-gray-600">{issue.issue}</p>
                    <div className="bg-white bg-opacity-70 rounded p-1.5 border-l-2 border-gray-300">
                      <p className="text-xs text-gray-700">
                        💡 {issue.suggestion}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Compact Research Summary */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* Summary Content */}
            <div className="bg-gray-50 rounded p-2 border border-gray-200">
              <div className="text-xs text-gray-700 leading-relaxed">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            </div>

            {/* Follow-up Questions */}
            {followUpQuestions.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-gray-700">Related</h4>
                {followUpQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(question.replace('?', ''));
                      performSearch(question.replace('?', ''));
                    }}
                    className="w-full text-left p-2 text-xs text-gray-700 bg-white border border-gray-200 rounded hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {/* Compact Sources */}
            {sources.length > 0 && (
              <div className="border-t border-gray-200 pt-2">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 hover:text-gray-900 mb-1"
                >
                  <span>Sources ({sources.length})</span>
                  {showSources ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {showSources && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1"
                  >
                    {sources.map((source, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-1 p-1.5 bg-white rounded border border-gray-100 hover:border-gray-200 transition-colors"
                      >
                        <span className="text-xs font-medium text-gray-500 flex-shrink-0">
                          [{index + 1}]
                        </span>
                        <div className="flex-1 min-w-0">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium line-clamp-2"
                          >
                            {source.title}
                          </a>
                          {source.author && (
                            <p className="text-xs text-gray-500 mt-0.5">
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
              </div>
            )}
          </motion.div>
        )}

        {/* Compact Empty State */}
        {!summary && (!factCheckEnabled || factCheckIssues.length === 0) && !isLoadingResearch && !isLoadingFactCheck && (
          <div className="text-center text-gray-500 py-6">
            <Search className="h-6 w-6 mx-auto mb-2 text-gray-300" />
            <p className="text-xs">Ask me anything or start writing</p>
          </div>
        )}

        {/* Fact Check Success */}
        {factCheckEnabled && factCheckIssues.length === 0 && !isLoadingFactCheck && content.length >= 100 && (
          <div className="text-center text-green-600 py-4">
            <CheckCircle className="h-5 w-5 mx-auto mb-2" />
            <p className="text-xs font-medium">No issues detected</p>
          </div>
        )}

        {/* Loading States */}
        {isLoadingFactCheck && (
          <div className="text-center text-gray-500 py-4">
            <RefreshCw className="h-4 w-4 mx-auto mb-2 animate-spin text-black" />
            <p className="text-xs">Fact-checking...</p>
          </div>
        )}
      </div>
    </div>
  );
}