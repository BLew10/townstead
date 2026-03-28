"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type ImagePresetKey,
  IMAGE_PRESETS,
  validateFile,
  getAcceptString,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/image-validation";

interface ImageUploadProps {
  preset: ImagePresetKey;
  onUpload: (file: File) => void | Promise<void>;
  onRemove?: () => void;
  currentImageUrl?: string | null;
  uploading?: boolean;
  className?: string;
}

export function ImageUpload({
  preset,
  onUpload,
  onRemove,
  currentImageUrl,
  uploading = false,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const config = IMAGE_PRESETS[preset];
  const maxSizeMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      const result = validateFile(file, preset);
      if (!result.valid) {
        setError(result.error!);
        return;
      }

      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreview(url);
      } else {
        setPreview(null);
      }

      await onUpload(file);
    },
    [preset, onUpload]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClear = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    setError(null);
    onRemove?.();
  }, [preview, onRemove]);

  const displayUrl = preview ?? currentImageUrl;

  return (
    <div className={cn("space-y-2", className)}>
      {displayUrl ? (
        <div className="relative inline-block">
          <img
            src={displayUrl}
            alt="Upload preview"
            className="h-32 w-auto rounded-lg border object-contain"
          />
          {(onRemove || preview) && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
              onClick={handleClear}
              disabled={uploading}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          {preset === "clientAsset" ? (
            <FileIcon className="h-8 w-8 text-muted-foreground" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium">
              {uploading ? "Uploading..." : "Click or drag to upload"}
            </p>
            <p className="text-xs text-muted-foreground">
              {config.formatLabel} &mdash; max {maxSizeMB} MB
            </p>
            {config.recommendation && (
              <p className="text-xs text-muted-foreground">
                {config.recommendation}
              </p>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={getAcceptString(preset)}
        onChange={handleChange}
        className="hidden"
        disabled={uploading}
      />

      {!displayUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : "Choose File"}
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
