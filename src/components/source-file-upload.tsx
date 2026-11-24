import { useState, useCallback, useRef } from "react";
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader } from "lucide-react";
import type { SmartModeSourceFile } from "@/lib/smart-mode";
import { createSourceFileEntry, isSupportedFileType, getFileTypeName } from "@/lib/smart-mode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * SourceFileUploadProps - Props for the source file upload component
 */
interface SourceFileUploadProps {
  files: SmartModeSourceFile[];
  onFilesChange: (files: SmartModeSourceFile[]) => void;
  onProcessFiles?: (files: SmartModeSourceFile[]) => Promise<void>;
  maxFiles?: number;
  className?: string;
}

/**
 * SourceFileUpload - Multi-file upload component for Smart Mode
 */
export function SourceFileUpload({
  files,
  onFilesChange,
  onProcessFiles,
  maxFiles = 10,
  className,
}: SourceFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles) return;

      processFiles(Array.from(selectedFiles));
    },
    []
  );

  // Handle drag and drop
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

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        processFiles(Array.from(droppedFiles));
      }
    },
    []
  );

  // Process uploaded files
  const processFiles = useCallback(
    (newFiles: File[]) => {
      // Filter out unsupported files
      const supportedFiles = newFiles.filter((file) =>
        isSupportedFileType(file.type, file.name)
      );

      if (supportedFiles.length === 0) {
        alert(
          "No supported files found. Please upload TXT, MD, PDF, DOCX, PPTX, RTF, or HTML files."
        );
        return;
      }

      // Limit to max files
      const allowedFiles = supportedFiles.slice(0, maxFiles);
      const remaining = supportedFiles.length - allowedFiles.length;

      if (remaining > 0) {
        alert(`Too many files. Only ${maxFiles} files are allowed. ${remaining} files were skipped.`);
      }

      // Add to files list
      const newFileEntries: SmartModeSourceFile[] = allowedFiles.map(createSourceFileEntry);

      onFilesChange([...files, ...newFileEntries]);
    },
    [files, onFilesChange, maxFiles]
  );

  // Remove a file
  const removeFile = useCallback(
    (fileId: string) => {
      onFilesChange(files.filter((f) => f.id !== fileId));
    },
    [files, onFilesChange]
  );

  // Process all files
  const handleProcessFiles = useCallback(async () => {
    if (!onProcessFiles || files.length === 0) return;

    setIsProcessing(true);
    try {
      await onProcessFiles(files);
    } finally {
      setIsProcessing(false);
    }
  }, [files, onProcessFiles]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get status icon
  const getStatusIcon = (file: SmartModeSourceFile) => {
    switch (file.processingStatus) {
      case "completed":
        return <CheckCircle className="size-4 text-primary" />;
      case "failed":
        return <AlertCircle className="size-4 text-destructive" />;
      case "processing":
        return <Loader className="size-4 animate-spin" />;
      default:
        return <FileText className="size-4 text-muted-foreground" />;
    }
  };

  // Get status message
  const getStatusMessage = (file: SmartModeSourceFile): string => {
    switch (file.processingStatus) {
      case "completed":
        return "Ready";
      case "failed":
        return file.processingError || "Failed";
      case "processing":
        return "Processing...";
      default:
        return "Pending";
    }
  };

  return (
    <Card className={cn("p-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "mb-6 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-surface-2/30 hover:bg-surface-2/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptAttribute()}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="size-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Supported: TXT, MD, PDF, DOCX, PPTX, RTF, HTML (max {maxFiles} files)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </Button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Uploaded Files ({files.length})</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleProcessFiles}
              disabled={isProcessing || !onProcessFiles}
            >
              {isProcessing ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isProcessing ? "Processing..." : "Process Files"}
            </Button>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 p-3"
              >
                {/* File Icon */}
                <div className="flex-shrink-0 rounded bg-primary/10 p-2">
                  {getStatusIcon(file)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{file.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {getFileTypeName(file.type, file.name)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{formatFileSize(file.size)}</span>
                    {file.processingStatus === "failed" && file.processingError && (
                      <span className="text-destructive">({file.processingError})</span>
                    )}
                  </div>
                  {file.processingStatus === "processing" && (
                    <Progress value={50} max={100} className="mt-2 h-1.5" />
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFile(file.id)}
                  title="Remove file"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Processing Progress Summary */}
          {isProcessing && (
            <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary flex items-center gap-2">
              <Loader className="size-4 animate-spin" />
              Processing {files.length} file{files.length !== 1 ? "s" : ""}...
            </div>
          )}

          {/* Success Summary */}
          {files.every((f) => f.processingStatus === "completed") && files.length > 0 && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="size-4" />
              All files processed successfully!
            </div>
          )}

          {/* Failure Summary */}
          {files.some((f) => f.processingStatus === "failed") && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="size-4" />
              {files.filter((f) => f.processingStatus === "failed").length} file
              {files.filter((f) => f.processingStatus === "failed").length !== 1 ? "s" : ""} failed to process
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Get accept attribute for file input
 */
function getAcceptAttribute(): string {
  const extensions = [
    ".txt",
    ".md",
    ".rtf",
    ".pdf",
    ".docx",
    ".doc",
    ".pptx",
    ".ppt",
    ".html",
    ".htm",
    ".json",
    ".csv",
  ];
  const mimetypes = [
    "text/plain",
    "text/markdown",
    "text/rtf",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "text/html",
    "application/json",
    "text/csv",
  ];
  return [...extensions, ...mimetypes].join(",");
}
