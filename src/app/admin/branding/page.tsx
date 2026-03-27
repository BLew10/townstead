"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BrandingPage() {
  const { orgId, isReady } = useOrg();
  const { organization } = useOrganization();

  const branding = useQuery(
    api.tenantBranding.queries.getByOrgId,
    isReady ? { orgId: orgId! } : "skip"
  );
  const upsert = useMutation(api.tenantBranding.mutations.upsert);

  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [youtube, setYoutube] = useState("");
  const [footerText, setFooterText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branding) {
      setSiteName(branding.siteName ?? "");
      setTagline(branding.tagline ?? "");
      setPrimaryColor(branding.primaryColor ?? "#000000");
      setFacebook(branding.socialLinks?.facebook ?? "");
      setInstagram(branding.socialLinks?.instagram ?? "");
      setTwitter(branding.socialLinks?.twitter ?? "");
      setYoutube(branding.socialLinks?.youtube ?? "");
      setFooterText(branding.footerText ?? "");
    }
  }, [branding]);

  if (!isReady || branding === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Branding"
          description="Customize your community site appearance."
        />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const handleSave = async () => {
    if (!orgId || !organization?.slug) return;
    setSaving(true);
    try {
      await upsert({
        orgId,
        orgSlug: organization.slug,
        siteName: siteName || undefined,
        tagline: tagline || undefined,
        primaryColor: primaryColor || undefined,
        socialLinks: {
          facebook: facebook || undefined,
          instagram: instagram || undefined,
          twitter: twitter || undefined,
          youtube: youtube || undefined,
        },
        footerText: footerText || undefined,
      });
      toast.success("Branding saved.");
    } catch {
      toast.error("Failed to save branding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding"
        description="Customize your community site appearance."
      />

      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              placeholder="My Community Calendar"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              placeholder="Your neighborhood events & deals"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border p-1"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#000000"
                className="max-w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              placeholder="https://facebook.com/yourpage"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              placeholder="https://instagram.com/yourpage"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter / X</Label>
            <Input
              id="twitter"
              placeholder="https://x.com/yourhandle"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtube">YouTube</Label>
            <Input
              id="youtube"
              placeholder="https://youtube.com/@yourchannel"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="footerText">Footer Text</Label>
            <Textarea
              id="footerText"
              placeholder="© 2026 My Community Calendar. All rights reserved."
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Branding"}
        </Button>
      </div>
    </div>
  );
}
