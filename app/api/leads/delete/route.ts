import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
import Lead from "@/models/leadSchema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "No leads to delete" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await connectToDatabase();
    
    // Convert string IDs to ObjectId
    const objectIds = leadIds.map(id => new mongoose.Types.ObjectId(id));

    // Delete leads using the Mongoose model
    const result = await Lead.deleteMany({
      _id: { $in: objectIds }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} leads`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error deleting leads:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete leads", error: String(error) },
      { status: 500 }
    );
  }
} 