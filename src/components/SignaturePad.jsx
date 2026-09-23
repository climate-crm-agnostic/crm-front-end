import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Button } from "./ui/button";

const STROKE_COLOR = "#2E2A26";
const STROKE_WIDTH = 2.5;

/**
 * Native <canvas> signature pad — no third-party library (no
 * react-signature-canvas/trim-canvas, whose ESM/CJS interop breaks under
 * Vite's dep pre-bundling — see git history). Pointer Events cover mouse,
 * touch and pen with one API. All drawing state lives in refs, not React
 * state, so a pointermove never triggers a re-render — that's what keeps
 * the stroke smooth under fast movement.
 *
 * Exposes clear()/isEmpty()/getDataURL() (PNG data URL, or null if the pad
 * is empty) so the parent can validate "did they actually sign" before
 * submitting — same contract the previous implementation had.
 */
export const SignaturePad = forwardRef(({ className = "" }, ref) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef(null);
    const hasStrokeRef = useRef(false);

    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        // Backing-store resolution scales with devicePixelRatio so the
        // stroke isn't blurry on retina/mobile; CSS size (w-full h-full on
        // the fixed-height container below) stays the on-screen size.
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        // Solid white, never transparent — this PNG gets printed as-is onto
        // the final contract PDF.
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.lineWidth = STROKE_WIDTH;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = STROKE_COLOR;
        ctxRef.current = ctx;
        hasStrokeRef.current = false;
    }, []);

    useEffect(() => {
        setupCanvas();
        // A resize/rotation changes the coordinate system entirely — reset
        // rather than try to rescale the existing stroke; simpler, and the
        // case (mid-signature rotation) is rare enough not to matter.
        window.addEventListener("resize", setupCanvas);
        return () => window.removeEventListener("resize", setupCanvas);
    }, [setupCanvas]);

    const getRelativePoint = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drawingRef.current = true;
        lastPointRef.current = getRelativePoint(e);
    };

    const handlePointerMove = (e) => {
        if (!drawingRef.current) return;
        const point = getRelativePoint(e);
        const ctx = ctxRef.current;
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        lastPointRef.current = point;
        hasStrokeRef.current = true;
    };

    const stopDrawing = () => {
        drawingRef.current = false;
        lastPointRef.current = null;
    };

    useImperativeHandle(ref, () => ({
        clear: setupCanvas,
        isEmpty: () => !hasStrokeRef.current,
        getDataURL: () => (hasStrokeRef.current ? canvasRef.current.toDataURL("image/png") : null),
    }), [setupCanvas]);

    return (
        <div className={className}>
            <div ref={containerRef} className="border rounded-md bg-white overflow-hidden" style={{ touchAction: "none", height: 180 }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    style={{ touchAction: "none" }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                />
            </div>
            <div className="flex justify-end mt-2">
                <Button type="button" variant="outline" size="sm" onClick={setupCanvas}>
                    Clear
                </Button>
            </div>
        </div>
    );
});

SignaturePad.displayName = "SignaturePad";
