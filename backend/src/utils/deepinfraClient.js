import fetch from 'node-fetch';
import FormData from 'form-data';

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
const DEEPINFRA_MODEL_ID =
  process.env.DEEPINFRA_MODEL_ID || 'openai/clip-vit-large-patch14-336';

if (!DEEPINFRA_API_KEY) {
  console.warn(
    'DEEPINFRA_API_KEY is not set. Zero-shot product recognition will fail until you configure it.'
  );
}

function ensureLabels(candidateLabels) {
  if (!Array.isArray(candidateLabels) || candidateLabels.length < 2) {
    throw new Error('Zero-shot image classification requires at least two candidate labels');
  }
}

export async function deepinfraZeroShotImage(imageBuffer, candidateLabels) {
  if (!DEEPINFRA_API_KEY) {
    throw new Error('DeepInfra API key is not configured');
  }

  ensureLabels(candidateLabels);

  const endpoint = `https://api.deepinfra.com/v1/inference/${DEEPINFRA_MODEL_ID}`;

  const form = new FormData();
  form.append('image', imageBuffer, {
    filename: 'product.jpg',
    contentType: 'image/jpeg'
  });
  form.append('candidate_labels', JSON.stringify(candidateLabels));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPINFRA_API_KEY}`
    },
    body: form
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `DeepInfra zero-shot error (${response.status}): ${text || response.statusText}`
    );
  }

  const result = await response.json();
  const predictions = Array.isArray(result.results) ? result.results : result;

  if (!Array.isArray(predictions)) {
    return [];
  }

  return predictions
    .map(item => ({
      label: String(item.label || '').trim(),
      score: Number(item.score || 0)
    }))
    .sort((a, b) => b.score - a.score);
}