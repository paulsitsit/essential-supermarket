// backend/utils/huggingFaceClient.js
import fetch from 'node-fetch';

/**
 * Simple helper to call Hugging Face Inference API
 * for image classification.
 *
 * You must set HUGGING_FACE_API_TOKEN in your environment.
 */
const HF_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;

// A good general image classification model
const HF_MODEL_ID = process.env.HUGGING_FACE_MODEL_ID || 'google/vit-base-patch16-224';

if (!HF_API_TOKEN) {
  console.warn(
    'HUGGING_FACE_API_TOKEN is not set. /products/recognize will return an error until you configure it.'
  );
}

/**
 * @param {Buffer} imageBuffer
 * @returns {Promise<Array<{label: string, score: number}>>}
 */
export async function classifyImage(imageBuffer) {
  if (!HF_API_TOKEN) {
    throw new Error('Hugging Face API token is not configured');
  }

  // Updated to use the new Hugging Face router endpoint
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

  // Typical result: [ { label: 'milk', score: 0.98 }, ... ]
  if (!Array.isArray(result)) {
    return [];
  }

  return result.map(item => ({
    label: String(item.label || '').trim(),
    score: Number(item.score || 0)
  }));
}