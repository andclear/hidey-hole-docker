export interface StorageProvider {
  /**
   * 上传文件
   * @param key 文件路径/键名
   * @param body 文件内容
   * @param contentType MIME 类型
   * @returns 文件的访问 URL 或 路径
   */
  upload(key: string, body: Buffer | Uint8Array | Blob, contentType: string): Promise<string>;

  /**
   * 删除文件
   * @param key 文件路径/键名
   */
  delete(key: string): Promise<void>;

  /**
   * 获取文件公开访问 URL
   * @param key 文件路径/键名
   */
  getUrl(key: string): Promise<string>;
}
