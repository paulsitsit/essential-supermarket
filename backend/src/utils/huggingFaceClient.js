import fetch from 'node-fetch';

const HF_API_TOKEN =
  process.env.HUGGING_FACE_API_TOKEN;

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
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
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

  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return 'image/gif';
  }

  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

function cleanText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function extractJson(text) {
  if (!text) {
    return {};
  }

  const cleanedText = String(text)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch {
    const jsonMatch = cleanedText.match(
      /\{[\s\S]*\}/
    );

    if (!jsonMatch) {
      return {};
    }

    try {
      return JSON.parse(jsonMatch);[0]
    } catch {
      return {};
    }
  }
}

/**
 * Reads the visible product label and extracts
 * the exact product details.
 */
export async function recognizeProductImage(
  imageBuffer
) {
  if (!HF_API_TOKEN) {
    throw new Error(
      'Hugging Face API token is not configured'
    );
  }

  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error(
      'The uploaded image is empty'
    );
  }

  const mimeType = getImageMimeType(imageBuffer);

  const base64Image = imageBuffer.toString(
    'base64'
  );

  const imageDataUrl =
    `data:${mimeType};base64,${base64Image}`;

  const apiUrl =
    'https://router.huggingface.co/v1/chat/completions';

  const prompt = `
Read the product label in this image and extract
the exact commercial product details.

Return JSON only.
Do not return markdown.
Do not return an explanation.

Use these rules:

1. productName:
   Return the complete visible product name.
   Include the brand, product line, and specific product type.
   Do not return only a generic word such as:
   lotion, alcohol, soap, shampoo, bottle, or cream.

2. brand:
   Return the brand name.
   Usually this is the first prominent word on the label.

3. category:
   Return the main product type.
   Examples:
   Ethyl Alcohol, Lotion, Shampoo, Soap,
   Beverage, Detergent, Snack, or Medicine.

4. variant:
   Return the flavor, scent, color, strength,
   or specific version when visible.

5. description:
   Return remaining useful visible details,
   such as percentage, quantity, size, ingredients,
   or product claims.

Do not invent information.
If a value cannot be read, return an empty string.

Required JSON format:

{
  "productName": "",
  "brand": "",
  "category": "",
  "variant": "",
  "description": ""
}
`;

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
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Hugging Face API error (${response.status}): ${
        errorText || response.statusText
      }`
    );
  }

  const result = await response.json();

  const content =
    result?.choices?.[0]?.message?.content || '';

  const parsed = extractJson(content);

  return {
    productName: cleanText(
      parsed.productName || parsed.name
    ),

    brand: cleanText(
      parsed.brand || parsed.brandName
    ),

    category: cleanText(
      parsed.category || parsed.productType
    ),

    variant: cleanText(
      parsed.variant
    ),

    description: cleanText(
      parsed.description || parsed.details
    )
  };
}

/**
 * Compatibility function.
 *
 * Keep this if another file still imports
 * classifyImage().
 */
export async function classifyImage(
  imageBuffer
) {
  const product =
    await recognizeProductImage(imageBuffer);

  if (!product.productName) {
    return [];
  }

  return [
    {
      label: product.productName,
      score: 1
    }
  ];
}