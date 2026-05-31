"use client";

import { useCallback, useRef, useState } from "react";

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

  // 갤러리 전용 input (capture 없음)
  const galleryRef = useRef<HTMLInputElement>(null);
  // 카메라 전용 input (capture="environment")
  const cameraRef = useRef<HTMLInputElement>(null);

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
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setPreview(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
      {/* 갤러리 input — capture 없음 */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleInputChange}
        aria-label="갤러리에서 사진 선택"
      />
      {/* 카메라 input — capture="environment" */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={handleInputChange}
        aria-label="카메라로 촬영"
      />

      {!preview ? (
        <div className="flex flex-col gap-3">
          {/* 드래그앤드롭 영역 (데스크탑) */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => galleryRef.current?.click()}
            className={[
              "flex flex-col items-center justify-center gap-4 rounded-[24px] border-2 border-dashed cursor-pointer transition-colors",
              "aspect-[3/4] w-full",
              dragOver
                ? "border-black bg-[#f7f3f2]"
                : "border-[#c4c7c7] hover:border-[#747878] bg-white",
            ].join(" ")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && galleryRef.current?.click()}
            aria-label="사진 업로드 영역"
          >
            <div className="w-16 h-16 rounded-full bg-[#f1edec] flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-[#747878]">
                add_photo_alternate
              </span>
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-[#1c1b1b]">
                사진을 업로드하세요
              </p>
              <p className="text-xs text-[#747878] mt-1">
                드래그하거나 아래 버튼을 눌러주세요
              </p>
            </div>
            <p className="text-[10px] text-[#c4c7c7] uppercase tracking-widest">
              JPG · PNG · WebP · 최대 10MB
            </p>
          </div>

          {/* 갤러리 / 카메라 선택 버튼 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => galleryRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-white border border-[#e5e2e1] rounded-[16px] py-3 text-sm font-semibold text-[#1c1b1b] hover:bg-[#f7f3f2] transition-colors active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px] text-[#5d5e60]">
                photo_library
              </span>
              갤러리
            </button>
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-black rounded-[16px] py-3 text-sm font-semibold text-white hover:bg-[#333] transition-colors active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">
                photo_camera
              </span>
              카메라
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* 미리보기 */}
          <div className="relative rounded-[24px] overflow-hidden aspect-[3/4] w-full bg-[#f1edec]">
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
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                aria-label="다시 선택"
              >
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>
            )}
          </div>

          {/* 다시 선택 버튼 */}
          {!uploading && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-white border border-[#e5e2e1] rounded-[16px] py-3 text-sm font-semibold text-[#1c1b1b] hover:bg-[#f7f3f2] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-[#5d5e60]">
                  photo_library
                </span>
                갤러리
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-white border border-[#e5e2e1] rounded-[16px] py-3 text-sm font-semibold text-[#1c1b1b] hover:bg-[#f7f3f2] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-[#5d5e60]">
                  photo_camera
                </span>
                카메라
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-[#ba1a1a] text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
