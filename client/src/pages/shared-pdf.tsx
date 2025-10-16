import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import type { PdfNote } from "@shared/schema";

export default function SharedPdf() {
  const [, params] = useRoute("/shared/:token");
  const token = params?.token;
  const { toast } = useToast();

  const { data: pdf, isLoading, error } = useQuery<PdfNote>({
    queryKey: ["/api/pdfs/shared", token],
    enabled: !!token,
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/pdfs/shared/${token}/download`);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-[#8B5CF6] flex items-center justify-center p-4">
        <Card className="w-full max-w-md" data-testid="card-loading">
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-2/3 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-[#8B5CF6] flex items-center justify-center p-4">
        <Card className="w-full max-w-md" data-testid="card-error">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2" data-testid="text-error-title">
              PDF Not Found
            </p>
            <p className="text-sm text-muted-foreground text-center" data-testid="text-error-description">
              This PDF doesn't exist or is no longer publicly shared
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-[#8B5CF6] flex items-center justify-center p-4">
      <Card className="w-full max-w-md" data-testid="card-shared-pdf">
        <CardHeader>
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-center" data-testid="text-pdf-title">
            {pdf.title}
          </CardTitle>
          {pdf.description && (
            <CardDescription className="text-center" data-testid="text-pdf-description">
              {pdf.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>File name:</span>
              <span className="font-medium text-foreground" data-testid="text-pdf-filename">
                {pdf.fileName}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="font-medium text-foreground" data-testid="text-pdf-size">
                {formatFileSize(pdf.fileSize)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Uploaded:</span>
              <span className="font-medium text-foreground" data-testid="text-pdf-date">
                {formatDate(pdf.createdAt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Downloads:</span>
              <span className="font-medium text-foreground" data-testid="text-pdf-downloads">
                {pdf.downloadCount}
              </span>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending}
            data-testid="button-download"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadMutation.isPending ? "Preparing download..." : "Download PDF"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
