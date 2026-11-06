"use client";

import { useRef, useState, type ReactNode } from "react";
import { Camera, Images, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormMessage } from "@/components/ui/form";
import { compressImageSafe } from "@/lib/client-image";
import { cn } from "@/lib/utils";

export function PhotoPicker({
  onChange,
  onError,
  label = "Choose photo",
  changeLabel = "Change photo",
  hasPhoto = false,
  disabled = false,
  className,
  triggerClassName,
  capture = "user",
  maxDimension = 1600,
  maxBytes = 300 * 1024,
  trigger,
  hint,
}: {
  onChange: (file: File | null) => void | Promise<void>;
  onError?: (message: string) => void;
  label?: string;
  changeLabel?: string;
  hasPhoto?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  capture?: "user" | "environment";
  maxDimension?: number;
  maxBytes?: number;
  trigger?: ReactNode;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null) {
    setOpen(false);
    if (!file) return;
    setError("");
    setPreparing(true);
    try {
      const prepared = await compressImageSafe(file, { maxDimension, maxBytes });
      await onChange(prepared);
    } catch (prepError) {
      const message =
        prepError instanceof Error ? prepError.message : "Could not use that photo.";
      setError(message);
      onError?.(message);
    } finally {
      setPreparing(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled || preparing}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 active:scale-[0.98] active:opacity-80 disabled:opacity-60",
          triggerClassName,
        )}
        aria-label={hasPhoto ? changeLabel : label}
      >
        {preparing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : trigger ? (
          trigger
        ) : (
          <>
            <Camera className="h-4 w-4" aria-hidden="true" />
            {hasPhoto ? changeLabel : label}
          </>
        )}
      </button>
      {hint ? <p className="field-hint">{hint}</p> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture={capture}
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a photo"
        description="Take a new photo or choose one from your gallery."
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex min-h-[56px] w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-brand-gradient px-5 text-base font-semibold text-cream shadow-soft active:scale-[0.98] active:opacity-90"
          >
            <Camera className="h-5 w-5" aria-hidden="true" />
            Take a photo
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex min-h-[56px] w-full touch-manipulation items-center justify-center gap-3 rounded-2xl border border-brand-200 bg-white px-5 text-base font-semibold text-brand-800 active:scale-[0.98] active:opacity-80"
          >
            <Images className="h-5 w-5" aria-hidden="true" />
            Choose from gallery
          </button>
        </div>
      </Modal>
    </div>
  );
}
