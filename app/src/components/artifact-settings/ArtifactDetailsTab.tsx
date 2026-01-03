import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Calendar, User, FileText, HardDrive } from 'lucide-react';
import { Id } from '../../../../convex/_generated/dataModel';

interface ArtifactDetailsTabProps {
  artifactId: Id<"artifacts">;
}

export function ArtifactDetailsTab({ artifactId }: ArtifactDetailsTabProps) {
  // Backend integration
  const details = useQuery(api.artifacts.getDetailsForSettings, { artifactId });
  const updateDetailsMutation = useMutation(api.artifacts.updateDetails);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state from backend data
  useEffect(() => {
    if (details) {
      setName(details.name);
      setDescription(details.description || '');
      setHasChanges(false);
    }
  }, [details]);

  // Format helpers
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Metadata from backend
  const metadata = details ? {
    created: formatDate(details.createdAt),
    createdBy: details.creatorEmail || 'Unknown',
    lastModified: formatDate(details.updatedAt),
    fileSize: formatFileSize(details.totalFileSize),
    versions: details.versionCount,
  } : null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name is required',
        description: 'Please enter a name for this artifact.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateDetailsMutation({
        artifactId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setHasChanges(false);
      toast({ title: 'Artifact details updated' });
    } catch (error) {
      toast({
        title: 'Failed to update',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (details) {
      setName(details.name);
      setDescription(details.description || '');
    }
    setHasChanges(false);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setHasChanges(true);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setHasChanges(true);
  };

  // Loading state
  if (details === undefined) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="border-t border-gray-200" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  // Error state (null means no access or not found)
  if (details === null) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <p className="text-gray-600">Unable to load artifact details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 space-y-6">
          {/* Name Field */}
          <div>
            <Label htmlFor="artifact-name" className="text-gray-900">
              Artifact Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="artifact-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-2"
              maxLength={100}
              placeholder="Enter artifact name"
            />
            <p className="text-xs text-gray-600 mt-1">{name.length}/100 characters</p>
          </div>

          {/* Description Field */}
          <div>
            <Label htmlFor="artifact-description" className="text-gray-900">
              Description
            </Label>
            <Textarea
              id="artifact-description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="mt-2 min-h-32"
              maxLength={500}
              placeholder="Add a description to help your team understand this artifact..."
            />
            <p className="text-xs text-gray-600 mt-1">{description.length}/500 characters</p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Metadata */}
          {metadata && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Metadata</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 w-32">Created:</span>
                  <span className="text-gray-900">{metadata.created}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 w-32">Created by:</span>
                  <span className="text-gray-900">{metadata.createdBy}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 w-32">Last modified:</span>
                  <span className="text-gray-900">{metadata.lastModified}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 w-32">File size:</span>
                  <span className="text-gray-900">{metadata.fileSize}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 w-32">Versions:</span>
                  <span className="text-gray-900">{metadata.versions}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        {hasChanges && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">You have unsaved changes</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
