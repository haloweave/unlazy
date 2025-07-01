"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Shield, AlertTriangle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

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



  return (
    <Card className="h-[704px] overflow-hidden bg-white text-gray-900 border-gray-200 shadow-lg">
      <CardContent className="h-full flex flex-col p-3 space-y-3">
        {/* Compact Header - Search & Controls */}
        <div className="space-y-2">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex space-x-2">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1"
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={isLoadingResearch || !searchQuery.trim()}
                size="sm"
                className="px-3"
              >
                {isLoadingResearch ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </motion.div>
          </form>

          {/* Status & Fact Check Toggle */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {isLoadingResearch 
                ? 'Researching...'
                : isLoadingFactCheck
                  ? 'Fact-checking...'
                  : factCheckEnabled && factCheckIssues.length > 0 
                    ? `${factCheckIssues.length} issue${factCheckIssues.length === 1 ? '' : 's'} found`
                    : summary 
                      ? 'Research complete'
                      : factCheckEnabled && content.length >= 100
                        ? 'Document verified'
                        : 'AI Copilot ready'
              }
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="fact-check-toggle" className="flex items-center space-x-2 text-xs cursor-pointer">
                <Shield className="h-3 w-3 text-gray-500" />
                <span className="sr-only">Fact Check</span>
              </Label>
              <Switch
                id="fact-check-toggle"
                checked={factCheckEnabled}
                onCheckedChange={setFactCheckEnabled}
                className="data-[state=checked]:bg-gray-900"
              />
              {isLoadingFactCheck && (
                <RefreshCw className="h-3 w-3 animate-spin text-gray-900" />
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Fact Check Issues */}
          {factCheckEnabled && factCheckIssues.length > 0 && (
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-semibold text-destructive">
                    Issues ({factCheckIssues.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {factCheckIssues.map((issue, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-md p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          issue.confidence === 'HIGH' ? 'bg-destructive/10 text-destructive' : 
                          issue.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {issue.confidence}
                        </span>
                      </div>
                      <p className="text-sm font-medium">&ldquo;{issue.text}&rdquo;</p>
                      <p className="text-xs text-muted-foreground">{issue.issue}</p>
                      <div className="bg-muted rounded p-2 border-l-2 border-primary">
                        <p className="text-xs">
                          💡 {issue.suggestion}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Research Summary */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4 space-y-4">
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
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty State */}
          {!summary && (!factCheckEnabled || factCheckIssues.length === 0) && !isLoadingResearch && !isLoadingFactCheck && (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-6 text-center">
                <Search className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-900 mb-1">AI Copilot Ready</h4>
                <p className="text-xs text-gray-600">Ask questions or start writing to get assistance</p>
              </CardContent>
            </Card>
          )}

          {/* Fact Check Success */}
          {factCheckEnabled && factCheckIssues.length === 0 && !isLoadingFactCheck && content.length >= 100 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-600" />
                <p className="text-xs font-medium text-green-800">No issues detected</p>
              </CardContent>
            </Card>
          )}

          {/* Loading States */}
          {isLoadingFactCheck && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <RefreshCw className="h-4 w-4 mx-auto mb-2 animate-spin text-blue-600" />
                <p className="text-xs text-blue-800">Fact-checking...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}