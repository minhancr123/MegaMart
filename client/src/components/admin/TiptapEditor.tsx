"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ToolbarButton = ({
  onClick,
  isActive,
  children,
  ariaLabel,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={cn(
      "px-2 py-1 text-sm rounded border transition-colors",
      isActive
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
    )}
  >
    {children}
  </button>
);

export default function TiptapEditor({ value, onChange, className }: TiptapEditorProps) {
  const editor = useEditor({
    // Avoid hydration mismatches when server-side rendering - render editor client-side only
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Image,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose max-w-none min-h-[400px] p-4 focus:outline-none text-gray-900",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep editor in sync when value changes externally (e.g., load initial data)
  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    if (value !== currentHTML) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const prevUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập URL", prevUrl || "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    if (!editor) return;
    const url = window.prompt("Nhập URL hình ảnh");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className={cn("border rounded-lg bg-white", className)}>
      <div className="flex flex-wrap gap-2 border-b p-3 bg-gray-50">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive("bold")}
          ariaLabel="Bold"
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive("italic")}
          ariaLabel="Italic"
        >
          I
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          isActive={editor?.isActive("underline")}
          ariaLabel="Underline"
        >
          U
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          isActive={editor?.isActive("strike")}
          ariaLabel="Strike"
        >
          S
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor?.isActive("heading", { level: 1 })}
          ariaLabel="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor?.isActive("heading", { level: 2 })}
          ariaLabel="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setParagraph().run()}
          isActive={editor?.isActive("paragraph")}
          ariaLabel="Paragraph"
        >
          P
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive("bulletList")}
          ariaLabel="Bullet list"
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive("orderedList")}
          ariaLabel="Ordered list"
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editor?.isActive("blockquote")}
          ariaLabel="Blockquote"
        >
          “Quote”
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          isActive={editor?.isActive({ textAlign: "left" })}
          ariaLabel="Align left"
        >
          ⬅
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          isActive={editor?.isActive({ textAlign: "center" })}
          ariaLabel="Align center"
        >
          ↔
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          isActive={editor?.isActive({ textAlign: "right" })}
          ariaLabel="Align right"
        >
          ➡
        </ToolbarButton>
        <ToolbarButton onClick={setLink} isActive={editor?.isActive("link")} ariaLabel="Link">
          Link
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().unsetLink().run()} ariaLabel="Unlink">
          Unlink
        </ToolbarButton>
        <ToolbarButton onClick={addImage} ariaLabel="Add image">
          Img
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="min-h-[400px]" />
    </div>
  );
}
