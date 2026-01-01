import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  Check,
  Edit2,
  Trash2,
  Upload,
  X,
  Calendar,
  User
} from 'lucide-react';
import { UploadNewVersionDialog } from './UploadNewVersionDialog';

interface Version {
  id: string;
  number: number;
  customName: string;
  uploadedAt: string;
  uploadedBy: string;
  isLatest: boolean;
}

interface ArtifactVersionsTabProps {
  artifactId: Id<"artifacts">;
}

export function ArtifactVersionsTab({ artifactId }: ArtifactVersionsTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch versions from backend
  const backendVersions = useQuery(api.artifacts.getVersions, { artifactId });

  // Mutations
  const updateNameMutation = useMutation(api.artifacts.updateName);
  const softDeleteMutation = useMutation(api.artifacts.softDeleteVersion);

  // Actions for upload
  const addVersionAction = useAction(api.artifacts.addVersion);

  // ZIP upload functions
  const addZipVersionMutation = useMutation(api.zipUpload.addZipVersion);
  const triggerZipProcessingAction = useAction(api.zipUpload.triggerZipProcessing);

  // Transform backend data to component format
  const versions: Version[] = backendVersions?.map(v => ({
    id: v._id,
    number: v.number,
    customName: v.name || `v${v.number}`,
    uploadedAt: new Date(v.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    uploadedBy: 'Owner', // TODO: Fetch user name from createdBy
    isLatest: v.isLatest,
  })) ?? [];

  const handleRename = (versionId: string, currentName: string) => {
    setEditingId(versionId);
    setEditingName(currentName);
  };

  const handleSaveRename = async (versionId: string) => {
    try {
      await updateNameMutation({
        versionId: versionId as Id<"artifactVersions">,
        name: editingName || null,
      });
      setEditingId(null);
      toast({ title: 'Version renamed' });
    } catch (error) {
      toast({ title: 'Failed to rename version', variant: 'destructive' });
    }
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (versionId: string) => {
    const version = versions.find((v) => v.id === versionId);
    if (versions.length === 1) {
      toast({ title: 'Cannot delete the only version', variant: 'destructive' });
      return;
    }
    if (confirm(`Delete version ${version?.number}? This action cannot be undone.`)) {
      try {
        await softDeleteMutation({
          versionId: versionId as Id<"artifactVersions">,
        });
        toast({ title: 'Version deleted' });
      } catch (error) {
        toast({ title: 'Failed to delete version', variant: 'destructive' });
      }
    }
  };

  const handleUploadNew = () => {
    setUploadDialogOpen(true);
  };

  const handleUploadVersion = async (file: File, entryPoint?: string) => {
    try {
      setIsUploading(true);

      // Determine file type from extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      let fileType: 'html' | 'markdown' | 'zip';

      if (extension === 'html' || extension === 'htm') {
        fileType = 'html';
      } else if (extension === 'md') {
        fileType = 'markdown';
      } else if (extension === 'zip') {
        fileType = 'zip';
      } else {
        throw new Error(`Unsupported file type: .${extension}`);
      }

      // Handle HTML and Markdown files
      if (fileType === 'html' || fileType === 'markdown') {
        // Read file content
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });

        // Upload using addVersion action
        await addVersionAction({
          artifactId,
          fileType,
          content,
          originalFileName: file.name,
        });

        setUploadDialogOpen(false);
        setIsUploading(false);
        toast({ title: 'Version uploaded successfully' });
      }
      // Handle ZIP files
      else if (fileType === 'zip') {
        // Step 1: Get upload URL and create version record
        const { uploadUrl, versionId } = await addZipVersionMutation({
          artifactId,
          fileSize: file.size,
        });

        // Step 2: Upload file to storage URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/zip' },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload ZIP file to storage');
        }

        const { storageId } = await uploadResponse.json();

        // Step 3: Trigger ZIP processing
        await triggerZipProcessingAction({ versionId, storageId });

        setUploadDialogOpen(false);
        setIsUploading(false);
        toast({ title: 'ZIP version uploaded and processing started' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setIsUploading(false);
      toast({ title: 'Upload failed', description: errorMessage, variant: 'destructive' });
    }
  };

  // Show loading state
  if (backendVersions === undefined) {
    return (
      <div className="max-w-5xl">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <p className="text-gray-600">Loading versions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Version History</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage all versions of this artifact
            </p>
          </div>
          <Button onClick={handleUploadNew} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload New Version
          </Button>
        </div>

        {/* Version List */}
        <div className="divide-y divide-gray-200">
          {versions.map((version) => (
            <div key={version.id} className="p-6 hover:bg-gray-50 transition-colors">
              {/* Version Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div>
                    {editingId === version.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 w-64"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveRename(version.id)}
                          className="h-8"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelRename}
                          className="h-8"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {version.customName === `v${version.number}`
                            ? version.customName
                            : `v${version.number} - ${version.customName}`}
                        </h4>
                        {version.isLatest && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Latest
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {editingId !== version.id && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRename(version.id, version.customName)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(version.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {version.uploadedAt}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {version.uploadedBy}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload New Version Dialog */}
      <UploadNewVersionDialog
        open={uploadDialogOpen}
        onClose={() => !isUploading && setUploadDialogOpen(false)}
        onUploadVersion={handleUploadVersion}
        isLoading={isUploading}
      />
    </div>
  );
}
