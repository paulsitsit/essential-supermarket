import vision from '@google-cloud/vision';

let client;

console.log('GOOGLE_APPLICATION_CREDENTIALS_JSON present?', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    const credentials = JSON.parse(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    );
    console.log('Parsed Google credentials successfully');
    client = new vision.ImageAnnotatorClient({ credentials });
  } catch (err) {
    console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', err.message);
    client = new vision.ImageAnnotatorClient();
  }
} else {
  console.log('No GOOGLE_APPLICATION_CREDENTIALS_JSON, using default credentials');
  client = new vision.ImageAnnotatorClient();
}

export default client;