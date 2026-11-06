"use client";

import { useState } from "react";
import { ImagePlus, Library, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormMessage } from "@/components/ui/form";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { compressImageSafe } from "@/lib/client-image";
import { publicMediaUrl } from "@/lib/media";

export type MediaItem = {
  id: string;
  key: string;
  filename: string;
  altText: string | null;
};

export function ImagePicker({
  name,
  label = "Image",
  defaultValue = "",
  defaultUrl = null,
  media,
  hint,
}: {
  name: string;
  label?: string;
  defaultValue?: string | null;
  defaultUrl?: string | null;
  media: MediaItem[];
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState<string | null>(defaultUrl);
  const [items, setItems] = useState(media);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    setUploading(true);
    try {
      const compressed = await compressImageSafe(file, {
        maxDimension: 1600,
        maxBytes: 300 * 1024,
      });
      const body = new FormData();
      body.append("file", compressed);
      body.append("altText", "");
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as {
        error?: string;
        id?: string;
        key?: string;
      };
      if (!response.ok || !data.key || !data.id) {
        throw new Error(data.error || "Upload failed.");
      }
      const item: MediaItem = {
        id: data.id,
        key: data.key,
        filename: compressed.name,
        altText: null,
      };
      setItems((current) => [item, ...current]);
      setValue(item.key);
      setPreview(publicMediaUrl(item.key));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="field-label">{label}</p>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-start gap-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-100 bg-brand-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-brand-400" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
              <Library className="h-4 w-4" aria-hidden="true" />
              Choose
            </Button>
            <PhotoPicker
              label="Upload"
              changeLabel="Upload"
              triggerClassName="min-h-11 px-3.5 text-sm"
              disabled={uploading}
              onChange={(file) => {
                if (file) void upload(file);
              }}
              onError={setError}
              trigger={<span>Upload</span>}
              maxDimension={1600}
              maxBytes={300 * 1024}
            />
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setValue("");
                  setPreview(null);
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>
          {uploading ? (
            <p className="flex items-center gap-1.5 text-xs text-charcoal/55">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Compressing and uploading...
            </p>
          ) : null}
          {hint ? <p className="field-hint">{hint}</p> : null}
          {error ? <FormMessage>{error}</FormMessage> : null}
        </div>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Choose an image"
        description="Images from the media library. Upload new images in Media Library."
      >
        {items.length ? (
          <div className="grid max-h-[55dvh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setValue(item.key);
                  setPreview(publicMediaUrl(item.key));
                  setOpen(false);
                }}
                className="overflow-hidden rounded-2xl border border-brand-100 bg-white text-left hover:border-brand-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicMediaUrl(item.key) ?? ""}
                  alt={item.altText || item.filename}
                  className="h-24 w-full object-cover"
                />
                <span className="block truncate px-2 py-2 text-xs text-charcoal/60">
                  {item.altText || item.filename}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-brand-200 p-6 text-center text-sm text-charcoal/55">
            No media yet. Upload an image in Media Library first.
          </p>
        )}
      </Modal>
    </div>
  );
}
