"use client";

import { useCallback, useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, X, ImageIcon, FileIcon, Crop as CropIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  type ImagePresetKey,
  IMAGE_PRESETS,
  validateFile,
  getAcceptString,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/image-validation";

function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  mimeType: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      mimeType,
      0.92
    );
  });
}

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
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const config = IMAGE_PRESETS[preset];
  const maxSizeMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
  const hasCrop = !!config.aspectRatio;

  const finishUpload = useCallback(
    async (file: File) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreview(url);
      } else {
        setPreview(null);
      }
      await onUpload(file);
    },
    [onUpload]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      const result = validateFile(file, preset);
      if (!result.valid) {
        setError(result.error!);
        return;
      }

      if (hasCrop && file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setCropSrc(url);
        setCropFile(file);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setCropDialogOpen(true);
        return;
      }

      await finishUpload(file);
    },
    [preset, hasCrop, finishUpload]
  );

  const handleCropConfirm = useCallback(async () => {
    if (!completedCrop || !cropImageRef.current || !cropFile) return;
    try {
      const blob = await getCroppedBlob(
        cropImageRef.current,
        completedCrop,
        cropFile.type
      );
      const croppedFile = new File([blob], cropFile.name, { type: cropFile.type });
      setCropDialogOpen(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
      setCropFile(null);
      await finishUpload(croppedFile);
    } catch {
      setError("Failed to crop image");
    }
  }, [completedCrop, cropFile, cropSrc, finishUpload]);

  const handleCropCancel = useCallback(() => {
    setCropDialogOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropFile(null);
  }, [cropSrc]);

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

      {hasCrop && (
        <Dialog open={cropDialogOpen} onOpenChange={(open) => { if (!open) handleCropCancel(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CropIcon className="h-4 w-4" />
                Crop Image
              </DialogTitle>
            </DialogHeader>
            {cropSrc && (
              <div className="flex justify-center overflow-hidden rounded-md bg-muted">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={config.aspectRatio}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={cropImageRef}
                    src={cropSrc}
                    alt="Crop preview"
                    className="max-h-[60vh]"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const aspect = config.aspectRatio!;
                      const imgAspect = img.width / img.height;
                      let cropW: number, cropH: number;
                      if (imgAspect > aspect) {
                        cropH = img.height * 0.9;
                        cropW = cropH * aspect;
                      } else {
                        cropW = img.width * 0.9;
                        cropH = cropW / aspect;
                      }
                      const x = (img.width - cropW) / 2;
                      const y = (img.height - cropH) / 2;
                      const initial: Crop = {
                        unit: "px",
                        x,
                        y,
                        width: cropW,
                        height: cropH,
                      };
                      setCrop(initial);
                      setCompletedCrop({
                        ...initial,
                        unit: "px",
                      });
                    }}
                  />
                </ReactCrop>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCropCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCropConfirm}
                disabled={!completedCrop}
              >
                Crop &amp; Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
