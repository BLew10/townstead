"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ImageUpload } from "@/components/shared/image-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import { usePortalAuth } from "@/hooks/use-portal-auth";

export default function PortalAssetsPage() {
  const { contactId } = usePortalAuth();
  const assets = useQuery(api.portal.queries.getMyAssets);
  const generateUploadUrl = useMutation(
    api.clientAssets.mutations.generateUploadUrl
  );
  const uploadAsset = useMutation(api.clientAssets.mutations.upload);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!contactId) return;

      setUploading(true);
      try {
        const url = await generateUploadUrl();
        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();

        await uploadAsset({
          contactId,
          fileId: storageId,
          fileName: file.name,
        });
      } finally {
        setUploading(false);
      }
    },
    [contactId, generateUploadUrl, uploadAsset]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Assets</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Upload ad artwork for admin review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            preset="clientAsset"
            onUpload={handleUpload}
            uploading={uploading}
          />
        </CardContent>
      </Card>

      {assets === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No assets uploaded"
          description="Upload ad artwork above to get started."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset._id}>
                  <TableCell className="font-medium">
                    {asset.fileName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        asset.status === "approved"
                          ? "default"
                          : asset.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className={
                        asset.status === "approved"
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : undefined
                      }
                    >
                      {asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {asset.feedback ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
