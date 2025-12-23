import { StorageProvider } from './provider';

const DEPLOY_MODE = process.env.NEXT_PUBLIC_DEPLOY_MODE || 'cloud';

export async function getStorage(): Promise<StorageProvider> {
  // 1. 浏览器环境 / APK 模式
  if (typeof window !== 'undefined' || DEPLOY_MODE === 'apk') {
    // TODO: 实现基于 IndexedDB 或 OPFS 的 BrowserProvider
    console.warn("[Storage] Browser/APK Storage Provider 尚未实现，文件上传将不可用");
    return {
        upload: async (key) => {
            console.log("Mock Upload:", key);
            return `mock://${key}`;
        },
        delete: async () => {},
        getUrl: async (key) => `mock://${key}`,
    } as any;
  }

  // 2. Docker 模式 (本地文件系统)
  if (DEPLOY_MODE === 'docker') {
    const { LocalProvider } = await import('./local-provider');
    return new LocalProvider();
  } 
  
  // 3. Cloud 模式 (默认 S3)
  else {
    const { S3Provider } = await import('./s3-provider');
    return new S3Provider();
  }
}
