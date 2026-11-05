"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, Label } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { compressImage } from "@/lib/client-image";

export function MediaUpload() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload() {
    if (!file) {
      setError("Choose an image first.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const compressed = await compressImage(file, {
        maxDimension: 1600,
        maxBytes: 300 * 1024,
      });
      const body = new FormData();
      body.append("file", compressed);
      body.append("altText", altText);
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setAltText("");
      setFile(null);
      toast({
        title: "Image uploaded",
        description: "The image is now available in the media library.",
      });
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="surface p-5 sm:p-6">
      <h2 className="font-serif text-xl font-semibold">Upload image</h2>
      <p className="mt-1 text-sm leading-6 text-charcoal/60">
        JPG, PNG or WebP. Images are compressed in your browser to about 1600px
        and 300KB before upload.
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="media-file">Image file</Label>
          <Input
            id="media-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError("");
            }}
          />
          {file ? (
            <p className="field-hint truncate">Selected: {file.name}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="media-alt">Alt text</Label>
          <Input
            id="media-alt"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            maxLength={250}
            placeholder="Describe the image for screen readers"
          />
        </div>
        {error ? <FormMessage>{error}</FormMessage> : null}
      </div>
      <Button
        type="button"
        className="mt-4 w-full sm:w-auto"
        onClick={() => void upload()}
        loading={uploading}
      >
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        Upload image
      </Button>
    </div>
  );
}
