// backend/utils/huggingFaceClient.js
import fetch from 'node-fetch';

const HF_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;
const HF_MODEL_ID = process.env.HUGGING_FACE_MODEL_ID || 'facebook/detr-resnet-50';

if (!HF_API_TOKEN) {
  console.warn(
    'HUGGING_FACE_API_TOKEN is not set. /products/recognize will return an error until you configure it.'
  );
}

// Helper to detect image MIME type from buffer
function getImageMimeType(buffer) {
  // Check JPEG magic numbers
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // Check PNG magic numbers
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  // Check GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  // Check WebP
  if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  // Default to JPEG
  return 'image/jpeg';
}

export async function classifyImage(imageBuffer) {
  if (!HF_API_TOKEN) {
    throw new Error('Hugging Face API token is not configured');
  }

  const apiUrl = `https://router.huggingface.co/hf-inference/models/${HF_MODEL_ID}`;
  const contentType = getImageMimeType(imageBuffer);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      'Content-Type': contentType
    },
    body: imageBuffer
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Hugging Face API error (${response.status}): ${text || response.statusText}`
    );
  }

  const result = await response.json();

  if (!Array.isArray(result)) {
    return [];
  }

  return result.map(item => ({
    label: String(item.label || item.category || '').trim(),
    score: Number(item.score || 0)
  }));
}