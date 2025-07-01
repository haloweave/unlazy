"use client";

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import DocumentEditor from '@/components/DocumentEditor'
import AISidebar from '@/components/AISidebar'
import { FileText, Clock, Menu, X, Edit2, Check, Trash2, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  const [lastSavedContent, setLastSavedContent] = useState('')
  const [lastSavedTitle, setLastSavedTitle] = useState('Untitled Document')

  // Autosave functionality using database
  const saveDocument = useCallback(async (titleToSave: string, contentToSave: string) => {
    if (!user) return;
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentDocId,
          title: titleToSave || 'Untitled Document',
          content: contentToSave,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save document')
      }

      const { document: savedDoc } = await response.json()
      
      setDocuments(prev => {
        const existingIndex = prev.findIndex(d => d.id === savedDoc.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = savedDoc
          return updated
        } else {
          return [savedDoc, ...prev]
        }
      })
      
      if (!currentDocId) {
        setCurrentDocId(savedDoc.id)
      }
      
      setLastSaved(new Date())
      setLastSavedContent(contentToSave)
      setLastSavedTitle(titleToSave)
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [user, currentDocId])



  // Autosave effect - only save when there are actual changes
  useEffect(() => {
    // Don't autosave if it's still the default state (no content and default title)
    if (!content && title === 'Untitled Document') return;
    
    // Don't autosave empty documents
    if (!title && !content) return;
    
    // Don't autosave if nothing has changed
    if (content === lastSavedContent && title === lastSavedTitle) return;
    
    const timer = setTimeout(() => {
      saveDocument(title, content)
    }, 3000) // Autosave after 3 seconds of inactivity

    return () => clearTimeout(timer)
  }, [title, content, saveDocument, lastSavedContent, lastSavedTitle])

  // Load documents on mount
  useEffect(() => {
    if (user) {
      const loadDocuments = async () => {
        try {
          const response = await fetch('/api/documents')
          if (response.ok) {
            const { documents: docs } = await response.json()
            setDocuments(docs)
          }
        } catch (error) {
          console.error('Failed to load documents:', error)
        }
      }
      loadDocuments()
    }
  }, [user])

  const loadDocument = (doc: Document) => {
    setTitle(doc.title)
    setContent(doc.content)
    setCurrentDocId(doc.id)
    setLastSavedContent(doc.content)
    setLastSavedTitle(doc.title)
    setShowHistory(false)
  }

  const createNewDocument = () => {
    setTitle('Untitled Document')
    setContent('')
    setCurrentDocId(null)
    setLastSavedContent('')
    setLastSavedTitle('Untitled Document')
    setShowHistory(false)
  }

  const deleteDocument = async (docId: string) => {
    try {
      const response = await fetch(`/api/documents?id=${docId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      setDocuments(prev => prev.filter(doc => doc.id !== docId))
      
      if (currentDocId === docId) {
        createNewDocument()
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  // PDF Export functionality
  const handleExportPDF = async () => {
    try {
      const html2canvasPro = (await import('html2canvas-pro')).default
      const jsPDF = (await import('jspdf')).default
      
      // Create a temporary container for the PDF content
      const element = document.createElement('div')
      element.style.padding = '40px'
      element.style.fontFamily = 'Georgia, serif'
      element.style.lineHeight = '1.6'
      element.style.color = '#333'
      element.style.maxWidth = '800px'
      element.style.margin = '0 auto'
      element.style.backgroundColor = '#ffffff'
      
      // Add title
      const titleElement = document.createElement('h1')
      titleElement.textContent = title === 'Untitled Document' ? 'Document' : title
      titleElement.style.fontSize = '24px'
      titleElement.style.fontWeight = 'bold'
      titleElement.style.marginBottom = '30px'
      titleElement.style.textAlign = 'center'
      titleElement.style.borderBottom = '2px solid #333'
      titleElement.style.paddingBottom = '10px'
      titleElement.style.color = '#333'
      element.appendChild(titleElement)
      
      // Add content - convert HTML to text preserving structure
      const contentElement = document.createElement('div')
      contentElement.innerHTML = content || '<p>No content available</p>'
      contentElement.style.fontSize = '12px'
      contentElement.style.lineHeight = '1.8'
      contentElement.style.color = '#333'
      element.appendChild(contentElement)
      
      // Add to DOM temporarily
      document.body.appendChild(element)
      
      // Use html2canvas-pro directly
      const canvas = await html2canvasPro(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Create PDF with jsPDF
      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      const pdf = new jsPDF('portrait', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      pdf.save(`${title === 'Untitled Document' ? 'document' : title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
      
      // Clean up
      document.body.removeChild(element)
    } catch (error) {
      console.error('PDF export failed:', error)
    }
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
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* History Sidebar - Hover Overlay */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="absolute left-0 top-0 bottom-0 w-80 bg-white border-r border-gray-200 flex flex-col shadow-xl z-20"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
                <Button
                  onClick={() => setShowHistory(false)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={createNewDocument}
                className="w-full mb-2"
              >
                New Document
              </Button>
              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="w-full flex items-center justify-center"
                disabled={!content}
              >
                <Download className="h-4 w-4 mr-2" />
                Export to PDF
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents yet</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`group relative rounded-lg border hover:bg-gray-50 transition-colors ${
                        currentDocId === doc.id ? 'border-black bg-black/5' : 'border-gray-200'
                      }`}
                    >
                      <Button
                        onClick={() => loadDocument(doc)}
                        variant="ghost"
                        className="w-full justify-start text-left p-3 pr-10 h-auto"
                      >
                        <div className="font-medium text-gray-900 truncate">{doc.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </div>
                      </Button>
                      
                      {/* Delete Button */}
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (confirm('Are you sure you want to delete this document?')) {
                            await deleteDocument(doc.id)
                          }
                        }}
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-2 transform -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all duration-200"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible backdrop for closing sidebar */}
      <AnimatePresence>
        {showHistory && (
          <div
            className="absolute inset-0 z-10"
            onClick={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 w-full">
        {/* Header */}
        <div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setShowHistory(true)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Menu className="h-5 w-5 text-gray-600" />
                </Button>
                
                {/* Editable Title */}
                {isEditingTitle ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={title === 'Untitled Document' ? '' : title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingTitle(false)
                        }
                      }}
                      className="text-lg font-medium text-gray-900 h-auto px-2 py-1 border-0 bg-transparent focus:ring-0 focus:border-0"
                      autoFocus
                    />
                    <Button
                      onClick={() => setIsEditingTitle(false)}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 group">
                    <h1 className={`text-lg font-medium cursor-pointer ${
                      title === 'Untitled Document' 
                        ? 'text-gray-400 italic' 
                        : 'text-gray-900'
                    }`}
                    onClick={() => setIsEditingTitle(true)}
                    >
                      {title === 'Untitled Document' ? 'Enter title here' : title}
                    </h1>
                    <Button
                      onClick={() => setIsEditingTitle(true)}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                {isSaving && (
                  <div className="flex items-center text-xs text-gray-400">
                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </div>
                )}
                
                {lastSaved && !isSaving && (
                  <span className="text-xs text-gray-400">
                    Saved
                  </span>
                )}
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

            {/* AI Copilot Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 h-fit">
                <AISidebar content={content} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}