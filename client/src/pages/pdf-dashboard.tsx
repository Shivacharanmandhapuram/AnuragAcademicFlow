import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Upload, Share2, Download, Trash2, Copy, LogOut } from "lucide-react";
import type { PdfNote } from "@shared/schema";

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  file: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please select a file"),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function PdfDashboard() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfNote | null>(null);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const { data: pdfs = [], isLoading } = useQuery<PdfNote[]>({
    queryKey: ["/api/pdfs"],
  });

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      const file = data.file[0];
      
      // Step 1: Get presigned URL
      const presignRes = await apiRequest("POST", "/api/pdfs/presign-upload", {
        fileName: file.name,
      });
      const { uploadUrl, s3Key } = await presignRes.json();

      // Step 2: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to S3");
      }

      // Step 3: Save metadata to DB
      const metadataRes = await apiRequest("POST", "/api/pdfs", {
        title: data.title,
        description: data.description || "",
        s3Key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/pdf",
      });

      return await metadataRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdfs"] });
      setUploadDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "PDF uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload PDF",
        variant: "destructive",
      });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const res = await apiRequest("POST", `/api/pdfs/${id}/share`, { isPublic });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdfs"] });
      if (data.shareUrl) {
        navigator.clipboard.writeText(data.shareUrl);
        toast({
          title: "Success",
          description: "Share link copied to clipboard",
        });
      } else {
        toast({
          title: "Success",
          description: "PDF is now private",
        });
      }
      setShareDialogOpen(false);
      setSelectedPdf(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update sharing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("GET", `/api/pdfs/${id}/download`);
      return await res.json();
    },
    onSuccess: (data) => {
      window.open(data.downloadUrl, "_blank");
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pdfs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdfs"] });
      toast({
        title: "Success",
        description: "PDF deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UploadFormData) => {
    uploadMutation.mutate(data);
  };

  const handleShare = (pdf: PdfNote) => {
    setSelectedPdf(pdf);
    setShareDialogOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold" data-testid="text-app-title">PDF Sharing</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground" data-testid="text-user-email">
              {user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-dashboard-title">My PDFs</h2>
            <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
              Upload and share your PDF documents
            </p>
          </div>
          <Button
            onClick={() => setUploadDialogOpen(true)}
            data-testid="button-upload-pdf"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload PDF
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} data-testid={`skeleton-card-${i}`}>
                <CardHeader>
                  <div className="h-5 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pdfs.length === 0 ? (
          <Card data-testid="card-empty-state">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium" data-testid="text-empty-title">No PDFs yet</p>
              <p className="text-sm text-muted-foreground" data-testid="text-empty-description">
                Upload your first PDF to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pdfs.map((pdf) => (
              <Card key={pdf.id} data-testid={`card-pdf-${pdf.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="line-clamp-2" data-testid={`text-pdf-title-${pdf.id}`}>
                      {pdf.title}
                    </span>
                    {pdf.isPublic && (
                      <Share2 className="w-4 h-4 text-primary flex-shrink-0" data-testid={`icon-public-${pdf.id}`} />
                    )}
                  </CardTitle>
                  {pdf.description && (
                    <CardDescription className="line-clamp-2" data-testid={`text-pdf-description-${pdf.id}`}>
                      {pdf.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p data-testid={`text-pdf-size-${pdf.id}`}>Size: {formatFileSize(pdf.fileSize)}</p>
                    <p data-testid={`text-pdf-date-${pdf.id}`}>Uploaded: {formatDate(pdf.createdAt)}</p>
                    <p data-testid={`text-pdf-downloads-${pdf.id}`}>Downloads: {pdf.downloadCount}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => downloadMutation.mutate(pdf.id)}
                      disabled={downloadMutation.isPending}
                      data-testid={`button-download-${pdf.id}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShare(pdf)}
                      data-testid={`button-share-${pdf.id}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(pdf.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${pdf.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent data-testid="dialog-upload">
          <DialogHeader>
            <DialogTitle data-testid="text-upload-title">Upload PDF</DialogTitle>
            <DialogDescription data-testid="text-upload-description">
              Add a new PDF document to your library
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="My Document" data-testid="input-pdf-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the document"
                        data-testid="input-pdf-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>PDF File</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => onChange(e.target.files)}
                        data-testid="input-pdf-file"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                  className="flex-1"
                  data-testid="button-upload-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploadMutation.isPending}
                  className="flex-1"
                  data-testid="button-upload-submit"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent data-testid="dialog-share">
          <DialogHeader>
            <DialogTitle data-testid="text-share-title">Share PDF</DialogTitle>
            <DialogDescription data-testid="text-share-description">
              Make this PDF publicly accessible or keep it private
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium" data-testid="text-share-status">
                Current status: {selectedPdf?.isPublic ? "Public" : "Private"}
              </p>
              {selectedPdf?.isPublic && selectedPdf?.shareToken && (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/shared/${selectedPdf.shareToken}`}
                    data-testid="input-share-url"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/shared/${selectedPdf.shareToken}`
                      );
                      toast({
                        title: "Copied",
                        description: "Link copied to clipboard",
                      });
                    }}
                    data-testid="button-copy-link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShareDialogOpen(false)}
                className="flex-1"
                data-testid="button-share-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedPdf) {
                    shareMutation.mutate({
                      id: selectedPdf.id,
                      isPublic: !selectedPdf.isPublic,
                    });
                  }
                }}
                disabled={shareMutation.isPending}
                className="flex-1"
                data-testid="button-share-toggle"
              >
                {shareMutation.isPending
                  ? "Updating..."
                  : selectedPdf?.isPublic
                  ? "Make Private"
                  : "Make Public"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
