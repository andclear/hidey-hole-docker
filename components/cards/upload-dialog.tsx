"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, FileImage, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: string;
}

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function UploadDialog({ open, onOpenChange, categoryId }: UploadDialogProps) {
  const router = useRouter();
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'application/json': ['.json'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    setIsUploading(true);
    let successCount = 0;

    const newFiles = [...files];

    for (let i = 0; i < newFiles.length; i++) {
      if (newFiles[i].status === 'success') {
        successCount++;
        continue;
      }

      newFiles[i].status = 'uploading';
      newFiles[i].progress = 10;
      setFiles([...newFiles]);

      try {
        const formData = new FormData();
        formData.append('file', newFiles[i].file);
        if (categoryId) {
          formData.append('categoryId', categoryId);
        }

        const res = await fetch('/api/cards/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (res.ok && data.success) {
          newFiles[i].status = 'success';
          newFiles[i].progress = 100;
          successCount++;
        } else {
          newFiles[i].status = 'error';
          newFiles[i].error = data.error || '上传失败';
          if (data.code === 'DUPLICATE_HASH') {
             newFiles[i].error = '文件重复';
          }
        }
      } catch (error) {
        newFiles[i].status = 'error';
        newFiles[i].error = '网络错误';
      }

      setFiles([...newFiles]);
    }

    setIsUploading(false);
    
    if (successCount === newFiles.length) {
      toast.success(`成功上传 ${successCount} 个文件`);
      setTimeout(() => {
        onOpenChange(false);
        setFiles([]);
        router.refresh();
      }, 1000);
    } else {
      toast.warning(`上传完成，${successCount} 个成功，${newFiles.length - successCount} 个失败`);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isUploading) {
        onOpenChange(val);
        if (!val) setFiles([]); // Clear on close if not uploading
      }
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>上传角色卡</DialogTitle>
          <DialogDescription>
            支持 PNG (V2/V3) 或 JSON 格式。拖拽文件到下方或点击选择。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-primary font-medium">释放以上传文件...</p>
            ) : (
              <div className="space-y-1">
                <p className="font-medium text-foreground">点击或拖拽文件到这里</p>
                <p className="text-sm text-muted-foreground">支持 .png, .json (最大 10MB)</p>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {files.map((fileState, index) => (
                <div
                  key={`${fileState.file.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border relative group"
                >
                  <div className="h-10 w-10 rounded bg-background flex items-center justify-center shrink-0 text-muted-foreground">
                    {fileState.file.type.includes('image') ? (
                      <FileImage className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate pr-2">
                        {fileState.file.name}
                      </p>
                      {fileState.status === 'error' && (
                        <span className="text-xs text-destructive flex items-center gap-1 shrink-0">
                          <AlertCircle className="h-3 w-3" />
                          {fileState.error}
                        </span>
                      )}
                    </div>
                    {fileState.status === 'uploading' || fileState.status === 'success' ? (
                      <Progress value={fileState.progress} className="h-1.5" />
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {(fileState.file.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>

                  {fileState.status !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            取消
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={files.length === 0 || isUploading || files.every(f => f.status === 'success')}
          >
            {isUploading ? '上传中...' : '开始上传'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
