"use client";

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import ListItem from '@tiptap/extension-list-item'
import FontFamily from '@tiptap/extension-font-family'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { 
  Bold, 
  Italic, 
  UnderlineIcon, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Type,
  Highlighter,
  ChevronDown,
  Search,
  Plus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

// Custom extension for error decorations
const ErrorDecorations = Extension.create({
  name: 'errorDecorations',
  
  addOptions() {
    return {
      errors: []
    }
  },
  
  addProseMirrorPlugins() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const extension = this
    
    return [
      new Plugin({
        key: new PluginKey('errorDecorations'),
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(transaction, decorationSet, oldState, newState) {
            const errors = extension.options.errors
            
            if (!errors || errors.length === 0) {
              return DecorationSet.empty
            }

            const decorations: Decoration[] = []
            const doc = newState.doc
            
            errors.forEach((error: GrammarSpellingIssue | FactCheckIssue) => {
              if ('type' in error && error.type === 'spelling') {
                const spellingError = error as GrammarSpellingIssue;
                if (spellingError.text) {
                  // Find all occurrences of the text in the document
                  const searchText = spellingError.text.toLowerCase();
                  
                  // Walk through the document to find text matches
                  doc.descendants((node, nodePos) => {
                    if (node.isText) {
                      const text = node.text?.toLowerCase() || '';
                      let index = 0;
                      
                      while ((index = text.indexOf(searchText, index)) !== -1) {
                        const start = nodePos + index;
                        const end = start + searchText.length;
                        
                        // Only add if within document bounds
                        if (start >= 0 && end <= doc.content.size) {
                          const decoration = Decoration.inline(
                            start,
                            end,
                            {
                              class: 'spelling-error',
                              title: `${spellingError.issue} - Suggestion: ${spellingError.suggestion}`
                            }
                          )
                          decorations.push(decoration)
                        }
                        
                        index += 1; // Move to next possible match
                      }
                    }
                    return true; // Continue traversing
                  });
                }
              } else if ('confidence' in error) { // FactCheckIssue has a 'confidence' property
                const factCheckError = error as FactCheckIssue;
                if (factCheckError.text) {
                  // Find the fact-check error text in the document
                  const searchText = factCheckError.text.toLowerCase();
                  
                  doc.descendants((node, nodePos) => {
                    if (node.isText) {
                      const text = node.text?.toLowerCase() || '';
                      const index = text.indexOf(searchText);
                      
                      if (index !== -1) {
                        const start = nodePos + index;
                        const end = start + searchText.length;
                        
                        if (start >= 0 && end <= doc.content.size) {
                          const decoration = Decoration.inline(
                            start,
                            end,
                            {
                              class: 'fact-check-error',
                              title: `${factCheckError.issue} - Suggestion: ${factCheckError.suggestion}`
                            }
                          )
                          decorations.push(decoration)
                        }
                        return false; // Stop after first match
                      }
                    }
                    return true;
                  });
                }
              }
            })
            
            return DecorationSet.create(doc, decorations)
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        }
      })
    ]
  }
})

interface GrammarSpellingIssue {
  text: string;
  type: 'grammar' | 'spelling';
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'suggestion';
  position?: { start: number; end: number };
}

interface FactCheckIssue {
  text: string;
  issue: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
  category?: string;
  importance?: 'critical' | 'moderate' | 'minor';
}

interface DocumentEditorProps {
  content?: string
  onChange?: (content: string) => void
  onResearchRequest?: (text: string) => void
  spellingIssues?: GrammarSpellingIssue[]
  factCheckIssues?: FactCheckIssue[]
}

