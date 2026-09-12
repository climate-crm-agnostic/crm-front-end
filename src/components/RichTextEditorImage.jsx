import { useCallback, useRef } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import BaseImage from "@tiptap/extension-image";
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";

const MIN_WIDTH = 40;
const MAX_WIDTH = 800;

// align → inline styles so the layout survives being pasted into an email
// client, which ignores our CSS classes (float for left/right, centered
// block for center — no alignment attribute means "inline, natural flow").
const alignToStyle = (align) => {
    if (align === "center") return "display:block;margin-left:auto;margin-right:auto;";
    if (align === "left") return "float:left;margin:0 1em 1em 0;";
    if (align === "right") return "float:right;margin:0 0 1em 1em;";
    return "";
};

const ImageNodeView = ({ node, updateAttributes, deleteNode, selected }) => {
    const { src, alt, title, width, align } = node.attrs;
    const imgRef = useRef(null);
    const dragState = useRef(null);

    const startResize = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const startWidth = imgRef.current?.getBoundingClientRect().width || width || 200;
        dragState.current = { startX: e.clientX, startWidth };

        const onMove = (moveEvent) => {
            if (!dragState.current) return;
            const delta = moveEvent.clientX - dragState.current.startX;
            const next = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragState.current.startWidth + delta)));
            updateAttributes({ width: next });
        };
        const onUp = () => {
            dragState.current = null;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    }, [updateAttributes, width]);

    // The wrapper must reflect the alignment so the preview inside the editor
    // matches the emailed HTML: center → a block that centers itself with
    // auto margins (and shrinks to the image with a fit-content width);
    // left/right → a float; none → natural inline flow.
    const wrapperStyle =
        align === "center"
            ? { display: "block", marginLeft: "auto", marginRight: "auto", width: "fit-content" }
            : align === "left" || align === "right"
                ? { float: align }
                : undefined;

    return (
        <NodeViewWrapper
            as="span"
            className="relative inline-block"
            data-drag-handle
            style={wrapperStyle}
        >
            {selected && (
                <span className="absolute -top-9 left-0 z-10 flex items-center gap-0.5 rounded-md border bg-background p-1 shadow-md" contentEditable={false}>
                    <button
                        type="button"
                        title="Alinear a la izquierda"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateAttributes({ align: align === "left" ? null : "left" })}
                        className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${align === "left" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
                    >
                        <AlignLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        title="Centrar"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateAttributes({ align: align === "center" ? null : "center" })}
                        className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${align === "center" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
                    >
                        <AlignCenter className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        title="Alinear a la derecha"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateAttributes({ align: align === "right" ? null : "right" })}
                        className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${align === "right" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
                    >
                        <AlignRight className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-px h-4 bg-border mx-0.5" />
                    <button
                        type="button"
                        title="Eliminar imagen"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => deleteNode()}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </span>
            )}
            <img
                ref={imgRef}
                src={src}
                alt={alt || ""}
                title={title}
                style={{
                    ...(width ? { width: `${width}px` } : {}),
                    maxWidth: "100%",
                    display: align === "center" ? "block" : (align ? undefined : "inline-block"),
                }}
                className={selected ? "ring-2 ring-primary rounded-sm" : "rounded-sm"}
            />
            {selected && (
                <span
                    onPointerDown={startResize}
                    title="Arrastrar para cambiar el tamaño"
                    className="absolute bottom-0 right-0 h-3 w-3 translate-x-1/2 translate-y-1/2 rounded-sm border border-primary-foreground bg-primary cursor-nwse-resize"
                    contentEditable={false}
                />
            )}
        </NodeViewWrapper>
    );
};

// Extends the stock Image node with `width`/`align` attributes rendered as
// inline styles (see alignToStyle) so campaign HTML bodies keep their
// layout once they leave the editor and get emailed out verbatim.
export const ResizableImage = BaseImage.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: (el) => {
                    const value = el.style.width || el.getAttribute("width");
                    return value ? parseInt(value, 10) : null;
                },
            },
            align: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-align") || null,
            },
        };
    },

    renderHTML({ HTMLAttributes }) {
        const { width, align, ...rest } = HTMLAttributes;
        const style = `${alignToStyle(align)}${width ? `width:${width}px;` : ""}`;
        return ["img", { ...rest, ...(align ? { "data-align": align } : {}), style: style || undefined }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImageNodeView);
    },
});
