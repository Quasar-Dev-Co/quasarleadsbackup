// lib/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quasarleads';

let cached = (global as any).mongoose || { conn: null, promise: null };

async function dbConnect() {
  if (cached.conn) return cached.conn;
  
  if (!cached.promise) {
    const options: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,  // 10 seconds
      socketTimeoutMS: 45000,          // 45 seconds
      connectTimeoutMS: 10000,         // 10 seconds
      maxPoolSize: 10,                 // Maximum 10 connections
      minPoolSize: 1,                  // Minimum 1 connection
      retryWrites: true,              // Enable retry on write failures
      retryReads: true               // Enable retry on read failures
    };

    console.log('📦 Connecting to MongoDB:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
    cached.promise = mongoose.connect(MONGODB_URI, options).then((mongoose) => {
      console.log('✅ MongoDB Connected Successfully');
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB Connection Error:', error);
      throw error;
    });
  }
  
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    // Clear the promise to allow retrying the connection
    cached.promise = null;
    throw error;
  }
}

// Alias for the new email automation system
const connectToDatabase = dbConnect;

export default dbConnect;
export { connectToDatabase, dbConnect };