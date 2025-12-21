import { S3Client } from '@aws-sdk/client-s3';
import { supabaseAdmin } from './supabase';

// Default / Fallback from Env
const ENV_CONFIG = {
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'auto',
  accessKeyId: process.env.S3_ACCESS_KEY || '',
  secretAccessKey: process.env.S3_SECRET_KEY || '',
  bucket: process.env.S3_BUCKET || 'hidey-hole',
  publicUrl: process.env.S3_PUBLIC_URL || '',
};

let cachedClient: S3Client | null = null;
let cachedConfig: any = null;
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minute cache for settings

export async function getS3Client() {
  const now = Date.now();
  
  // If we have a cached client and settings haven't expired, return it
  if (cachedClient && (now - lastFetch < CACHE_TTL)) {
    return { client: cachedClient, bucket: cachedConfig.bucket, publicUrl: cachedConfig.publicUrl };
  }

  // Fetch settings from DB
  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'storage_config')
    .single();

  const dbConfig = data?.value || {};

  // Merge: DB > Env
  const config = {
    endpoint: dbConfig.s3_endpoint || ENV_CONFIG.endpoint,
    region: 'auto', // R2 usually uses auto
    credentials: {
      accessKeyId: dbConfig.s3_access_key || ENV_CONFIG.accessKeyId,
      secretAccessKey: dbConfig.s3_secret_key || ENV_CONFIG.secretAccessKey,
    },
    bucket: dbConfig.s3_bucket || ENV_CONFIG.bucket,
    publicUrl: ENV_CONFIG.publicUrl, // Usually env var, but could be DB
  };

  // If no credentials found at all
  if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
    console.warn("S3 Credentials missing. Uploads will fail.");
  }

  // Initialize new client
  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: config.credentials,
    forcePathStyle: true,
  });
  
  cachedConfig = config;
  lastFetch = now;

  return { client: cachedClient, bucket: config.bucket, publicUrl: config.publicUrl };
}

// Export constants for backward compatibility (where async isn't possible easily, though we should migrate)
// WARNING: These will only use ENV vars and won't update at runtime
export const s3Client = new S3Client({
  region: ENV_CONFIG.region,
  endpoint: ENV_CONFIG.endpoint,
  credentials: {
    accessKeyId: ENV_CONFIG.accessKeyId,
    secretAccessKey: ENV_CONFIG.secretAccessKey,
  },
  forcePathStyle: true,
});

export const S3_BUCKET = ENV_CONFIG.bucket;
export const S3_PUBLIC_URL = ENV_CONFIG.publicUrl;

import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export async function deleteFile(key: string) {
  const { client, bucket } = await getS3Client();
  
  await client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
}
