"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Link2,
  Copy,
  Check,
  Globe,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';
import { logger, LOG_TOPICS } from '@/lib/logger';

interface ShareLinkSectionProps {
  artifactId: Id<"artifacts">;
}

export function ShareLinkSection({ artifactId }: ShareLinkSectionProps) {
  const [copied, setCopied] = useState(false);

  // Query for existing share link
  const share = useQuery(api.shares.getForArtifact, { artifactId });

  // Mutations
  const createShare = useMutation(api.shares.create);
  const toggleEnabled = useMutation(api.shares.toggleEnabled);
  const updateCapabilities = useMutation(api.shares.updateCapabilities);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCreateLink = async () => {
    try {
      await createShare({ artifactId });

      toast({
        title: 'Share link created',
        description: 'Your public share link is ready to use.',
      });

      logger.info(LOG_TOPICS.Artifact, 'ShareLinkSection', 'Share link created', {
        artifactId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        LOG_TOPICS.Artifact,
        'ShareLinkSection',
        'Failed to create share link',
        { error: errorMessage, artifactId }
      );

      toast({
        title: 'Failed to create link',
        description: 'Could not create share link. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = async () => {
    if (!share) return;

    const shareUrl = `${window.location.origin}/share/${share.token}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard.',
      });

      logger.info(LOG_TOPICS.Artifact, 'ShareLinkSection', 'Share link copied', {
        artifactId,
      });
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy link to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleEnabled = async () => {
    if (!share) return;

    try {
      const newEnabled = await toggleEnabled({ shareId: share._id });

      toast({
        title: newEnabled ? 'Link enabled' : 'Link disabled',
        description: newEnabled
          ? 'Anyone with the link can now access this artifact.'
          : 'The share link is now inactive.',
      });

      logger.info(LOG_TOPICS.Artifact, 'ShareLinkSection', 'Share link toggled', {
        artifactId,
        enabled: newEnabled,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        LOG_TOPICS.Artifact,
        'ShareLinkSection',
        'Failed to toggle share link',
        { error: errorMessage, artifactId }
      );

      toast({
        title: 'Failed to update',
        description: 'Could not update share link. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCapabilityChange = async (capability: 'readComments' | 'writeComments', checked: boolean) => {
    if (!share) return;

    // Build new capabilities object
    const newCapabilities = {
      ...share.capabilities,
      [capability]: checked,
    };

    // If enabling writeComments, also enable readComments (can't write without reading)
    if (capability === 'writeComments' && checked) {
      newCapabilities.readComments = true;
    }

    // If disabling readComments, also disable writeComments
    if (capability === 'readComments' && !checked) {
      newCapabilities.writeComments = false;
    }

    try {
      await updateCapabilities({
        shareId: share._id,
        capabilities: newCapabilities,
      });

      toast({
        title: 'Capabilities updated',
        description: 'Share link permissions have been updated.',
      });

      logger.info(LOG_TOPICS.Artifact, 'ShareLinkSection', 'Capabilities updated', {
        artifactId,
        capabilities: newCapabilities,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        LOG_TOPICS.Artifact,
        'ShareLinkSection',
        'Failed to update capabilities',
        { error: errorMessage, artifactId }
      );

      toast({
        title: 'Failed to update',
        description: 'Could not update capabilities. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Loading state - show nothing while loading
  if (share === undefined) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Public Share Link</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Create a link that anyone can use to view this artifact without an invitation.
        </p>

        {!share ? (
          // No share link exists - show create button
          <Button onClick={handleCreateLink} variant="outline">
            <Link2 className="w-4 h-4 mr-2" />
            Create Public Link
          </Button>
        ) : (
          // Share link exists - show controls
          <div className="space-y-4">
            {/* Link display and copy - only show when enabled */}
            {share.enabled && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-700 font-mono truncate border border-gray-200">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${share.token}`}
                </div>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Enable/Disable toggle */}
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                onClick={handleToggleEnabled}
                variant={share.enabled ? "default" : "outline"}
                size="sm"
                className={share.enabled ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {share.enabled ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Enabled
                  </>
                ) : (
                  'Enable Link'
                )}
              </Button>

              <Badge
                variant="outline"
                className={
                  share.enabled
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }
              >
                {share.enabled ? 'Link Active' : 'Link Inactive'}
              </Badge>
            </div>

            {/* Capabilities checkboxes */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Capabilities</h4>
              <div className="space-y-3">
                {/* View artifact is always enabled - it's implicit */}
                <div className="flex items-center gap-2 text-gray-400">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">View artifact</span>
                  <span className="text-xs">(always enabled)</span>
                </div>

                {/* Read comments */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="readComments"
                    checked={share.capabilities.readComments}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      handleCapabilityChange('readComments', checked === true)
                    }
                    disabled={!share.enabled}
                  />
                  <Label
                    htmlFor="readComments"
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4 text-gray-500" />
                    Read comments
                  </Label>
                </div>

                {/* Write comments */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="writeComments"
                    checked={share.capabilities.writeComments}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      handleCapabilityChange('writeComments', checked === true)
                    }
                    disabled={!share.enabled || !share.capabilities.readComments}
                  />
                  <Label
                    htmlFor="writeComments"
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    Write comments
                    <span className="text-xs text-gray-400">(requires sign-in)</span>
                  </Label>
                </div>
              </div>
            </div>

            {/* Help text */}
            <p className="text-xs text-gray-500">
              {!share.enabled
                ? 'Enable the link to make this artifact publicly accessible.'
                : !share.capabilities.readComments
                ? 'Anyone with this link can view the artifact. Comments are hidden.'
                : !share.capabilities.writeComments
                ? 'Anyone can view the artifact and see existing comments.'
                : 'Anyone can view and see comments. Sign-in is required to add comments.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
