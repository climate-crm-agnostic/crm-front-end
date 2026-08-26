import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2, Undo, Redo } from "lucide-react";

const ToolbarButton = ({ onClick, active, disabled, title, children }) => (
    <button
        type="button"
        onMouseDown={e => e.preventDefault()} // keep editor selection/focus when clicking a toolbar button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"} disabled:opacity-40 disabled:cursor-default`}
    >
        {children}
    </button>
);

// Controlled (value/onChange give/receive an HTML string, same shape the
// backend's EmailTemplate.html_body already stores) rich text editor for
// campaign template bodies. Exposes insertText(text) via ref so the merge
// field picker can drop a {contact.x} token at the current cursor position.
export const RichTextEditor = forwardRef(({ value, onChange, placeholder }, ref) => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value || "",
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: "min-h-[180px] max-h-[420px] overflow-y-auto p-3 text-sm focus:outline-none",
            },
        },
    });

    // Sync external value changes (e.g. loading a different template to
    // edit) without fighting the user's own typing/cursor position.
    useEffect(() => {
        if (!editor) return;
        if (editor.isFocused) return;
        if (value !== editor.getHTML()) {
            editor.commands.setContent(value || "", { emitUpdate: false });
        }
    }, [value, editor]);

    useImperativeHandle(ref, () => ({
        insertText: (text) => {
            editor?.chain().focus().insertContent(text).run();
        },
        // Replaces the whole body (e.g. the AI "Polish" result) — unlike the
        // value-sync effect above, this always emits onUpdate so the parent's
        // controlled value is updated to match, not just skipped while focused.
        setContent: (html) => {
            editor?.chain().focus().setContent(html || "", { emitUpdate: true }).run();
        },
    }), [editor]);

    if (!editor) return null;

    const isEmpty = editor.isEmpty;

    return (
        <div className="border rounded-md overflow-hidden bg-background">
            <div className="flex items-center gap-0.5 p-1.5 border-b bg-muted/30">
                <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
                    <Strikethrough className="h-3.5 w-3.5" />
                </ToolbarButton>
                <span className="w-px h-4 bg-border mx-1" />
                <ToolbarButton title="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <Heading2 className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Bullet List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Numbered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered className="h-3.5 w-3.5" />
                </ToolbarButton>
                <span className="w-px h-4 bg-border mx-1" />
                <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
                    <Undo className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
                    <Redo className="h-3.5 w-3.5" />
                </ToolbarButton>
            </div>
            <div className="relative">
                {isEmpty && placeholder && (
                    <p className="absolute top-3 left-3 text-sm text-muted-foreground pointer-events-none select-none">{placeholder}</p>
                )}
                <EditorContent editor={editor} />
            </div>
        </div>
    );
});

RichTextEditor.displayName = "RichTextEditor";
