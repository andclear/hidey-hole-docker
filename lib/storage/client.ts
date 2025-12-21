
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../s3';

export class StorageClient {
  async upload(key: string, body: Buffer | Uint8Array, contentType: string) {
    const { client, bucket } = await getS3Client();
    
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    
    return key;
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    const { client, bucket } = await getS3Client();
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    return await getSignedUrl(client, command, { expiresIn });
  }

  async delete(key: string) {
    const { client, bucket } = await getS3Client();
    
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
  }
}

export async function getStorageClient() {
  return new StorageClient();
}
