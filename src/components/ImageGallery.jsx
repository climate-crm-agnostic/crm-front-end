import { useRef, useState } from "react";
import { ImagePlus, Trash2, Star, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

const toast = (icon, text) =>
    Swal.fire({ icon, title: icon === 'error' ? 'Error' : 'Notice', text, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });

/**
 * Photo gallery for anything with a `list_of_images` (catalogue items, variants).
 *
 * images — presigned URLs to display; paths — the matching S3 paths, used to
 * identify an image when removing/reordering (never position). The first image
 * is the cover. `api` is { upload(files), remove(path), reorder(paths) } and
 * each call returns { list_of_images, image_paths } which is handed to onChange.
 */
export const ImageGallery = ({ images = [], paths = [], api, onChange, max = 20, disabled = false }) => {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const run = async (action) => {
        setBusy(true);
        try {
            const res = await action();
            onChange?.({ images: res.list_of_images || [], paths: res.image_paths || [] });
        } catch (err) {
            toast('error', err.message);
        } finally {
            setBusy(false);
        }
    };

    const upload = (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
        if (!files.length) return toast('error', 'Choose image files (jpg, png, gif or webp).');
        if (paths.length + files.length > max) return toast('error', `At most ${max} images (you have ${paths.length}).`);
        run(() => api.upload(files));
    };

    const remove = async (path) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Remove this image?', text: 'It is deleted from storage and cannot be recovered.',
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Remove',
        });
        if (isConfirmed) run(() => api.remove(path));
    };

    const move = (from, to) => {
        if (to < 0 || to >= paths.length) return;
        const next = [...paths];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        run(() => api.reorder(next));
    };

    const btn = "h-7 w-7 inline-flex items-center justify-center rounded-md bg-background/90 text-foreground shadow hover:bg-background disabled:opacity-40";

    return (
        <div className="space-y-2" aria-busy={busy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {images.map((url, idx) => (
                    <div key={paths[idx] || url} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                        <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />
                        {idx === 0 && (
                            <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                Cover
                            </span>
                        )}
                        {!disabled && (
                            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                <div className="flex gap-1">
                                    <button type="button" className={btn} onClick={() => move(idx, idx - 1)} disabled={busy || idx === 0} aria-label="Move left"><ChevronLeft className="h-4 w-4" /></button>
                                    <button type="button" className={btn} onClick={() => move(idx, idx + 1)} disabled={busy || idx === images.length - 1} aria-label="Move right"><ChevronRight className="h-4 w-4" /></button>
                                    {idx > 0 && (
                                        <button type="button" className={btn} onClick={() => move(idx, 0)} disabled={busy} aria-label="Make cover" title="Make cover"><Star className="h-4 w-4" /></button>
                                    )}
                                </div>
                                <button type="button" className={`${btn} text-red-600`} onClick={() => remove(paths[idx])} disabled={busy} aria-label="Remove image"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        )}
                    </div>
                ))}

                {!disabled && images.length < max && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
                        disabled={busy}
                        className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground ${dragOver ? 'border-primary bg-primary/10' : ''}`}
                    >
                        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                        <span>{busy ? 'Working…' : 'Add photos'}</span>
                    </button>
                )}
            </div>

            <input
                ref={inputRef} type="file" accept="image/*" multiple hidden
                onChange={(e) => { upload(e.target.files); e.target.value = ""; }}
            />
            {images.length === 0 && disabled && <p className="text-sm italic text-muted-foreground">No images.</p>}
            {images.length > 0 && !disabled && (
                <p className="text-xs text-muted-foreground">The first photo is the cover. Use the arrows or the star to reorder; up to {max} photos.</p>
            )}
        </div>
    );
};
