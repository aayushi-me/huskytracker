import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface Props {
  value: string;
  onChange: (html: string) => void;
  error?: boolean;
}

export const RichTextEditor: React.FC<Props> = ({ value, onChange, error }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write a detailed event description...",
      }),
    ],
    content: value,
    editable: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={`border rounded-lg ${
        error ? "border-red-500" : "border-gray-300"
      }`}
    >
      {/* Toolbar */}
      <div className="flex gap-2 p-2 border-b bg-gray-50">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={`px-2 py-1 rounded text-sm hover:bg-gray-100 ${
            editor.isActive("bold") ? "bg-primary/10 text-primary" : ""
          }`}
        >
          B
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
          }}
          className={`px-2 py-1 rounded text-sm hover:bg-gray-100 ${
            editor.isActive("italic") ? "bg-primary/10 text-primary" : ""
          }`}
        >
          I
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            // Toggle bullet list - works on selected paragraphs/blocks
            editor.chain().focus().toggleBulletList().run();
          }}
          className={`px-2 py-1 rounded text-sm hover:bg-gray-100 ${
            editor.isActive("bulletList") ? "bg-primary/10 text-primary" : ""
          }`}
        >
          • List
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            // Toggle H2 heading - converts current block to/from heading
            if (editor.isActive("heading", { level: 2 })) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().setHeading({ level: 2 }).run();
            }
          }}
          className={`px-2 py-1 rounded text-sm hover:bg-gray-100 ${
            editor.isActive("heading", { level: 2 })
              ? "bg-primary/10 text-primary"
              : ""
          }`}
        >
          H2
        </button>
      </div>

      {/* Editor Content */}
      <div className="p-3 min-h-[150px]">
        <EditorContent editor={editor} />
        <style>{`
          .ProseMirror {
            outline: none;
            min-height: 120px;
          }
          .ProseMirror:focus {
            outline: none;
          }
          .ProseMirror ul, .ProseMirror ol {
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          .ProseMirror ul {
            list-style-type: disc;
          }
          .ProseMirror li {
            margin: 0.25rem 0;
            display: list-item;
          }
          .ProseMirror li p {
            margin: 0;
          }
          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.3;
          }
          .ProseMirror p {
            margin: 0.5rem 0;
          }
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #9ca3af;
            pointer-events: none;
            height: 0;
          }
        `}</style>
      </div>
    </div>
  );
};
