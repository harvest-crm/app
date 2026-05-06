import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Lazily initialised so missing env vars don't crash the build
let _client: S3Client | null = null;

function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID     ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
      forcePathStyle: true,
    });
  }
  return _client;
}

const BUCKET = () => process.env.R2_BUCKET_NAME ?? "";

const TTL = 3600; // 1 hour

export async function getSignedUploadUrl(r2Key: string, mimeType: string): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: BUCKET(), Key: r2Key, ContentType: mimeType }),
    { expiresIn: TTL },
  );
}

export async function getSignedDownloadUrl(r2Key: string): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: BUCKET(), Key: r2Key }),
    { expiresIn: TTL },
  );
}

export async function deleteR2Object(r2Key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: r2Key }));
}
