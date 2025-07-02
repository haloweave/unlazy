"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';

interface FactCheckIssue {
  text: string;
  issue: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
  category?: string;
  importance?: 'critical' | 'moderate' | 'minor';
}

interface FactCheckResult {
  mode: string;
  result: FactCheckIssue[] | { summary: string; issues: FactCheckIssue[]; verificationNeeded: string[] };
  contentLength: number;
  processingTime: number;
}

interface FactCheckPanelProps {
  content: string;
  isActive: boolean;
}

export default function FactCheckPanel({ content, isActive }: FactCheckPanelProps) {
  const [issues, setIssues] = useState<FactCheckIssue[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checkMode, setCheckMode] = useState<'realtime' | 'detailed'>('realtime');

  // Real-time fact checking with debounce
  const performFactCheck = useCallback(async (text: string, mode: 'realtime' | 'detailed' = 'realtime') => {
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (!text || wordCount < 3) {
      setIssues([]);
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch('/api/factcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, mode }),
      });

      if (!response.ok) throw new Error('Fact-check request failed');

      const data: FactCheckResult = await response.json();
      
      if (Array.isArray(data.result)) {
        // Real-time mode returns array directly
        setIssues(data.result);
      } else {
        // Detailed mode returns object with issues array
        setIssues(data.result.issues || []);
      }
      
      setLastChecked(new Date());
    } catch (error) {
      console.error('Fact-check error:', error);
      setIssues([]);
    } finally {
      setIsChecking(false);
    }
  }, [setIssues, setIsChecking, setLastChecked]);

  // Debounced version of the fact check function
  const debouncedFactCheck = useMemo(
    () => debounce(performFactCheck, 2000),
    [performFactCheck]
  );

  // Effect for real-time checking
  useEffect(() => {
    if (isActive && checkMode === 'realtime' && content) {
      debouncedFactCheck(content, 'realtime');
    }
  }, [content, isActive, checkMode, debouncedFactCheck]);

  // Manual detailed check
  const runDetailedCheck = () => {
    if (content) {
      performFactCheck(content, 'detailed');
    }
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

  if (!isActive) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Fact Checker
          </h2>
          <div className="flex items-center space-x-2">
            {isChecking && (
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
            )}
            <button
              onClick={runDetailedCheck}
              disabled={isChecking || !content}
              className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors"
            >
              Deep Check
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setCheckMode('realtime')}
            className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              checkMode === 'realtime'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Real-time
          </button>
          <button
            onClick={() => setCheckMode('detailed')}
            className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              checkMode === 'detailed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Detailed
          </button>
        </div>

        {/* Status */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            {issues.length === 0 ? 'No issues detected' : `${issues.length} potential issues`}
          </span>
          {lastChecked && (
            <span>
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {content.trim().split(/\s+/).filter(word => word.length > 0).length < 3 && (
          <div className="text-center text-gray-500 py-8">
            <CheckCircle className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              Write at least 3 words to start fact-checking
            </p>
          </div>
        )}

        {content.trim().split(/\s+/).filter(word => word.length > 0).length >= 3 && issues.length === 0 && !isChecking && (
          <div className="text-center text-green-600 py-8">
            <CheckCircle className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm font-medium">
              No fact-checking issues detected
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Your content looks good!
            </p>
          </div>
        )}

        {/* Issues List */}
        <AnimatePresence>
          {issues.length > 0 && (
            <div className="space-y-3">
              {issues.map((issue, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-lg p-4 ${getConfidenceColor(issue.confidence)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getConfidenceIcon(issue.confidence)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-50">
                          {issue.confidence}
                        </span>
                        {issue.category && (
                          <span className="text-xs text-gray-600 capitalize">
                            {issue.category.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium mb-1">
                        &ldquo;{issue.text}&rdquo;
                      </p>
                      
                      <p className="text-sm mb-2">
                        {issue.issue}
                      </p>
                      
                      <div className="bg-white bg-opacity-50 rounded-md p-2">
                        <p className="text-xs font-medium text-gray-700">
                          Suggestion: {issue.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isChecking && (
          <div className="text-center text-gray-500 py-8">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-indigo-600" />
            <p className="text-sm">
              Analyzing content for factual accuracy...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}