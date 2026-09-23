import React, { forwardRef, useImperativeHandle, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "./ui/button";

/**
 * Thin wrapper around react-signature-canvas. Exposes clear() and
 * getDataURL() (PNG data URL, or null if the pad is empty) so the parent
 * can validate "did they actually sign" before submitting.
 */
export const SignaturePad = forwardRef(({ className = "" }, ref) => {
    const padRef = useRef(null);

    useImperativeHandle(ref, () => ({
        clear: () => padRef.current?.clear(),
        isEmpty: () => padRef.current?.isEmpty() ?? true,
        getDataURL: () => {
            if (!padRef.current || padRef.current.isEmpty()) return null;
            // getTrimmedCanvas() (which crops the empty margins) depends on
            // the trim-canvas package, whose ESM/CJS interop breaks under
            // Vite's dep pre-bundling (react-signature-canvas 1.0.7 imports
            // it as a default export that doesn't resolve there). Untrimmed
            // margins are a cosmetic difference only, so read straight off
            // the underlying <canvas> instead of depending on that helper.
            return padRef.current.getCanvas().toDataURL("image/png");
        },
    }));

    return (
        <div className={className}>
            <div className="border rounded-md bg-white" style={{ touchAction: "none" }}>
                <SignatureCanvas
                    ref={padRef}
                    penColor="#2E2A26"
                    canvasProps={{ width: 500, height: 180, className: "w-full h-[180px]" }}
                />
            </div>
            <div className="flex justify-end mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => padRef.current?.clear()}>
                    Clear
                </Button>
            </div>
        </div>
    );
});

SignaturePad.displayName = "SignaturePad";
