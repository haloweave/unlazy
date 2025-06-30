"use client";

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import DocumentEditor from '@/components/DocumentEditor'
import TabbedSidebar from '@/components/TabbedSidebar'
import { FileText, Save, Clock, Menu, X, Edit2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function DocumentPage() {
  const { user } = useUser()
  const [title, setTitle] = useState('Untitled Document')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [currentDocId, setCurrentDocId] = useState<string | null>(null)

  // Autosave functionality
  const saveDocument = useCallback(async (titleToSave: string, contentToSave: string) => {
    if (!user) return;
    
    setIsSaving(true)
    try {
      // TODO: Replace with actual database save
      // For now, simulate save and store in localStorage
      const doc: Document = {
        id: currentDocId || Date.now().toString(),
        title: titleToSave || 'Untitled Document',
        content: contentToSave,
        createdAt: currentDocId ? documents.find(d => d.id === currentDocId)?.createdAt || new Date() : new Date(),
        updatedAt: new Date()
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Save to localStorage (replace with actual database)
      const savedDocs = JSON.parse(localStorage.getItem('documents') || '[]')
      const existingIndex = savedDocs.findIndex((d: Document) => d.id === doc.id)
      
      if (existingIndex >= 0) {
        savedDocs[existingIndex] = doc
      } else {
        savedDocs.unshift(doc)
        setCurrentDocId(doc.id)
      }
      
      localStorage.setItem('documents', JSON.stringify(savedDocs))
      setDocuments(savedDocs)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [user, currentDocId, documents])

  // Manual save
  const handleSave = () => {
    saveDocument(title, content)
  }

  // Autosave effect
  useEffect(() => {
    if (!title && !content) return;
    
    const timer = setTimeout(() => {
      saveDocument(title, content)
    }, 2000) // Autosave after 2 seconds of inactivity

    return () => clearTimeout(timer)
  }, [title, content, saveDocument])

  // Load documents on mount
  useEffect(() => {
    if (user) {
      const savedDocs = JSON.parse(localStorage.getItem('documents') || '[]')
      setDocuments(savedDocs)
    }
  }, [user])

  const loadDocument = (doc: Document) => {
    setTitle(doc.title)
    setContent(doc.content)
    setCurrentDocId(doc.id)
    setShowHistory(false)
  }

  const createNewDocument = () => {
    setTitle('Untitled Document')
    setContent('')
    setCurrentDocId(null)
    setShowHistory(false)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Please sign in to access the document editor.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-80 bg-white border-r border-gray-200 flex flex-col"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={createNewDocument}
                className="w-full bg-black text-white px-4 py-2 rounded-lg hover:bg-black/90 transition-colors"
              >
                New Document
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents yet</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => loadDocument(doc)}
                      className={`w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors ${
                        currentDocId === doc.id ? 'border-black bg-black/5' : 'border-gray-200'
                      }`}
                    >
                      <div className="font-medium text-gray-900 truncate">{doc.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowHistory(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Menu className="h-5 w-5 text-gray-600" />
                </button>
                
                <FileText className="h-6 w-6 text-black" />
                
                {/* Editable Title */}
                {isEditingTitle ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingTitle(false)
                        }
                      }}
                      className="text-lg font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black"
                      autoFocus
                    />
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 group">
                    <h1 className="text-lg font-semibold text-gray-900">
                      {title}
                    </h1>
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-opacity"
                    >
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                {isSaving && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </div>
                )}
                
                {lastSaved && !isSaving && (
                  <span className="text-sm text-gray-500">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                
                <motion.button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Document Editor */}
            <div className="lg:col-span-2">
              <DocumentEditor 
                content={content}
                onChange={setContent}
              />
            </div>

            {/* Tabbed Sidebar */}
            <div className="lg:col-span-1">
              <TabbedSidebar content={content} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}