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

export interface FactCheckIssue {
  text: string;
  issue: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
  category?: string;
  importance?: 'critical' | 'moderate' | 'minor';
}

interface GrammarSpellingIssue {
  text: string;
  type: 'grammar' | 'spelling';
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'suggestion';
  position?: { start: number; end: number };
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
  researchQuery?: string;
  onResearchComplete?: () => void;
  onSpellingIssuesChange?: (issues: GrammarSpellingIssue[]) => void;
  onFactCheckIssuesChange?: (issues: FactCheckIssue[]) => void;
  manualFactCheckTrigger?: number;
}

export default function AISidebar({ content, researchQuery, onResearchComplete, onSpellingIssuesChange, onFactCheckIssuesChange, manualFactCheckTrigger }: AISidebarProps) {
  const [factCheckEnabled, setFactCheckEnabled] = useState(true);
  const [grammarCheckEnabled, setGrammarCheckEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState('');
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [factCheckIssues, setFactCheckIssues] = useState<FactCheckIssue[]>([]);
  const [grammarSpellingIssues, setGrammarSpellingIssues] = useState<GrammarSpellingIssue[]>([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [isLoadingFactCheck, setIsLoadingFactCheck] = useState(false);
  const [isLoadingGrammarCheck, setIsLoadingGrammarCheck] = useState(false);
  const [showFactCheckDetails, setShowFactCheckDetails] = useState(true);
  const [showGrammarDetails, setShowGrammarDetails] = useState(true);
  const [researchHistory, setResearchHistory] = useState<ResearchSession[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [lastCheckedContent, setLastCheckedContent] = useState('');
  // Store current session data to restore when switching back
  const [currentSession, setCurrentSession] = useState<{
    query: string;
    summary: string;
    sources: ResearchSource[];
    followUpQuestions: string[];
  } | null>(null);

  // Research functionality
  const performSearch = useCallback(async (query: string) => {
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
        const sessionToSave: ResearchSession = {
          id: Date.now().toString(),
          query: searchQuery,
          summary,
          sources,
          followUpQuestions,
          timestamp: new Date()
        };
        
        // Only add if it's not a duplicate
        setResearchHistory(prev => {
          const isDuplicate = prev.some(session => 
            session.query === sessionToSave.query && session.summary === sessionToSave.summary
          );
          return isDuplicate ? prev : [sessionToSave, ...prev];
        });
      }
      
      // Set new research results
      setSummary(data.summary || '');
      setSources(data.sources || []);
      setFollowUpQuestions(data.followUpQuestions || []);
      
      // Update current session and reset index
      setCurrentSession({
        query,
        summary: data.summary || '',
        sources: data.sources || [],
        followUpQuestions: data.followUpQuestions || []
      });
      setCurrentSessionIndex(-1);
      console.log('Received follow-up questions:', data.followUpQuestions); // Debug log
    } catch (error) {
      console.error('Research error:', error);
      setSummary('');
      setSources([]);
      setFollowUpQuestions([]);
    } finally {
      setIsLoadingResearch(false);
    }
  }, [summary, searchQuery, sources, followUpQuestions, content]);

  // Fact checking functionality
  const performFactCheck = useCallback(async (text: string) => {
    // Use word count instead of character count for consistency
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (!text || wordCount < 3 || !factCheckEnabled) {
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
      
      const issues = Array.isArray(data.result) ? data.result : (data.result.issues || []);
      setFactCheckIssues(issues);
      onFactCheckIssuesChange?.(issues);
    } catch (error) {
      console.error('Fact-check error:', error);
      setFactCheckIssues([]);
      onFactCheckIssuesChange?.([]);
    } finally {
      setIsLoadingFactCheck(false);
    }
  }, [factCheckEnabled, setFactCheckIssues, setIsLoadingFactCheck, onFactCheckIssuesChange]);

  // Grammar and spelling checking functionality
  const performGrammarCheck = useCallback(async (text: string) => {
    // Use word count for consistency with fact checking
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (!text || wordCount < 2 || !grammarCheckEnabled) {
      setGrammarSpellingIssues([]);
      return;
    }

    setIsLoadingGrammarCheck(true);
    try {
      const response = await fetch('/api/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      if (!response.ok) throw new Error('Spell check request failed');

      const data = await response.json();
      
      // Filter out issues with invalid positions or empty text
      const validIssues = (data.issues || []).filter((issue: GrammarSpellingIssue) => 
        issue.text && issue.text.length > 0 && 
        issue.position && 
        issue.position.start >= 0 && 
        issue.position.end > issue.position.start
      );
      
      setGrammarSpellingIssues(validIssues);
      onSpellingIssuesChange?.(validIssues);
    } catch (error) {
      console.error('Spell check error:', error);
      setGrammarSpellingIssues([]);
      onSpellingIssuesChange?.([]);
    } finally {
      setIsLoadingGrammarCheck(false);
    }
  }, [grammarCheckEnabled, setGrammarSpellingIssues, setIsLoadingGrammarCheck, onSpellingIssuesChange]);

  // Debounced version of the fact check function
  const debouncedFactCheck = useMemo(
    () => debounce(performFactCheck, 2000),
    [performFactCheck]
  );

  // Debounced version of the grammar check function
  const debouncedGrammarCheck = useMemo(
    () => debounce(performGrammarCheck, 1500),
    [performGrammarCheck]
  );

  // Manual fact-check triggered by Ctrl+Space shortcut
  useEffect(() => {
    if (manualFactCheckTrigger && manualFactCheckTrigger > 0 && content) {
      const wordCount = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0).length;
      if (wordCount >= 3) {
        performFactCheck(content);
      }
    }
  }, [manualFactCheckTrigger, content, performFactCheck]);

  // Auto grammar-check when enabled - only for substantial content changes
  useEffect(() => {
    if (grammarCheckEnabled && content) {
      // Only trigger if the content has changed substantially (more than just formatting)
      const textContent = content.replace(/<[^>]*>/g, '').trim();
      const lastTextContent = lastCheckedContent.replace(/<[^>]*>/g, '').trim();
      const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
      
      if (textContent !== lastTextContent && wordCount >= 2) {
        debouncedGrammarCheck(content);
        setLastCheckedContent(content);
      }
    } else {
      setGrammarSpellingIssues([]);
    }
  }, [content, grammarCheckEnabled, debouncedGrammarCheck, lastCheckedContent]);

  // Handle incoming research queries from document editor
  useEffect(() => {
    if (researchQuery && researchQuery.trim()) {
      setSearchQuery(researchQuery);
      performSearch(researchQuery);
      // Call the completion callback after a short delay to allow research to start
      setTimeout(() => {
        onResearchComplete?.();
      }, 100);
    }
  }, [researchQuery, onResearchComplete, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const loadSession = (index: number) => {
    if (index === -1) {
      // Load current session - restore the actual current session data
      if (currentSession) {
        setSummary(currentSession.summary);
        setSources(currentSession.sources);
        setFollowUpQuestions(currentSession.followUpQuestions);
        setSearchQuery(currentSession.query);
      }
      setCurrentSessionIndex(-1);
      return;
    }
    
    const session = researchHistory[index];
    if (session) {
      // Load the historical session
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
    // Clear current research view
    setSummary('');
    setSources([]);
    setFollowUpQuestions([]);
    setSearchQuery('');
    setCurrentSession(null);
  };



  return (
    <Card className="h-[704px] overflow-hidden bg-white text-gray-900 border-gray-200 shadow-lg">
      <CardContent className="h-full flex flex-col pt-3 px-3 pb-0 space-y-3">
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
                  <DropdownMenuItem className="text-xs text-gray-900" asChild>
                    <div className="flex items-center justify-between w-full">
                      <span>Spell Check</span>
                      <Switch
                        checked={grammarCheckEnabled}
                        onCheckedChange={setGrammarCheckEnabled}
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
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-gray-600">
                {isLoadingResearch 
                  ? 'Researching...'
                  : isLoadingFactCheck
                    ? 'Fact-checking...'
                    : isLoadingGrammarCheck
                      ? 'Checking spelling...'
                      : ''
                }
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Fact Check Notification */}
                {factCheckEnabled && factCheckIssues.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFactCheckDetails(!showFactCheckDetails)}
                    className="h-auto p-1 flex items-center space-x-1 text-xs text-red-600 hover:text-red-700"
                    title={`Fact check errors: ${factCheckIssues.length}`}
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>{factCheckIssues.length}</span>
                  </Button>
                )}

                {/* Grammar Check Notification */}
                {grammarCheckEnabled && grammarSpellingIssues.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGrammarDetails(!showGrammarDetails)}
                    className="h-auto p-1 flex items-center space-x-1 text-xs text-orange-600 hover:text-orange-700"
                    title={`Grammar/spelling errors: ${grammarSpellingIssues.length}`}
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>{grammarSpellingIssues.length}</span>
                  </Button>
                )}

                {/* No Issues - Green Dot */}
                {factCheckEnabled && grammarCheckEnabled && factCheckIssues.length === 0 && grammarSpellingIssues.length === 0 && !isLoadingFactCheck && !isLoadingGrammarCheck && content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0).length >= 3 && lastCheckedContent.length > 0 && (
                  <div className="group relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
                      <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                        No errors detected
                        <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {(isLoadingFactCheck || isLoadingGrammarCheck) && (
                  <RefreshCw className="h-3 w-3 animate-spin text-gray-600" />
                )}
              </div>
            </div>
            
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Empty State - Your Writing Co-pilot */}
          {!summary && !isLoadingResearch && !isLoadingFactCheck && !isLoadingGrammarCheck && factCheckIssues.length === 0 && grammarSpellingIssues.length === 0 && content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0).length < 3 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Your writing co-pilot</h3>
                <p className="text-xs text-gray-500">Research, fact-check, and get insights as you write</p>
              </div>
            </div>
          )}

          {/* Research Loading Animation */}
          {isLoadingResearch && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full space-y-4"
            >
              <div className="relative w-20 h-20">
                {/* Animated particles */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-black rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                      transformOrigin: '0 0',
                    }}
                    animate={{
                      rotate: [0, 360],
                      scale: [0.8, 1.2, 0.8],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut",
                    }}
                    initial={{
                      x: Math.cos((i * 30) * Math.PI / 180) * 30,
                      y: Math.sin((i * 30) * Math.PI / 180) * 30,
                    }}
                  />
                ))}
                {/* Center pulsing dot */}
                <motion.div
                  className="absolute top-1/2 left-1/2 w-2 h-2 bg-black rounded-full"
                  style={{ transform: 'translate(-50%, -50%)' }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm font-medium text-gray-900">Researching...</p>
              </motion.div>
            </motion.div>
          )}
          

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col space-y-4">
            {/* Combined Issues Section - Unified scrollable list */}
            {(grammarSpellingIssues.length > 0 || factCheckIssues.length > 0) && !isLoadingResearch && (
              <div className={`${!summary ? 'flex-1 flex flex-col' : ''} border-t border-gray-200 pt-2`}>
                <div className={`space-y-2 px-2 overflow-y-auto ${!summary ? 'flex-1' : 'max-h-64'}`}>
                  {/* Grammar/Spelling Issues */}
                  {grammarCheckEnabled && showGrammarDetails && grammarSpellingIssues.map((issue, index) => (
                    <motion.div
                      key={`grammar-${index}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 hover:bg-gray-100 rounded-md p-3 space-y-2 cursor-pointer"
                    >
                      <div className="flex items-start space-x-2">
                        <Badge 
                          variant={issue.severity === 'error' ? 'destructive' : issue.severity === 'warning' ? 'secondary' : 'outline'}
                          className="text-xs font-medium flex-shrink-0"
                        >
                          {issue.type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-700 font-medium">&ldquo;</span>
                            <span className="text-xs text-red-600 font-medium underline decoration-wavy decoration-red-400">{issue.text}</span>
                            <span className="text-xs text-gray-700 font-medium">&rdquo;</span>
                            {issue.position && issue.position.start !== issue.position.end && (
                              <span className="text-xs text-gray-400">@{issue.position.start}</span>
                            )}
                          </div>
                          <p className="text-xs text-blue-600 mt-1">→ {issue.suggestion}</p>
                          {issue.issue && issue.issue !== 'Issue detected' && (
                            <p className="text-xs text-gray-500 mt-1 italic">{issue.issue}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Fact-Check Issues */}
                  {factCheckEnabled && showFactCheckDetails && factCheckIssues.map((issue, index) => (
                    <motion.div
                      key={`factcheck-${index}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 hover:bg-red-100 rounded-md p-3 space-y-2 cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        <Badge 
                          variant={issue.confidence === 'HIGH' ? 'destructive' : 'secondary'}
                          className="text-xs font-medium flex-shrink-0"
                        >
                          {issue.confidence}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 font-medium line-clamp-2">&ldquo;{issue.text}&rdquo;</p>
                          <p className="text-xs text-blue-600 mt-1">→ {issue.suggestion}</p>
                        </div>
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
          </div>

          {/* Subtle Co-pilot Messages */}
          {factCheckEnabled && grammarCheckEnabled && factCheckIssues.length === 0 && grammarSpellingIssues.length === 0 && !isLoadingFactCheck && !isLoadingGrammarCheck && !isLoadingResearch && content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0).length >= 3 && !summary && lastCheckedContent.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
              className="text-center py-8"
            >
              <p className="text-xs text-gray-400">
                {[
                  "watching you type...",
                  "keeping an eye on things...",
                  "quietly checking...",
                  "standing by...",
                  "all looks good...",
                  "smooth sailing..."
                ][Math.floor(Date.now() / 10000) % 6]}
              </p>
            </motion.div>
          )}
        </div>
        
        {/* Footer - Research History Pagination */}
        {(summary || researchHistory.length > 0) && (
          <div className="border-t border-gray-200 py-1 px-2 flex justify-center">
            <div className="flex items-center space-x-2">
              {/* Current session dot - show first if we have a summary */}
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
              {/* Historical sessions */}
              {researchHistory.map((session, index) => (
                <button
                  key={session.id}
                  onClick={() => loadSession(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    currentSessionIndex === index 
                      ? 'bg-gray-900' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  title={`${session.query.substring(0, 30)}${session.query.length > 30 ? '...' : ''}`}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Keyboard Shortcuts Footer */}
        <div className="pt-0 pb-1 px-3">
          <p className="text-xs text-center text-gray-400">
            {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'} + Space for fact checking
          </p>
        </div>
      </CardContent>
    </Card>
  );
}