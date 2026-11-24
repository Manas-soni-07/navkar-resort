/**
 * Private object storage (Cloudflare R2, S3-compatible) for guest ID proofs and receipts.
 *
 * Required environment variables (server only, never in the app):
 *   R2_ACCOUNT_ID         Cloudflare account ID (R2 overview page)
 *   R2_ACCESS_KEY_ID      from an R2 API token scoped to this bucket only
 *   R2_SECRET_ACCESS_KEY  from the same token
 *   R2_BUCKET             e.g. resortos-guest-docs
 * Optional:
 *   R2_ENDPOINT           override the endpoint (e.g. http://127.0.0.1:9000 for local MinIO tests)
 *
 * The bucket stays private: clients only ever get short-lived presigned URLs.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const clean = (v: string | undefined) => v?.trim().replace(/^["']+|["']+$/g, '').trim() || undefined;

interface StorageConfig {
  bucket: string;
  client: S3Client;
}

let cached: StorageConfig | null | undefined;

function getConfig(): StorageConfig | null {
  if (cached !== undefined) return cached;
  const accountId = clean(process.env.R2_ACCOUNT_ID);
  const accessKeyId = clean(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = clean(process.env.R2_SECRET_ACCESS_KEY);
  const bucket = clean(process.env.R2_BUCKET);
  const endpointOverride = clean(process.env.R2_ENDPOINT);

  if (!accessKeyId || !secretAccessKey || !bucket || (!accountId && !endpointOverride)) {
    cached = null;
    return cached;
  }

  cached = {
    bucket,
    client: new S3Client({
      region: 'auto',
      endpoint: endpointOverride ?? `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: Boolean(endpointOverride),
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
  return cached;
}

export function isStorageConfigured(): boolean {
  return getConfig() !== null;
}

function requireConfig(): StorageConfig {
  const cfg = getConfig();
  if (!cfg) throw new Error('Document storage is not configured (R2_* environment variables missing).');
  return cfg;
}

/** Presigned PUT. The client must send exactly this Content-Type. */
export async function presignUpload(key: string, contentType: string, expiresInSeconds = 300): Promise<string> {
  const { client, bucket } = requireConfig();
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
    expiresIn: expiresInSeconds,
  });
}

/** Presigned GET for viewing; the file is shown inline with a sensible file name. */
export async function presignView(key: string, fileName: string, expiresInSeconds = 300): Promise<string> {
  const { client, bucket } = requireConfig();
  const safeName = fileName.replace(/[^\w.\- ]+/g, '_');
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: `inline; filename="${safeName}"` }),
    { expiresIn: expiresInSeconds }
  );
}

/** Returns the stored object's size and type, or null if it does not exist. */
export async function statObject(key: string): Promise<{ size: number; contentType?: string } | null> {
  const { client, bucket } = requireConfig();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { size: Number(head.ContentLength ?? 0), contentType: head.ContentType };
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return null;
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = requireConfig();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
