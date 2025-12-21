"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, FileImage, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function UploadPage() {
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
      // Optional: redirect to cards page after success? 
      // User might want to upload more, so let's keep them here but maybe show a link.
    } else {
      toast.warning(`上传完成，${successCount} 个成功，${newFiles.length - successCount} 个失败`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cards">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">上传角色卡</h2>
          <p className="text-muted-foreground">
            将新的角色卡添加到您的收藏库中。
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>文件上传</CardTitle>
          <CardDescription>
            支持 PNG (V2/V3) 或 JSON 格式。单文件最大 10MB。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200",
              isDragActive 
                ? "border-primary bg-primary/5 scale-[1.01]" 
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <input {...getInputProps()} />
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <Upload className="h-8 w-8 text-primary" />
            </div>
            {isDragActive ? (
              <p className="text-primary font-medium text-lg">释放以上传文件...</p>
            ) : (
              <div className="space-y-2">
                <p className="font-medium text-lg text-foreground">点击或拖拽文件到这里</p>
                <p className="text-sm text-muted-foreground">支持 .png, .json</p>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">待上传文件 ({files.length})</h3>
                <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setFiles([])}
                   disabled={isUploading}
                   className="text-muted-foreground hover:text-destructive"
                >
                  清空列表
                </Button>
              </div>
              
              <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                {files.map((fileState, index) => (
                  <div
                    key={`${fileState.file.name}-${index}`}
                    className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border relative group hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-lg bg-background border flex items-center justify-center shrink-0 text-muted-foreground shadow-sm">
                      {fileState.file.type.includes('image') ? (
                        <FileImage className="h-6 w-6" />
                      ) : (
                        <FileText className="h-6 w-6" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate pr-2">
                          {fileState.file.name}
                        </p>
                        {fileState.status === 'error' && (
                          <span className="text-xs font-medium text-destructive flex items-center gap-1 shrink-0 bg-destructive/10 px-2 py-0.5 rounded-full">
                            <AlertCircle className="h-3 w-3" />
                            {fileState.error}
                          </span>
                        )}
                         {fileState.status === 'success' && (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                            已完成
                          </span>
                        )}
                      </div>
                      
                      {fileState.status === 'uploading' || fileState.status === 'success' ? (
                        <Progress value={fileState.progress} className="h-2" />
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

              <div className="flex justify-end pt-4 border-t">
                <Button
                  size="lg"
                  onClick={uploadFiles}
                  disabled={files.length === 0 || isUploading || files.every(f => f.status === 'success')}
                  className="w-full sm:w-auto min-w-[150px]"
                >
                  {isUploading ? (
                    <>上传中...</>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      开始上传
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
