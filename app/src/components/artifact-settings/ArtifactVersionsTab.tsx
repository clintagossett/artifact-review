import { useState } from 'react';
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
}

interface ArtifactVersionsTabProps {
  artifactId: string;
}

const mockVersions: Version[] = [
  {
    id: 'v3',
    number: 3,
    customName: 'v3',
    uploadedAt: 'Jan 20, 2024 at 2:15 PM',
    uploadedBy: 'you@company.com',
  },
  {
    id: 'v2',
    number: 2,
    customName: 'v2',
    uploadedAt: 'Jan 18, 2024 at 4:30 PM',
    uploadedBy: 'you@company.com',
  },
  {
    id: 'v1',
    number: 1,
    customName: 'v1',
    uploadedAt: 'Jan 15, 2024 at 10:30 AM',
    uploadedBy: 'you@company.com',
  },
];

export function ArtifactVersionsTab({ artifactId }: ArtifactVersionsTabProps) {
  const [versions, setVersions] = useState<Version[]>(mockVersions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Track highest version number ever created (persists even after deletions)
  // See /VERSION_MANAGEMENT.md for full documentation
  const [maxVersionNumber, setMaxVersionNumber] = useState(3); // Highest in mockVersions

  const handleRename = (versionId: string, currentName: string) => {
    setEditingId(versionId);
    setEditingName(currentName);
  };

  const handleSaveRename = (versionId: string) => {
    setVersions(
      versions.map((v) =>
        v.id === versionId ? { ...v, customName: editingName } : v
      )
    );
    setEditingId(null);
    toast({ title: 'Version renamed' });
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (versionId: string) => {
    const version = versions.find((v) => v.id === versionId);
    if (versions.length === 1) {
      toast({ title: 'Cannot delete the only version', variant: 'destructive' });
      return;
    }
    if (confirm(`Delete version ${version?.number}? This action cannot be undone.`)) {
      setVersions(versions.filter((v) => v.id !== versionId));
      toast({ title: 'Version deleted' });
    }
  };

  const handleUploadNew = () => {
    setUploadDialogOpen(true);
  };

  const handleUploadVersion = async (file: File, entryPoint?: string) => {
    const newVersionNumber = maxVersionNumber + 1;
    const newVersion: Version = {
      id: `v${newVersionNumber}`,
      number: newVersionNumber,
      customName: `v${newVersionNumber}`,
      uploadedAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      uploadedBy: 'you@company.com',
    };

    setVersions([newVersion, ...versions]);
    setMaxVersionNumber(newVersionNumber);
    setUploadDialogOpen(false);
    toast({ title: `Version ${newVersionNumber} uploaded successfully` });
  };

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
        onClose={() => setUploadDialogOpen(false)}
        onUploadVersion={handleUploadVersion}
      />
    </div>
  );
}
