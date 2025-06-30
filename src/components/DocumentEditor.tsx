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
  ChevronDown
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

interface DocumentEditorProps {
  content?: string
  onChange?: (content: string) => void
}

export default function DocumentEditor({ content = '', onChange }: DocumentEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [showAlignPicker, setShowAlignPicker] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
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
  }, [])
  
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
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
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
    <motion.button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-black/10 text-black' 
          : 'text-gray-600 hover:bg-gray-100'
      } ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
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
    <motion.button
      type="button"
      onClick={onClick}
      className={`flex items-center space-x-1 p-2 rounded-lg transition-colors ${
        isOpen 
          ? 'bg-black/10 text-black' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
      <ChevronDown className="h-3 w-3" />
    </motion.button>
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
              onClick={() => setShowFontPicker(!showFontPicker)}
            >
              <Type className="h-4 w-4" />
              <span className="text-sm">Font</span>
            </DropdownButton>
            
            {showFontPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48">
                {fonts.map(font => (
                  <button
                    key={font}
                    onClick={() => {
                      editor.chain().focus().setFontFamily(font).run()
                      setShowFontPicker(false)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
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
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              <Palette className="h-4 w-4" />
              <span className="text-sm">Color</span>
            </DropdownButton>
            
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
                <div className="grid grid-cols-4 gap-2 w-32">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run()
                        setShowColorPicker(false)
                      }}
                      className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400"
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
              onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            >
              <Highlighter className="h-4 w-4" />
              <span className="text-sm">Highlight</span>
            </DropdownButton>
            
            {showHighlightPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
                <div className="grid grid-cols-4 gap-2 w-32">
                  <button
                    onClick={() => {
                      editor.chain().focus().unsetHighlight().run()
                      setShowHighlightPicker(false)
                    }}
                    className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 bg-white flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                  {highlightColors.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setHighlight({ color }).run()
                        setShowHighlightPicker(false)
                      }}
                      className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400"
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
              onClick={() => setShowAlignPicker(!showAlignPicker)}
            >
              <AlignLeft className="h-4 w-4" />
              <span className="text-sm">Align</span>
            </DropdownButton>
            
            {showAlignPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48">
                <div className="p-2">
                  {[
                    { icon: AlignLeft, label: 'Left', align: 'left' },
                    { icon: AlignCenter, label: 'Center', align: 'center' },
                    { icon: AlignRight, label: 'Right', align: 'right' },
                    { icon: AlignJustify, label: 'Justify', align: 'justify' }
                  ].map(({ icon: Icon, label, align }) => (
                    <button
                      key={align}
                      onClick={() => {
                        editor.chain().focus().setTextAlign(align).run()
                        setShowAlignPicker(false)
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        editor.isActive({ textAlign: align }) ? 'bg-black/10 text-black' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
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
      <div className="bg-white min-h-[600px]">
        <EditorContent 
          editor={editor} 
          className="document-editor"
        />
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