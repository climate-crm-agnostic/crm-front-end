import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { ImageGallery } from "./ImageGallery";
import { createCatalogueVariant, updateCatalogueVariant, catalogueVariantGallery } from "../services/catalogueService";

/**
 * Create or edit one variant of a catalogue item (name, SKU, optional own price,
 * active flag, and its own photos). A new variant is saved first — photos need
 * an id to attach to — after which the same dialog switches to editing it, so
 * the user can add photos without reopening anything.
 *
 * Deliberately does NOT close on a backdrop click (see Modal): it holds
 * unsaved typing.
 */
export const VariantEditorModal = ({ isOpen, item, variant, onClose, onSaved }) => {
    const [saved, setSaved] = useState(null);            // the persisted variant once it exists
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [price, setPrice] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [images, setImages] = useState([]);
    const [paths, setPaths] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        setSaved(variant || null);
        setName(variant?.name || "");
        setSku(variant?.sku || "");
        setPrice(variant?.price ?? "");
        setIsActive(variant ? variant.is_active : true);
        setImages(variant?.list_of_images || []);
        setPaths(variant?.image_paths || []);
        setError(null);
    }, [isOpen, variant]);

    const handleSave = async () => {
        if (!name.trim()) return setError("A variant needs a name, e.g. \"Red\".");
        setSaving(true);
        setError(null);
        try {
            const payload = { name: name.trim(), sku: sku.trim(), price: price === "" ? null : price, is_active: isActive };
            const result = saved
                ? await updateCatalogueVariant(saved.id, payload)
                : await createCatalogueVariant({ ...payload, catalogue_item: item.id });
            setSaved(result);
            setImages(result.list_of_images || []);
            setPaths(result.image_paths || []);
            onSaved?.(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGalleryChange = ({ images: nextImages, paths: nextPaths }) => {
        setImages(nextImages);
        setPaths(nextPaths);
        // Keep the parent's list (and its thumbnail) current without waiting for Save.
        onSaved?.({ ...saved, list_of_images: nextImages, image_paths: nextPaths });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={saved ? `Edit variant — ${saved.name}` : "New variant"} widthClass="sm:w-[720px]">
            <div className="space-y-5 p-6">
                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/15">{error}</div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="variant-name">Name</Label>
                        <Input id="variant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Red, or Red / M" autoFocus />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="variant-sku">SKU (optional)</Label>
                        <Input id="variant-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. CAP-RED" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="variant-price">Price (optional)</Label>
                        <Input
                            id="variant-price" type="number" step="0.01" min="0" value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={`Same as item: ${Number(item?.base_price ?? 0).toFixed(2)}`}
                        />
                        <p className="text-xs text-muted-foreground">Leave empty to use the item's base price.</p>
                    </div>
                    <div className="flex items-center gap-3 pt-7">
                        <Switch id="variant-active" checked={isActive} onCheckedChange={setIsActive} />
                        <Label htmlFor="variant-active">Active (can be sold)</Label>
                    </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                    <Label>Photos of this variant</Label>
                    {saved ? (
                        <ImageGallery images={images} paths={paths} api={catalogueVariantGallery(saved.id)} onChange={handleGalleryChange} />
                    ) : (
                        <p className="text-sm italic text-muted-foreground">Save the variant first, then add its photos here.</p>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>{saved ? "Done" : "Cancel"}</Button>
                    <Button type="button" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : saved ? "Save changes" : "Save variant"}</Button>
                </div>
            </div>
        </Modal>
    );
};
