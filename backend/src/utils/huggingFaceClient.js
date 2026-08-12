import fetch from 'node-fetch';

const HF_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;
const HF_MODEL_ID =
  process.env.HUGGING_FACE_VISION_MODEL_ID ||
  process.env.HUGGING_FACE_MODEL_ID ||
  'Qwen/Qwen2.5-VL-7B-Instruct';

if (!HF_API_TOKEN) {
  console.warn(
    'HUGGING_FACE_API_TOKEN is not set. /products/recognize will return an error until you configure it.'
  );
}

function getImageMimeType(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) return 'image/png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'image/webp';
  return 'image/jpeg';
}

function extractJson(text) {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function recognizeProductImage(imageBuffer) {
  if (!HF_API_TOKEN) {
    throw new Error('Hugging Face API token is not configured');
  }

  const mimeType = getImageMimeType(imageBuffer);
  const imageDataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  const apiUrl = 'https://router.huggingface.co/v1/chat/completions';

  const prompt = `Read the product label in this image and extract the exact commercial product details. Return JSON only, with no markdown and no explanation.

Use these rules:
- productName: the complete visible product name, including the brand, product line, and specific type. Do not return a generic word such as lotion, alcohol, soap, or bottle.
- brand: the first word on the label when it is the brand, or a clearly recognized brand.
- category: the main product type, such as Ethyl Alcohol, Lotion, Shampoo, Soap, or Beverage.
- variant: the flavor, scent, color, strength, or other specific variant when visible.
- description: remaining useful visible details such as percentage, size, ingredients, or claims.
- Never invent text that is not visible. If a field cannot be read, use an empty string.

Required JSON shape:
{"productName":"","brand":"","category":"","variant":"","description":""}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: HF_MODEL_ID,
      temperature: 0.1,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hugging Face API error (${response.status}): ${text || response.statusText}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  const parsed = extractJson(content);

  return {
    productName: clean(parsed.productName || parsed.name),
    brand: clean(parsed.brand),
    category: clean(parsed.category),
    variant: clean(parsed.variant),
    description: clean(parsed.description)
  };
}

// Kept for compatibility with any other imports in the project.
export async function classifyImage(imageBuffer) {
  const product = await recognizeProductImage(imageBuffer);
  return product.productName
    ? [{ label: product.productName, score: 1 }]
    : [];
}
