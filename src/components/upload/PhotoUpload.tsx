"use client";

import { useCallback, useRef, useState } from "react";
import Button from "@/components/ui/Button";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

interface PhotoUploadProps {
  onFileSelect: (file: File) => void;
  uploading?: boolean;
  progress?: number;
}

export default function PhotoUpload({
  onFileSelect,
  uploading = false,
  progress = 0,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type))
      return "JPG, PNG, WebP 형식만 업로드 가능합니다.";
    if (file.size > MAX_SIZE_BYTES) return "파일 크기는 10MB 이하여야 합니다.";
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      const url = URL.createObjectURL(file);
      setPreview(url);
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const reset = () => {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleInputChange}
        aria-label="사진 선택"
      />

      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={[
            "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed cursor-pointer transition-colors",
            "aspect-[3/4] w-full",
            dragOver
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-300 hover:border-zinc-400 bg-white",
          ].join(" ")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          aria-label="사진 업로드 영역"
        >
          <svg
            className="w-12 h-12 text-zinc-300"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
            />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700">
              사진을 여기에 드래그하거나
            </p>
            <p className="text-sm text-zinc-500 mt-0.5">클릭해서 선택하세요</p>
          </div>
          <p className="text-xs text-zinc-400">JPG, PNG, WebP · 최대 10MB</p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden aspect-[3/4] w-full bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="업로드 미리보기"
            className="w-full h-full object-cover"
          />

          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
              <div className="w-3/4 bg-white/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-white text-sm font-medium">{progress}%</p>
            </div>
          )}

          {!uploading && (
            <button
              onClick={reset}
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
              aria-label="다시 선택"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 text-center" role="alert">
          {error}
        </p>
      )}

      {preview && !uploading && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="w-full"
        >
          다른 사진 선택
        </Button>
      )}
    </div>
  );
}
