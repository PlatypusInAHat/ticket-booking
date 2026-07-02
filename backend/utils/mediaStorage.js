const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
      return;
    }

    cb(null, true);
  }
});

const storageProvider = String(process.env.MEDIA_STORAGE_PROVIDER || 's3').toLowerCase();
const allowFallback = String(process.env.MEDIA_STORAGE_ALLOW_FALLBACK || 'true').toLowerCase() !== 'false';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const hasAwsConfig = Boolean(
  process.env.AWS_REGION &&
  process.env.AWS_S3_BUCKET &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

const buildObjectKey = (file) => {
  const originalName = path.basename(file.originalname || 'upload');
  const safeName = originalName.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `ticket-booking/${Date.now()}-${randomPart}-${safeName}`;
};

const uploadToS3 = async (file) => {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  const key = buildObjectKey(file);
  await client.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000, immutable'
  }));

  const baseUrl = process.env.AWS_S3_PUBLIC_BASE_URL
    || `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`;

  return {
    url: `${baseUrl}/${encodeURI(key)}`,
    publicId: key,
    provider: 's3'
  };
};

const uploadToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'ticket_booking',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          provider: 'cloudinary'
        });
      }
    );

    stream.end(file.buffer);
  });
};

const uploadImage = async (file) => {
  if (!file) {
    throw new Error('No image file was provided.');
  }

  const attempts = [];
  const tryS3First = storageProvider === 's3';

  const tryUpload = async (provider) => {
    if (provider === 's3') {
      if (!hasAwsConfig) {
        throw new Error('AWS S3 is not configured.');
      }
      return uploadToS3(file);
    }

    if (!hasCloudinaryConfig) {
      throw new Error('Cloudinary is not configured.');
    }

    return uploadToCloudinary(file);
  };

  const providers = tryS3First ? ['s3', 'cloudinary'] : ['cloudinary', 's3'];

  for (const provider of providers) {
    try {
      return await tryUpload(provider);
    } catch (error) {
      attempts.push(`${provider}: ${error.message}`);
      if (!allowFallback) {
        throw error;
      }
    }
  }

  throw new Error(`Image upload failed. Attempts: ${attempts.join(' | ')}`);
};

module.exports = {
  upload,
  uploadImage,
  hasAwsConfig,
  hasCloudinaryConfig,
  storageProvider
};
