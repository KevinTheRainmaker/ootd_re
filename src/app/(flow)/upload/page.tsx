"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUpload from "@/components/upload/PhotoUpload";
import Button from "@/components/ui/Button";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import type { UploadResponse } from "@/types/api";

export default function UploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toasts, addToast, dismiss } = useToast();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleStart = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/ootd/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(60);

      if (!res.ok) {
        const err = await res.json();
        addToast(err.error ?? "업로드에 실패했습니다.", "error");
        return;
      }

      const { url }: UploadResponse = await res.json();
      setProgress(100);

      router.push(`/analyze?image_url=${encodeURIComponent(url)}`);
    } catch {
      addToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
          오늘의 착장 기록
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          사진 한 장으로 나만의 패션 카드를 만들어요
        </p>
      </header>

      <PhotoUpload
        onFileSelect={handleFileSelect}
        uploading={uploading}
        progress={progress}
      />

      {uploading && (
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-zinc-900 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-zinc-600 animate-pulse">
            사진을 업로드하는 중...
          </p>
        </div>
      )}

      {selectedFile && !uploading && (
        <Button
          size="lg"
          className="w-full max-w-sm"
          onClick={handleStart}
          loading={uploading}
        >
          카드 만들기
        </Button>
      )}

      {!selectedFile && (
        <p className="text-xs text-zinc-400 text-center">
          JPG · PNG · WebP 형식, 최대 10MB
        </p>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
