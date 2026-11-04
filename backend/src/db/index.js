import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[DB] WARNING: MONGODB_URI is not set. Operating in memory mode.');
    return null;
  }

  try {
    const connectionInstance = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[DB] Connected successfully to host: ${connectionInstance.connection.host}`);
    return connectionInstance;
  } catch (error) {
    console.warn(`[DB] Warning: MongoDB connection failed (${error.message}). Operating in memory mode.`);
    return null;
  }
};

export const getDbStatus = () => {
  return mongoose.connection.readyState === 1 ? 'atlas' : 'memory';
};
