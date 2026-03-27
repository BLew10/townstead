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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Upload } from "lucide-react";
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
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !contactId) return;

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
        e.target.value = "";
      }
    },
    [contactId, generateUploadUrl, uploadAsset]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
        <Button disabled={uploading} asChild>
          <label className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Asset"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Upload ad artwork for admin review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Accepted formats: JPG, PNG, GIF, WebP
            </p>
            <label className="mt-3 inline-block cursor-pointer">
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <span>
                  {uploading ? "Uploading..." : "Choose File"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                </span>
              </Button>
            </label>
          </div>
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
