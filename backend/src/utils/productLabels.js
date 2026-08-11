// backend/src/utils/productLabels.js

// Build a human-readable label from a product document
// Example: "Dove Moisturizing Lotion 200ml"
export function buildProductLabel(product) {
  const parts = [];

  if (product.brand) {
    parts.push(String(product.brand).trim());
  }

  if (product.name) {
    parts.push(String(product.name).trim());
  }

  // If you later add a dedicated quantity/size field, you can append it here.
  // For now, many users encode size in the name itself (e.g., "Shampoo 200ml").

  const label = parts.join(' ').trim();
  return label;
}