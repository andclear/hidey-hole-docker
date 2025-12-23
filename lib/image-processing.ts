/**
 * 图像处理服务
 * 支持 Server (Sharp) 和 Browser (Canvas) 环境
 */
export const imageProcessor = {
  /**
   * 生成缩略图 (WebP)
   */
  async generateThumbnail(buffer: Buffer | Blob | ArrayBuffer, width = 400): Promise<Buffer | Blob> {
    // 1. Server Side (Node.js)
    if (typeof window === 'undefined') {
      const sharp = (await import('sharp')).default;
      
      let inputBuffer: Buffer;
      if (Buffer.isBuffer(buffer)) {
          inputBuffer = buffer;
      } else if (buffer instanceof ArrayBuffer) {
          inputBuffer = Buffer.from(buffer);
      } else {
          // Blob to Buffer
          inputBuffer = Buffer.from(await (buffer as Blob).arrayBuffer());
      }

      return await sharp(inputBuffer)
        .resize({ width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
    } 
    
    // 2. Client Side (Browser)
    else {
      // TODO: Implement Canvas-based resizing for APK mode
      console.warn("Browser-side image processing not fully implemented");
      return buffer as Blob; // Return original as fallback
    }
  }
};
