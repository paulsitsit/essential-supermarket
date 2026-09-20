import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET
});

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export function uploadProductImage(
  buffer,
  originalName = 'product-image'
) {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary image storage is not configured.'
    );
  }

  if (!buffer || buffer.length === 0) {
    throw new Error(
      'Product image buffer is empty.'
    );
  }

  const baseName = String(originalName)
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 80) || 'product-image';

  const uniquePublicId =
    `${baseName}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder:
            'essential-supermarket/products',

          public_id: uniquePublicId,

          resource_type: 'image',

          overwrite: false,

          transformation: [
            {
              width: 1200,
              height: 1200,
              crop: 'limit',
              quality: 'auto',
              fetch_format: 'auto'
            }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

    uploadStream.end(buffer);
  });
}

export async function deleteProductImage(
  publicId
) {
  if (
    !publicId ||
    !isCloudinaryConfigured()
  ) {
    return null;
  }

  return cloudinary.uploader.destroy(
    publicId,
    {
      resource_type: 'image',
      invalidate: true
    }
  );
}