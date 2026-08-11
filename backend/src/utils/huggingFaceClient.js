// backend/utils/huggingFaceClient.js
import fetch from 'node-fetch';

const HF_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;

// Use a supported model - try these alternatives:
const HF_MODEL_ID = process.env.HUGGING_FACE_MODEL_ID || 'facebook/detr-resnet-50'; // Object detection
// OR: 'google/siglip-base-patch16-224' // Image classification (newer than vit-base)
// OR: 'microsoft/beit-base-patch16-224' // Image classification

if (!HF_API_TOKEN) {
  console.warn(
    'HUGGING_FACE_API_TOKEN is not set. /products/recognize will return an error until you configure it.'
  );
}

export async function classifyImage(imageBuffer) {
  if (!HF_API_TOKEN) {
    throw new Error('Hugging Face API token is not configured');
  }

  const apiUrl = `https://router.huggingface.co/hf-inference/models/${HF_MODEL_ID}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/octet-stream'
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

  // Handle different result formats based on model type
  if (!Array.isArray(result)) {
    return [];
  }

  return result.map(item => ({
    label: String(item.label || item.category || '').trim(),
    score: Number(item.score || 0)
  }));
}