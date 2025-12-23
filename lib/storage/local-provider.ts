import fs from 'fs-extra';
import path from 'path';
import { StorageProvider } from './provider';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

export class LocalProvider implements StorageProvider {
  constructor() {
    // 确保上传目录存在
    // 注意：fs-extra 在 Server Action 或 API Route 中是安全的
    // 但如果在 Edge Runtime 中会报错，所以确保只在 Node Runtime 使用
    try {
        fs.ensureDirSync(UPLOAD_DIR);
    } catch (e) {
        console.error('Failed to create upload dir:', e);
    }
  }

  async upload(key: string, body: Buffer | Uint8Array, contentType: string) {
    const filePath = path.join(UPLOAD_DIR, key);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, body);
    return `/api/images/${key}`;
  }

  async delete(key: string) {
    const filePath = path.join(UPLOAD_DIR, key);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  }

  async getUrl(key: string) {
    return `/api/images/${key}`;
  }

  async getStream(key: string) {
     const filePath = path.join(UPLOAD_DIR, key);
     if (!await fs.pathExists(filePath)) {
         return null;
     }
     const buffer = await fs.readFile(filePath);
     // Convert Node Buffer to Web Stream
     return new Blob([buffer]).stream();
  }
}
