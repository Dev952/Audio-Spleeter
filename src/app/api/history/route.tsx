import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import UploadHistory from '@/models/UploadHistory';

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
      processingStatus: upload.processingStatus,
      processingStartTime: upload.processingStartTime?.toISOString(),
      processingEndTime: upload.processingEndTime?.toISOString(),
      processingDuration: upload.processingDuration,
      errorMessage: upload.errorMessage,
      fileFormat: upload.fileFormat,
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