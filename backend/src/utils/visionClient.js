// server/utils/visionClient.js
import vision from '@google-cloud/vision';

let client;

if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credentials = JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  );
  client = new vision.ImageAnnotatorClient({ credentials });
} else {
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var pointing to a JSON file
  client = new vision.ImageAnnotatorClient();
}

export default client;