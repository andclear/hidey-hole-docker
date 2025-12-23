import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../s3';
import { StorageProvider } from './provider';

export class S3Provider implements StorageProvider {
  async upload(key: string, body: Buffer | Uint8Array, contentType: string) {
    const { client, bucket } = await getS3Client();
    
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    
    // 在 S3 模式下，我们通常希望返回通过 /api/images 代理的 URL，或者 S3 的 Public URL
    // 这里我们返回相对路径，由前端决定如何拼接，或者返回 /api/images/{key}
    return `/api/images/${key}`;
  }

  async delete(key: string) {
    const { client, bucket } = await getS3Client();
    
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
  }

  async getUrl(key: string) {
    // 返回代理地址
    return `/api/images/${key}`;
  }

  async getStream(key: string) {
    const { client, bucket } = await getS3Client();
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    const response = await client.send(command);
    return response.Body?.transformToWebStream() as ReadableStream;
  }
}
