// backend/src/utils/huggingFaceClient.js
import fetch from 'node-fetch';

const HF_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;

// Generic image classification model (you already use this)
const HF_MODEL_ID =
  process.env.HUGGING_FACE_MODEL_ID || 'microsoft/resnet-50';

// Zero-shot image classification model (to be chosen)
// Set HF_ZERO_SHOT_MODEL_ID in your environment when you pick a model.
const HF_ZERO_SHOT_MODEL_ID =
  process.env.HF_ZERO_SHOT_MODEL_ID || 'your-zero-shot-model-id-here';

if (!HF_API_TOKEN) {
  console.warn(
    'HUGGING_FACE_API_TOKEN is not set. /products/recognize will return an error until you configure it.'
  );
}

// Very small MIME sniffing helper for common image types
function getImageMimeType(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  return 'image/jpeg'; // safe default
}

// Simple image classification (ImageNet-style)
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

  // HF image-classification returns an array like:
  // [ { label: 'bottle', score: 0.91 }, ... ]
  if (!Array.isArray(result)) {
    return [];
  }

  return result.map(item => ({
    label: String(item.label || '').trim(),
    score: Number(item.score || 0)
  }));
}

// Zero-shot image classification: image + candidate labels
export async function zeroShotClassifyImage(imageBuffer, candidateLabels) {
  if (!HF_API_TOKEN) {
    throw new Error('Hugging Face API token is not configured');
  }

  if (!HF_ZERO_SHOT_MODEL_ID || HF_ZERO_SHOT_MODEL_ID === 'your-zero-shot-model-id-here') {
    throw new Error(
      'HF_ZERO_SHOT_MODEL_ID is not configured. Set it to a zero-shot image model id.'
    );
  }

  if (!Array.isArray(candidateLabels) || candidateLabels.length === 0) {
    throw new Error('No candidate labels provided for zero-shot classification');
  }

  const apiUrl = `https://router.huggingface.co/hf-inference/models/${HF_ZERO_SHOT_MODEL_ID}`;

  // Generic JSON payload pattern: base64 image + candidate labels.
  // You may need to tweak this to match the exact model docs once you pick it.
  const base64Image = imageBuffer.toString('base64');

  const payload = {
    inputs: {
      image: base64Image,
      labels: candidateLabels
    }
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Hugging Face zero-shot error (${response.status}): ${text || response.statusText}`
    );
  }

  const result = await response.json();

  // Expecting something like:
  // [ { "label": "<candidate>", "score": 0.9 }, ... ]
  if (!Array.isArray(result)) {
    return [];
  }

  return result
    .map(item => ({
      label: String(item.label || '').trim(),
      score: Number(item.score || 0)
    }))
    .sort((a, b) => b.score - a.score);
}