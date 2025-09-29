"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Download,
  Music,
  Mic,
  FileAudio,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  Headphones,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser } from "@/app/actions/auth";

interface UploadRecord {
  id: string;
  originalFileName: string;
  originalFileSize: number;
  folderPath: string;
  vocalsFilePath?: string;
  instrumentalFilePath?: string;
  processedAudioUrl?: string; // For effects processing
  effectsApplied?: {
    pitch?: string | null;
    speed?: string | null;
    reverb?: string | null;
  };
  processingStatus: "processing" | "completed" | "failed";
  processingType: "separation" | "effects"; // Type of processing
  processingStartTime: string;
  processingEndTime?: string;
  processingDuration?: number;
  errorMessage?: string;
  fileFormat: string;
  audioKey?: string; // Detected musical key
  audioBpm?: number; // Detected BPM
  createdAt: string;
  updatedAt: string;
  formattedDate: string;
  timeAgo: string;
  fileSizeFormatted: string;
  processingTimeFormatted?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10,
  });
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await getCurrentUser();
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
        return;
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch upload history
  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/history?page=${page}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setUploads(data.uploads);
        setPagination(data.pagination);
      } else {
        toast.error(data.error || "Failed to fetch history");
        if (response.status === 401) {
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
      toast.error("Failed to load upload history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchHistory();
    }
  }, [authLoading, user]);

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchHistory(newPage);
    }
  };

  // Delete specific upload
  const handleDeleteUpload = async (uploadId: string, fileName: string) => {
    try {
      setDeleteLoading(uploadId);
      const response = await fetch(`/api/history?id=${uploadId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully deleted "${fileName}"`);
        // Refresh the current page
        await fetchHistory(pagination.currentPage);
      } else {
        toast.error(data.error || "Failed to delete upload");
      }
    } catch (error) {
      console.error("Failed to delete upload:", error);
      toast.error("Failed to delete upload");
    } finally {
      setDeleteLoading(null);
    }
  };

  // Get status icon and color
  const getStatusDisplay = (status: string, errorMessage?: string) => {
    switch (status) {
      case "completed":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          text: "Completed",
          className: "text-green-500",
        };
      case "processing":
        return {
          icon: <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />,
          text: "Processing",
          className: "text-yellow-500",
        };
      case "failed":
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          text: `Failed${errorMessage ? `: ${errorMessage}` : ""}`,
          className: "text-red-500",
        };
      default:
        return {
          icon: <Clock className="h-4 w-4 text-gray-500" />,
          text: "Unknown",
          className: "text-gray-500",
        };
    }
  };

  // Get processing type icon and label
  const getProcessingTypeDisplay = (type: string) => {
    switch (type) {
      case "effects":
        return {
          icon: <Sliders className="h-5 w-5 text-purple-400" />,
          label: "Effects ",
          color: "text-purple-400",
        };
      case "separation":
      default:
        return {
          icon: <Music className="h-4 w-4 text-purple-400" />,
          label: "Separations",
          color: "text-purple-400",
        };
    }
  };

  // Format effects display
  const formatEffectsDisplay = (effectsApplied?: any) => {
    if (!effectsApplied) return null;

    const effects = [];
    if (effectsApplied.pitch) effects.push(`Pitch: ${effectsApplied.pitch}`);
    if (effectsApplied.speed) effects.push(`Speed: ${effectsApplied.speed}`);
    if (effectsApplied.reverb) effects.push(`Reverb: ${effectsApplied.reverb}`);

    return effects.length > 0 ? effects.join(" • ") : null;
  };

  // Show loading while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen w-full text-white flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-purple-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg text-purple-300">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full text-white bg-gradient-to-br from-black via-purple-900 to-purple-800">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/70 backdrop-blur-sm shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.push("/home")}
              className="cursor-pointer backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-400/50 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </Button>
            <div className="h-6 w-px bg-purple-500/50" />
            <h1 className="text-2xl font-bold">Download History</h1>
          </div>

          <div className="flex items-center space-x-4">
            {user && <div className="text-purple-300">Hi, {user.name}!</div>}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-lg text-purple-300">
              Loading your processing history...
            </p>
          </div>
        ) : uploads.length === 0 ? (
          <Card className="bg-[#2A2A2A] text-white border border-purple-500/30">
            <CardContent className="text-center py-12">
              <FileAudio className="h-16 w-16 text-purple-500/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                No processing history yet
              </h3>
              <p className="text-purple-300 mb-6">
                Start by uploading your first audio file to see your history
                here.
              </p>
              <Button
                onClick={() => router.push("/home")}
                className="cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 
             px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all duration-300 
             hover:scale-105 hover:shadow-purple-500/40 active:scale-95"
              >
                <span className="relative z-10">Upload Your First File</span>
                <div
                  className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 
                  transition-opacity duration-300 hover:opacity-100"
                />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-[#2A2A2A] text-white border border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <FileAudio className="h-5 w-5 text-purple-400" />
                    <span className="text-sm text-purple-300">
                      Total Processing
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{pagination.totalCount}</p>
                </CardContent>
              </Card>

              <Card className="bg-[#2A2A2A] text-white border border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-purple-400" />
                    <span className="text-sm text-purple-300">Completed</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {
                      uploads.filter((u) => u.processingStatus === "completed")
                        .length
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2A2A2A] text-white border border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Music className="h-5 w-5 text-purple-400" />
                    <span className="text-sm text-purple-300">Separations</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {
                      uploads.filter((u) => u.processingType === "separation")
                        .length
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2A2A2A] text-white border border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Sliders className="h-5 w-5 text-purple-400" />
                    <span className="text-sm text-purple-300">Effects</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {
                      uploads.filter((u) => u.processingType === "effects")
                        .length
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Processing History List */}
            <div className="space-y-4">
              {uploads.map((upload) => {
                const statusDisplay = getStatusDisplay(
                  upload.processingStatus,
                  upload.errorMessage
                );
                const typeDisplay = getProcessingTypeDisplay(
                  upload.processingType
                );
                const effectsText = formatEffectsDisplay(upload.effectsApplied);

                return (
                  <Card
                    key={upload.id}
                    className="bg-[#2A2A2A] text-white border border-purple-500/30 hover:border-purple-500/50 transition-colors"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {typeDisplay.icon}
                            <span
                              className={`text-sm font-medium ${typeDisplay.color}`}
                            >
                              {typeDisplay.label}
                            </span>
                          </div>

                          <CardTitle className="text-lg font-semibold text-purple-300 mb-1">
                            {upload.originalFileName}
                          </CardTitle>

                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{upload.formattedDate}</span>
                            </div>
                            <span>•</span>
                            <span>{upload.timeAgo}</span>
                            <span>•</span>
                            <span>{upload.fileSizeFormatted}</span>
                            {upload.processingTimeFormatted && (
                              <>
                                <span>•</span>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{upload.processingTimeFormatted}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Audio Analysis Info */}
                          {(upload.audioKey || upload.audioBpm) && (
                            <div className="flex items-center space-x-4 text-sm text-purple-300 mt-2">
                              {upload.audioKey && (
                                <span>Key: {upload.audioKey}</span>
                              )}
                              {upload.audioBpm && (
                                <span>BPM: {upload.audioBpm}</span>
                              )}
                            </div>
                          )}

                          {/* Effects Applied */}
                          {effectsText && (
                            <div className="text-sm text-orange-300 mt-1">
                              Effects: {effectsText}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-3">
                          <div
                            className={`flex items-center space-x-1 ${statusDisplay.className}`}
                          >
                            {statusDisplay.icon}
                            <span className="text-sm font-medium">
                              {statusDisplay.text}
                            </span>
                          </div>

                          {/* Delete Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-400/70 transition-all duration-300"
                                disabled={deleteLoading === upload.id}
                              >
                                {deleteLoading === upload.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#2A2A2A] text-white border border-red-500/30">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-red-400">
                                  Delete Processing Record
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-300">
                                  Are you sure you want to delete "
                                  {upload.originalFileName}"? This will
                                  permanently remove the processing record and
                                  all associated files. This action cannot be
                                  undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-[#3A3A3A] text-white border-gray-600 hover:bg-[#4A4A4A]">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteUpload(
                                      upload.id,
                                      upload.originalFileName
                                    )
                                  }
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>

                    {upload.processingStatus === "completed" && (
                      <CardContent className="pt-0">
                        {/* Vocal Separation Results */}
                        {upload.processingType === "separation" &&
                          upload.vocalsFilePath &&
                          upload.instrumentalFilePath && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-[#1F1F1F] p-4 rounded-lg border border-purple-800/30">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Mic className="h-4 w-4 text-purple-400" />
                                    <span className="font-medium text-purple-300">
                                      Vocals
                                    </span>
                                  </div>
                                  <a
                                    href={upload.vocalsFilePath}
                                    download
                                    className="text-purple-400 hover:text-purple-300 transition-colors"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </div>
                                <audio controls className="w-full">
                                  <source
                                    src={upload.vocalsFilePath}
                                    type="audio/wav"
                                  />
                                </audio>
                              </div>

                              <div className="bg-[#1F1F1F] p-4 rounded-lg border border-purple-800/30">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Music className="h-4 w-4 text-purple-400" />
                                    <span className="font-medium text-purple-300">
                                      Instrumental
                                    </span>
                                  </div>
                                  <a
                                    href={upload.instrumentalFilePath}
                                    download
                                    className="text-purple-400 hover:text-purple-300 transition-colors"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </div>
                                <audio controls className="w-full">
                                  <source
                                    src={upload.instrumentalFilePath}
                                    type="audio/wav"
                                  />
                                </audio>
                              </div>
                            </div>
                          )}

                        {/* Effects Processing Results */}
                        {upload.processingType === "effects" &&
                          upload.processedAudioUrl && (
                            <div className="bg-[#1F1F1F] p-4 rounded-lg border border-purple-800/30">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Headphones className="h-4 w-4 text-purple-400" />
                                  <span className="font-medium text-purple-300">
                                    Processed Audio
                                  </span>
                                  {effectsText && (
                                    <span className="text-xs text-orange-300 bg-orange-900/30 px-2 py-1 rounded">
                                      {effectsText}
                                    </span>
                                  )}
                                </div>
                                <a
                                  href={upload.processedAudioUrl}
                                  download={upload.originalFileName.replace(
                                    /\.[^.]+$/,
                                    "_effects.wav"
                                  )}
                                  className="text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                              <audio controls className="w-full">
                                <source
                                  src={upload.processedAudioUrl}
                                  type="audio/wav"
                                />
                              </audio>
                            </div>
                          )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                  className="cursor-pointer bg-[#2A2A2A] border-purple-500/30 text-white hover:bg-purple-600/20"
                >
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      const pageNumber =
                        i + Math.max(1, pagination.currentPage - 2);
                      if (pageNumber > pagination.totalPages) return null;

                      return (
                        <Button
                          key={pageNumber}
                          variant={
                            pageNumber === pagination.currentPage
                              ? "default"
                              : "outline"
                          }
                          onClick={() => handlePageChange(pageNumber)}
                          disabled={loading}
                          className={
                            pageNumber === pagination.currentPage
                              ? "bg-purple-600 text-white"
                              : "bg-[#2A2A2A] border-purple-500/30 text-white hover:bg-purple-600/20 cursor-pointer"
                          }
                        >
                          {pageNumber}
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage || loading}
                  className="cursor-pointer bg-[#2A2A2A] border-purple-500/30 text-white hover:bg-purple-600/20"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
