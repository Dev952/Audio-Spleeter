import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import UploadHistory from '@/models/UploadHistory';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function GET(req: NextRequest) {
  try {
    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // Get pagination parameters from URL
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Connect to database
    await dbConnect();

    // Fetch user's upload history with pagination
    const [uploads, totalCount] = await Promise.all([
      UploadHistory.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UploadHistory.countDocuments({ userId })
    ]);

    // Format the upload history data
    const formattedUploads = uploads.map(upload => ({
      id: String(upload._id),
      originalFileName: upload.originalFileName,
      originalFileSize: upload.originalFileSize,
      folderPath: upload.folderPath,
      vocalsFilePath: upload.vocalsFilePath,
      instrumentalFilePath: upload.instrumentalFilePath,
      processedAudioUrl: upload.processedAudioUrl, // Add processed audio URL
      effectsApplied: upload.effectsApplied, // Add effects applied
      processingStatus: upload.processingStatus,
      processingType: upload.processingType || 'separation', // Add processing type
      processingStartTime: upload.processingStartTime?.toISOString(),
      processingEndTime: upload.processingEndTime?.toISOString(),
      processingDuration: upload.processingDuration,
      errorMessage: upload.errorMessage,
      fileFormat: upload.fileFormat,
      audioKey: upload.audioKey, // Add detected key
      audioBpm: upload.audioBpm, // Add detected BPM
      createdAt: upload.createdAt?.toISOString(),
      updatedAt: upload.updatedAt?.toISOString(),
      // Helper fields for display
      formattedDate: upload.createdAt ? new Date(upload.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : null,
      timeAgo: upload.createdAt ? getTimeAgo(new Date(upload.createdAt)) : null,
      fileSizeFormatted: formatFileSize(upload.originalFileSize),
      processingTimeFormatted: upload.processingDuration ? formatDuration(upload.processingDuration) : null
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      uploads: formattedUploads,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit
      }
    });

  } catch (error: any) {
    console.error('History API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE method for removing specific upload only (removed clearAll functionality)
export async function DELETE(req: NextRequest) {
  try {
    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const { searchParams } = new URL(req.url);
    const uploadId = searchParams.get('id');

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'Upload ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Delete specific upload
    const upload = await UploadHistory.findOne({ _id: uploadId, userId });

    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      );
    }

    console.log(`🗑️ Deleting specific upload: ${upload.originalFileName}`);
    console.log(`   Vocals path: ${upload.vocalsFilePath}`);
    console.log(`   Instrumental path: ${upload.instrumentalFilePath}`);
    console.log(`   Processed audio path: ${upload.processedAudioUrl}`);
    console.log(`   Folder path: ${upload.folderPath}`);

    // Delete files from filesystem
    try {
      if (upload.vocalsFilePath) {
        await deleteFileIfExists(upload.vocalsFilePath);
      }
      if (upload.instrumentalFilePath) {
        await deleteFileIfExists(upload.instrumentalFilePath);
      }
      if (upload.processedAudioUrl) {
        await deleteFileIfExists(upload.processedAudioUrl);
      }
      // Delete folder if it exists and is empty
      if (upload.folderPath) {
        await deleteFolderIfEmpty(upload.folderPath);
      }
    } catch (error) {
      console.error(`❌ Error deleting files for upload ${uploadId}:`, error);
    }

    // Delete record from database
    await UploadHistory.deleteOne({ _id: uploadId, userId });
    
    console.log('✅ Successfully deleted upload from database');

    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to delete file if it exists
async function deleteFileIfExists(filePath: string) {
  try {
    let absolutePath;
    
    // Handle different path formats
    if (filePath.startsWith('/uploads/')) {
      // Remove leading slash and join with public directory
      absolutePath = join(process.cwd(), 'public', filePath.substring(1));
    } else if (filePath.startsWith('uploads/')) {
      // Already relative, join with public directory
      absolutePath = join(process.cwd(), 'public', filePath);
    } else if (filePath.startsWith('/')) {
      // Absolute path from root, assume it's already complete
      absolutePath = join(process.cwd(), 'public', filePath.substring(1));
    } else {
      // Relative path, join with public/uploads
      absolutePath = join(process.cwd(), 'public', 'uploads', filePath);
    }

    await unlink(absolutePath);
    console.log(`✅ Successfully deleted file: ${absolutePath}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`⚠️ File not found (already deleted): ${filePath}`);
    } else {
      console.error(`❌ Error deleting file ${filePath}:`, error);
      throw error;
    }
  }
}

// Helper function to delete folder if empty
async function deleteFolderIfEmpty(folderPath: string) {
  try {
    const fs = require('fs').promises;
    const fsSync = require('fs');
    
    let absolutePath;
    
    // Handle different folder path formats
    if (folderPath.startsWith('/uploads/')) {
      absolutePath = join(process.cwd(), 'public', folderPath.substring(1));
    } else if (folderPath.startsWith('uploads/')) {
      absolutePath = join(process.cwd(), 'public', folderPath);
    } else if (folderPath.startsWith('/')) {
      absolutePath = join(process.cwd(), 'public', folderPath.substring(1));
    } else {
      absolutePath = join(process.cwd(), 'public', 'uploads', folderPath);
    }
    
    // Check if directory exists
    if (fsSync.existsSync(absolutePath)) {
      const files = await fs.readdir(absolutePath);
      if (files.length === 0) {
        await fs.rmdir(absolutePath);
        console.log(`✅ Successfully deleted empty folder: ${absolutePath}`);
      } else {
        console.log(`📁 Folder not empty, keeping: ${absolutePath} (contains ${files.length} files)`);
      }
    } else {
      console.log(`⚠️ Folder not found (already deleted): ${folderPath}`);
    }
  } catch (error: any) {
    console.error(`❌ Error deleting folder ${folderPath}:`, error);
  }
}

// Helper function to get relative time
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}