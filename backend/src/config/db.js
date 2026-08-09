import mongoose from 'mongoose';

let activeDatabase = null;

function maskedUri(uri) {
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
}

function getUri(name) {
  const uri = name === 'atlas'
    ? process.env.ATLAS_URI
    : process.env.LOCAL_URI;

  if (!uri) {
    throw new Error(`${name.toUpperCase()}_URI is not configured`);
  }

  return uri;
}

async function connectTo(uri, name) {
  const isAtlas = name === 'atlas';

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: isAtlas ? 4000 : 4000,
    connectTimeoutMS: 4000,
    socketTimeoutMS: 45000,
    ...(isAtlas ? { tls: true } : {})
  });

  activeDatabase = name;
  console.log(`MongoDB connected: ${name}`);
}

export async function connectDB({ target = 'auto' } = {}) {
  if (!['auto', 'atlas', 'local'].includes(target)) {
    throw new Error('Database target must be auto, atlas, or local');
  }

  if (target === 'local') {
    const uri = getUri('local');
    console.log('Trying local MongoDB:', maskedUri(uri));
    await connectTo(uri, 'local');
    return activeDatabase;
  }

  if (target === 'atlas') {
    const uri = getUri('atlas');
    console.log('Trying MongoDB Atlas:', maskedUri(uri));
    await connectTo(uri, 'atlas');
    return activeDatabase;
  }

  try {
    const atlasUri = getUri('atlas');
    console.log('Trying MongoDB Atlas:', maskedUri(atlasUri));
    await connectTo(atlasUri, 'atlas');
    return activeDatabase;
  } catch (atlasError) {
    console.warn(`Atlas unavailable: ${atlasError.message}`);
    await mongoose.disconnect();
  }

  try {
    const localUri = getUri('local');
    console.log('Trying local MongoDB:', maskedUri(localUri));
    await connectTo(localUri, 'local');
    return activeDatabase;
  } catch (localError) {
    throw new Error(
      `Neither Atlas nor local MongoDB is available. ${localError.message}`
    );
  }
}

export function getActiveDatabase() {
  return activeDatabase;
}

export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  activeDatabase = null;
}