export default function DocumentEditor({ content = '', onChange, onResearchRequest, spellingIssues = [], factCheckIssues = [] }: DocumentEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [showAlignPicker, setShowAlignPicker] = useState(false)
  const [researchIcon, setResearchIcon] = useState({ show: false, x: 0, y: 0, text: '' })
  const [selectedTextResearch, setSelectedTextResearch] = useState({ show: false, x: 0, y: 0, text: '' })
  const toolbarRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const fontPickerRef = useRef<HTMLDivElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const highlightPickerRef = useRef<HTMLDivElement>(null)
  const alignPickerRef = useRef<HTMLDivElement>(null)
  const selectionTimeout = useRef<NodeJS.Timeout | null>(null)
  const hideTimeout = useRef<NodeJS.Timeout | null>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        toolbarRef.current && 
        !toolbarRef.current.contains(event.target as Node) &&
        (!fontPickerRef.current || !fontPickerRef.current.contains(event.target as Node)) &&
        (!colorPickerRef.current || !colorPickerRef.current.contains(event.target as Node)) &&
        (!highlightPickerRef.current || !highlightPickerRef.current.contains(event.target as Node)) &&
        (!alignPickerRef.current || !alignPickerRef.current.contains(event.target as Node))
      ) {
        setShowColorPicker(false)
        setShowHighlightPicker(false)
        setShowFontPicker(false)
        setShowAlignPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFontPicker, showColorPicker, showHighlightPicker, showAlignPicker])

  // Handle mouse events for research icon (paragraph hover)
  useEffect(() => {
    if (!editorRef.current || selectedTextResearch.show) return // Don't show if text is selected

    function handleMouseMove(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('.ProseMirror')) return

      // Clear any pending hide timeout
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current)
        hideTimeout.current = null
      }

      // Get the text content of the current paragraph or sentence
      let textElement = target
      while (textElement && !['P', 'H1', 'H2', 'H3', 'LI'].includes(textElement.tagName)) {
        textElement = textElement.parentElement as HTMLElement
      }

      if (textElement && textElement.textContent && textElement.textContent.trim()) {
        const rect = textElement.getBoundingClientRect()
        const editorRect = editorRef.current!.getBoundingClientRect()
        
        setResearchIcon({
          show: true,
          x: rect.left - editorRect.left - 40, // Position to the left of the text
          y: rect.top - editorRect.top + (rect.height / 2), // Center vertically
          text: textElement.textContent.trim()
        })
      }
    }

    function handleMouseLeave() {
      // Add a delay before hiding to allow clicking the icon
      hideTimeout.current = setTimeout(() => {
        setResearchIcon({ show: false, x: 0, y: 0, text: '' })
      }, 300) // 300ms delay
    }

    const editorElement = editorRef.current
    editorElement.addEventListener('mousemove', handleMouseMove)
    editorElement.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      editorElement.removeEventListener('mousemove', handleMouseMove)
      editorElement.removeEventListener('mouseleave', handleMouseLeave)
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current)
      }
    }
  }, [selectedTextResearch.show])

  const handleResearchClick = () => {
    const textToResearch = selectedTextResearch.show ? selectedTextResearch.text : researchIcon.text
    if (textToResearch && onResearchRequest) {
      onResearchRequest(textToResearch)
      setResearchIcon({ show: false, x: 0, y: 0, text: '' })
      setSelectedTextResearch({ show: false, x: 0, y: 0, text: '' })
    }
  }
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        listItem: false,
      }),
      ListItem,
      Underline,
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ErrorDecorations.configure({
        errors: [...spellingIssues, ...factCheckIssues]
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    },
    onSelectionUpdate: ({ editor }) => {
      // Debounce selection updates to avoid expensive coordinate calculations
      if (selectionTimeout.current) {
        clearTimeout(selectionTimeout.current)
      }
      selectionTimeout.current = setTimeout(() => {
        const { from, to } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(from, to)

        if (selectedText.trim().length > 0) {
          const { view } = editor
          const start = view.coordsAtPos(from)
          const end = view.coordsAtPos(to)
          const editorRect = editorRef.current?.getBoundingClientRect()

          if (editorRect) {
            // Calculate position for the floating button
            const x = (start.left + end.left) / 2 - editorRect.left // Center horizontally
            const y = start.top - editorRect.top - 40 // Above the selection

            setSelectedTextResearch({
              show: true,
              x,
              y,
              text: selectedText.trim()
            })
          }
        } else {
          setSelectedTextResearch({ show: false, x: 0, y: 0, text: '' })
        }
      }, 150) // 150ms debounce
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[600px] p-8',
      },
    },
  })

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  // Update error decorations when issues change
  useEffect(() => {
    if (editor) {
      editor.extensionManager.extensions.forEach(extension => {
        if (extension.name === 'errorDecorations') {
          extension.options.errors = [...spellingIssues, ...factCheckIssues]
        }
      })
      // Force update decorations
      editor.view.dispatch(editor.state.tr)
    }
  }, [spellingIssues, factCheckIssues, editor])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeout.current) {
        clearTimeout(selectionTimeout.current)
      }
    }
  }, [])

  const colors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF',
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#22C55E', '#10B981', '#06B6D4', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#EC4899'
  ]

  const highlightColors = [
    '#FEF3C7', '#FED7AA', '#FECACA', '#F3E8FF',
    '#DBEAFE', '#D1FAE5', '#E0E7FF', '#FCE7F3'
  ]

  const fonts = [
    'Inter', 'Arial', 'Helvetica', 'Times New Roman', 
    'Georgia', 'Verdana', 'Courier New', 'Monaco'
  ]

  if (!editor) {
    return null
  }

  const MenuButton = ({ 
    onClick, 
    isActive, 
    children,
    className = ''
  }: { 
    onClick: () => void
    isActive: boolean
    children: React.ReactNode 
    className?: string
  }) => (
    <Button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      variant={isActive ? "secondary" : "ghost"}
      size="icon"
      className={`h-8 w-8 hover:scale-105 active:scale-95 transition-transform ${className}`}
    >
      {children}
    </Button>
  )

  const DropdownButton = ({ 
    isOpen, 
    onClick, 
    children 
  }: { 
    isOpen: boolean
    onClick: () => void
    children: React.ReactNode 
  }) => (
    <Button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      variant={isOpen ? "secondary" : "ghost"}
      className="flex items-center space-x-1 h-8 hover:scale-105 active:scale-95 transition-transform"
    >
      {children}
      <ChevronDown className="h-3 w-3" />
    </Button>
  )

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div ref={toolbarRef} className="border-b border-gray-200 p-4">
        <div className="flex items-center flex-wrap gap-2">
          {/* Font Family Dropdown */}
          <div className="relative">
            <DropdownButton
              isOpen={showFontPicker}
              onClick={() => {
                setShowColorPicker(false);
                setShowHighlightPicker(false);
                setShowAlignPicker(false);
                setShowFontPicker(!showFontPicker);
              }}
            >
              <Type className="h-4 w-4" />
              <span className="text-sm">Font</span>
            </DropdownButton>
            
            {showFontPicker && (
              <div ref={fontPickerRef} className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] w-48">
                {fonts.map(font => (
                  <Button
                    key={font}
                    onClick={() => {
                      editor.chain().focus().setFontFamily(font).run()
                      setShowFontPicker(false)
                    }}
                    variant="ghost"
                    className="w-full justify-start text-left px-3 py-2 h-auto"
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Basic Formatting */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
          >
            <Bold className="h-4 w-4" />
          </MenuButton>
          
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
          >
            <Italic className="h-4 w-4" />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
          >
            <UnderlineIcon className="h-4 w-4" />
          </MenuButton>

          <div className="w-px h-6 bg-gray-300" />

          {/* Text Color */}
          <div className="relative">
            <DropdownButton
              isOpen={showColorPicker}
              onClick={() => {
                setShowFontPicker(false);
                setShowHighlightPicker(false);
                setShowAlignPicker(false);
                setShowColorPicker(!showColorPicker);
              }}
            >
              <Palette className="h-4 w-4" />
              <span className="text-sm">Color</span>
            </DropdownButton>
            
            {showColorPicker && (
              <div ref={colorPickerRef} className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] p-3">
                <div className="grid grid-cols-4 gap-2 w-32">
                  {colors.map(color => (
                    <Button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run()
                        setShowColorPicker(false)
                      }}
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 p-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color */}
          <div className="relative">
            <DropdownButton
              isOpen={showHighlightPicker}
              onClick={() => {
                setShowFontPicker(false);
                setShowColorPicker(false);
                setShowAlignPicker(false);
                setShowHighlightPicker(!showHighlightPicker);
              }}
            >
              <Highlighter className="h-4 w-4" />
              <span className="text-sm">Highlight</span>
            </DropdownButton>
            
            {showHighlightPicker && (
              <div ref={highlightPickerRef} className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] p-3">
                <div className="grid grid-cols-4 gap-2 w-32">
                  <Button
                    onClick={() => {
                      editor.chain().focus().unsetHighlight().run()
                      setShowHighlightPicker(false)
                    }}
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 bg-white flex items-center justify-center text-xs p-0"
                  >
                    ×
                  </Button>
                  {highlightColors.map(color => (
                    <Button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setHighlight({ color }).run()
                        setShowHighlightPicker(false)
                      }}
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 p-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Headings */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
          >
            <Heading1 className="h-4 w-4" />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
          >
            <Heading2 className="h-4 w-4" />
          </MenuButton>

          <div className="w-px h-6 bg-gray-300" />

          {/* Text Alignment - Condensed to Dropdown */}
          <div className="relative">
            <DropdownButton
              isOpen={showAlignPicker}
              onClick={() => {
                setShowFontPicker(false);
                setShowColorPicker(false);
                setShowHighlightPicker(false);
                setShowAlignPicker(!showAlignPicker);
              }}
            >
              <AlignLeft className="h-4 w-4" />
              <span className="text-sm">Align</span>
            </DropdownButton>
            
            {showAlignPicker && (
              <div ref={alignPickerRef} className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] w-48">
                <div className="p-2">
                  {[
                    { icon: AlignLeft, label: 'Left', align: 'left' },
                    { icon: AlignCenter, label: 'Center', align: 'center' },
                    { icon: AlignRight, label: 'Right', align: 'right' },
                    { icon: AlignJustify, label: 'Justify', align: 'justify' }
                  ].map(({ icon: Icon, label, align }) => (
                    <Button
                      key={align}
                      onClick={() => {
                        editor.chain().focus().setTextAlign(align).run()
                        setShowAlignPicker(false)
                      }}
                      variant={editor.isActive({ textAlign: align }) ? "secondary" : "ghost"}
                      className="w-full justify-start flex items-center space-x-2 px-3 py-2 h-auto text-sm"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Lists */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
          >
            <List className="h-4 w-4" />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
          >
            <ListOrdered className="h-4 w-4" />
          </MenuButton>
        </div>
      </div>

      {/* Editor */}
      <div ref={editorRef} className="bg-white min-h-[600px] relative">
        <EditorContent 
          editor={editor} 
          className="document-editor"
        />
        
        {/* Floating Research Icon */}
        <AnimatePresence>
          {(selectedTextResearch.show || researchIcon.show) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 pointer-events-auto"
              style={{
                left: `${selectedTextResearch.show ? selectedTextResearch.x : researchIcon.x}px`,
                top: `${selectedTextResearch.show ? selectedTextResearch.y : researchIcon.y - 12}px`,
              }}
            >
              <motion.button
                onClick={handleResearchClick}
                onMouseEnter={() => {
                  // Keep the icon visible when hovering over it
                  if (hideTimeout.current) {
                    clearTimeout(hideTimeout.current)
                    hideTimeout.current = null
                  }
                }}
                className="w-6 h-6 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={`Research: "${(selectedTextResearch.show ? selectedTextResearch.text : researchIcon.text).substring(0, 50)}${(selectedTextResearch.show ? selectedTextResearch.text : researchIcon.text).length > 50 ? '...' : ''}"`}
              >
                <Search className="h-3 w-3" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom CSS for proper list rendering */}
      <style jsx global>{`
        .document-editor .ProseMirror {
          outline: none;
          padding: 2rem;
          min-height: 600px;
        }

        .document-editor .ProseMirror ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          padding-left: 0;
        }

        .document-editor .ProseMirror ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
          padding-left: 0;
        }

        .document-editor .ProseMirror li {
          margin: 0.25rem 0;
          padding-left: 0.5rem;
        }

        .document-editor .ProseMirror ul ul {
          list-style-type: circle;
        }

        .document-editor .ProseMirror ul ul ul {
          list-style-type: square;
        }

        .document-editor .ProseMirror ol ol {
          list-style-type: lower-alpha;
        }

        .document-editor .ProseMirror ol ol ol {
          list-style-type: lower-roman;
        }

        .document-editor .ProseMirror h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
        }

        .document-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0.75rem 0 0.5rem 0;
        }

        .document-editor .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 0.5rem 0 0.25rem 0;
        }

        .document-editor .ProseMirror p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        /* Squiggly underlines for errors */
        .spelling-error {
          text-decoration: underline;
          text-decoration-color: #EF4444;
          text-decoration-style: wavy;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
        }

        .fact-check-error {
          text-decoration: underline;
          text-decoration-color: #F59E0B;
          text-decoration-style: wavy;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
        }

        .document-editor .ProseMirror strong {
          font-weight: bold;
        }

        .document-editor .ProseMirror em {
          font-style: italic;
        }

        .document-editor .ProseMirror u {
          text-decoration: underline;
        }

        .document-editor .ProseMirror mark {
          border-radius: 0.25rem;
          padding: 0.1rem 0.2rem;
        }

        .document-editor .ProseMirror[style*="text-align: center"] {
          text-align: center;
        }

        .document-editor .ProseMirror[style*="text-align: right"] {
          text-align: right;
        }

        .document-editor .ProseMirror[style*="text-align: justify"] {
          text-align: justify;
        }
      `}</style>
    </div>
  )
}