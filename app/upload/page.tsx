"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  FileText,
  Image,
  File,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles,
  Loader2,
  Clock,
} from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type UploadResult = {
  success: boolean;
  filename: string;
  content_type: string;
  size_bytes: number;
  chunks_embedded: number;
  error?: string;
};

type StoredFile = {
  file_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string | null;
};

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image size={20} />;
  if (type === "application/pdf") return <FileText size={20} />;
  return <File size={20} />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(isoDate: string | null) {
  if (!isoDate) return "";
  const seconds = Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch previously uploaded files on mount
  useEffect(() => {
    async function fetchFiles() {
      try {
        const response = await fetch(`${API_URL}/files`);
        if (response.ok) {
          const data = await response.json();
          setStoredFiles(data.files);
        }
      } catch {
        console.error("Failed to fetch files");
      } finally {
        setIsLoadingFiles(false);
      }
    }
    fetchFiles();
  }, []);

  const uploadFile = async (file: globalThis.File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        return {
          success: false,
          filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
          chunks_embedded: 0,
          error: err.detail || "Upload failed",
        };
      }

      const data = await response.json();
      return {
        success: true,
        filename: data.filename,
        content_type: data.content_type,
        size_bytes: data.size_bytes,
        chunks_embedded: data.chunks_embedded,
      };
    } catch {
      return {
        success: false,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        chunks_embedded: 0,
        error: "Network error — is the backend running?",
      };
    }
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const uploadResults: UploadResult[] = [];
    for (const file of Array.from(files)) {
      const result = await uploadFile(file);
      uploadResults.push(result);
    }

    setResults((prev) => [...uploadResults, ...prev]);

    // Refresh the stored files list
    try {
      const response = await fetch(`${API_URL}/files`);
      if (response.ok) {
        const data = await response.json();
        setStoredFiles(data.files);
      }
    } catch {
      // ignore
    }

    setIsUploading(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center gap-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-sm transition-colors duration-200"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={16} />
          Back to Chat
        </Link>
        <div className="flex items-center gap-2.5 ml-auto">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-glow)" }}
          >
            <Sparkles size={16} style={{ color: "var(--accent)" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Digital Clone
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Upload Documents
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Upload text files, PDFs, or images. They&apos;ll be embedded and ready to chat with.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          className="relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300"
          style={{
            borderColor: isDragging ? "var(--accent)" : "var(--border)",
            background: isDragging ? "var(--accent-glow)" : "var(--bg-secondary)",
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.jpg,.jpeg,.png,.gif,.webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={40} className="animate-spin" style={{ color: "var(--accent)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Uploading & embedding...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--accent-glow)" }}
              >
                <Upload size={24} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Supports .txt, .pdf, .jpg, .png, .gif, .webp
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Upload Results */}
        {results.length > 0 && (
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Just Uploaded
            </h3>
            {results.map((result, i) => (
              <div
                key={`result-${i}`}
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: result.success ? "var(--accent-glow)" : "rgba(239,68,68,0.1)",
                    color: result.success ? "var(--accent)" : "var(--error)",
                  }}
                >
                  {getFileIcon(result.content_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {result.filename}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatBytes(result.size_bytes)} • {result.content_type}
                  </p>
                </div>
                {result.success ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs px-2 py-1 rounded-md font-medium"
                      style={{ background: "rgba(34,197,94,0.1)", color: "var(--success)" }}
                    >
                      {result.chunks_embedded} chunks
                    </span>
                    <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs truncate max-w-[150px]" style={{ color: "var(--error)" }}>
                      {result.error}
                    </span>
                    <XCircle size={18} style={{ color: "var(--error)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Previously Uploaded Files */}
        <div className="mt-10 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <FileText size={14} />
            All Documents ({isLoadingFiles ? "..." : storedFiles.length})
          </h3>

          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : storedFiles.length === 0 ? (
            <div
              className="rounded-xl px-4 py-8 text-center"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No documents uploaded yet. Drop some files above to get started.
              </p>
            </div>
          ) : (
            storedFiles.map((file) => (
              <div
                key={file.file_id}
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                >
                  {getFileIcon(file.content_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {file.filename}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatBytes(file.size_bytes)} • {file.content_type}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" style={{ color: "var(--text-muted)" }}>
                  <Clock size={12} />
                  <span className="text-xs">{timeAgo(file.uploaded_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
