"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, AlertTriangle, CheckCircle, RefreshCw, Loader2, Settings, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface ResearchSession {
  id: string;
  query: string;
  summary: string;
  sources: ResearchSource[];
  followUpQuestions: string[];
  timestamp: Date;
}

interface AISidebarProps {
  content: string;
}

export default function AISidebar({ content }: AISidebarProps) {
  const [factCheckEnabled, setFactCheckEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState('');
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [factCheckIssues, setFactCheckIssues] = useState<FactCheckIssue[]>([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [isLoadingFactCheck, setIsLoadingFactCheck] = useState(false);
  const [showFactCheckDetails, setShowFactCheckDetails] = useState(false);
  const [researchHistory, setResearchHistory] = useState<ResearchSession[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);

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
      
      // Save current session to history if it exists
      if (summary && sources.length > 0) {
        const currentSession: ResearchSession = {
          id: Date.now().toString(),
          query: searchQuery,
          summary,
          sources,
          followUpQuestions,
          timestamp: new Date()
        };
        setResearchHistory(prev => [currentSession, ...prev]);
      }
      
      setSummary(data.summary || '');
      setSources(data.sources || []);
      setFollowUpQuestions(data.followUpQuestions || []);
      setCurrentSessionIndex(-1); // Reset to current session
      console.log('Received follow-up questions:', data.followUpQuestions); // Debug log
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

  const loadSession = (index: number) => {
    if (index === -1) {
      // Load current session - no change needed
      setCurrentSessionIndex(-1);
      return;
    }
    
    const session = researchHistory[index];
    if (session) {
      // Save current state to history if it's not already there
      if (currentSessionIndex === -1 && summary && sources.length > 0) {
        const currentSession: ResearchSession = {
          id: Date.now().toString(),
          query: searchQuery,
          summary,
          sources,
          followUpQuestions,
          timestamp: new Date()
        };
        setResearchHistory(prev => [currentSession, ...prev]);
      }
      
      setSummary(session.summary);
      setSources(session.sources);
      setFollowUpQuestions(session.followUpQuestions);
      setSearchQuery(session.query);
      setCurrentSessionIndex(index);
    }
  };

  const clearHistory = () => {
    setResearchHistory([]);
    setCurrentSessionIndex(-1);
  };



  return (
    <Card className="h-[704px] overflow-hidden bg-white text-gray-900 border-gray-200 shadow-lg">
      <CardContent className="h-full flex flex-col p-3 space-y-3">
        {/* Compact Header - Search & Controls */}
        <div className="space-y-2 relative">
          {/* Top Row - Search Input and Top-Right Buttons */}
          <div className="flex items-center space-x-2">
            <form onSubmit={handleSearch} className="flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask anything..."
                className="w-full"
              />
            </form>
            
            {/* Top-Right Controls */}
            <div className="flex items-center space-x-1">
              {/* Search Button */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => performSearch(searchQuery)}
                  disabled={isLoadingResearch || !searchQuery.trim()}
                  size="sm"
                  className="h-7 w-7 p-0 bg-blue-100 hover:bg-blue-200 text-blue-600 border-blue-200"
                  variant="outline"
                >
                  {isLoadingResearch ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Search className="h-3 w-3" />
                  )}
                </Button>
              </motion.div>
              
              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Settings className="h-3 w-3 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-gray-200">
                  <DropdownMenuLabel className="text-xs text-gray-900">Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem className="text-xs text-gray-900" asChild>
                    <div className="flex items-center justify-between w-full">
                      <span>Fact Check</span>
                      <Switch
                        checked={factCheckEnabled}
                        onCheckedChange={setFactCheckEnabled}
                        className="data-[state=checked]:bg-gray-900"
                      />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem 
                    className="text-xs text-red-600 hover:bg-red-50"
                    onClick={clearHistory}
                    disabled={researchHistory.length === 0}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Clear Research History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Status & History Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-600">
                {isLoadingResearch 
                  ? 'Researching...'
                  : isLoadingFactCheck
                    ? 'Fact-checking...'
                    : summary 
                      ? 'Research complete'
                      : factCheckEnabled && content.length >= 100
                        ? 'Document verified'
                        : ''
                }
              </div>
              
              {/* Fact Check Notification */}
              {factCheckEnabled && factCheckIssues.length > 0 && summary && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFactCheckDetails(!showFactCheckDetails)}
                  className="h-auto p-1 flex items-center space-x-1 text-xs text-red-600 hover:text-red-700"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>{factCheckIssues.length}</span>
                </Button>
              )}
              
              {isLoadingFactCheck && (
                <RefreshCw className="h-3 w-3 animate-spin text-gray-600" />
              )}
            </div>
            
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Fact Check Issues - Only show if no research or if details are expanded */}
          {factCheckEnabled && factCheckIssues.length > 0 && (!summary || showFactCheckDetails) && (
            <div className="bg-red-50/50 border border-red-200/50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <h3 className="text-sm font-medium text-red-900">
                  {factCheckIssues.length} Issue{factCheckIssues.length === 1 ? '' : 's'} Found
                </h3>
                {summary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFactCheckDetails(false)}
                    className="ml-auto h-auto p-1 text-xs text-red-600 hover:text-red-700"
                  >
                    ×
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {factCheckIssues.map((issue, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 border border-red-200/30 rounded-md p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={issue.confidence === 'HIGH' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {issue.confidence}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900">&ldquo;{issue.text}&rdquo;</p>
                    <p className="text-xs text-gray-600">{issue.issue}</p>
                    <div className="bg-blue-50/80 rounded p-2 border-l-2 border-blue-400">
                      <p className="text-xs text-gray-700">
                        💡 {issue.suggestion}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Research Summary */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50/50 rounded-lg p-4 space-y-4"
            >
                  {/* Summary with Citations */}
                  <div className="prose prose-sm max-w-none text-gray-900 [&>*]:text-gray-900">
                    <ReactMarkdown 
                      components={{
                        p: ({children}) => <p className="text-gray-900 leading-relaxed mb-3">{children}</p>,
                        strong: ({children}) => <strong className="text-gray-900 font-semibold">{children}</strong>,
                        em: ({children}) => <em className="text-gray-700">{children}</em>,
                        ul: ({children}) => <ul className="text-gray-900 list-disc pl-4 space-y-1">{children}</ul>,
                        ol: ({children}) => <ol className="text-gray-900 list-decimal pl-4 space-y-1">{children}</ol>,
                        li: ({children}) => <li className="text-gray-900">{children}</li>
                      }}
                    >
                      {summary}
                    </ReactMarkdown>
                    
                    
                    {/* Inline Citations */}
                    {sources.length > 0 && (
                      <div className="inline-flex flex-wrap gap-1 ml-1">
                        {sources.map((source, index) => (
                          <button
                            key={index}
                            onClick={() => window.open(source.url, '_blank')}
                            className="relative group inline-flex items-center"
                            title={source.title}
                          >
                            <span className="bg-gray-200/60 hover:bg-gray-300/80 text-gray-600 text-xs px-1.5 py-0.5 rounded-full transition-colors font-medium">
                              {index + 1}
                            </span>
                            
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-xs whitespace-normal shadow-lg">
                                <div className="font-medium">{source.title}</div>
                                {source.author && (
                                  <div className="text-gray-300 mt-1">{source.author}</div>
                                )}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Follow-up Questions */}
                  {followUpQuestions.length > 0 && (
                    <div className="space-y-2 pt-4">
                      <div className="grid grid-cols-1 gap-2">
                        {followUpQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSearchQuery(question.replace('?', ''));
                              performSearch(question.replace('?', ''));
                            }}
                            className="w-full text-left p-3 text-sm text-gray-700 bg-gray-50/80 hover:bg-gray-100/80 rounded-lg transition-colors border-0 leading-relaxed"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
            </motion.div>
          )}


          {/* Fact Check Success */}
          {factCheckEnabled && factCheckIssues.length === 0 && !isLoadingFactCheck && content.length >= 100 && !summary && (
            <div className="bg-green-50/80 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <p className="text-xs font-medium text-green-800">No issues detected</p>
            </div>
          )}

          {/* Loading States */}
          {isLoadingFactCheck && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-4 text-center">
              <RefreshCw className="h-4 w-4 mx-auto mb-2 animate-spin text-blue-600" />
              <p className="text-xs text-blue-800">Fact-checking...</p>
            </div>
          )}
        </div>
        
        {/* Footer - Research History Pagination */}
        {(summary || researchHistory.length > 0) && (
          <div className="border-t border-gray-200 py-1 px-2 flex justify-center">
            <div className="flex items-center space-x-2">
              {researchHistory.map((_, index) => (
                <button
                  key={index}
                  onClick={() => loadSession(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    currentSessionIndex === index 
                      ? 'bg-gray-900' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  title={`Session ${index + 1}`}
                />
              ))}
              {/* Current session dot */}
              {summary && (
                <button
                  onClick={() => loadSession(-1)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    currentSessionIndex === -1 
                      ? 'bg-blue-500' 
                      : 'bg-blue-300 hover:bg-blue-400'
                  }`}
                  title="Current session"
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}