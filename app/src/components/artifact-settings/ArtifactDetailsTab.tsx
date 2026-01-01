import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Calendar, User, FileText, HardDrive } from 'lucide-react';
import { Id } from '../../../../convex/_generated/dataModel';

interface ArtifactDetailsTabProps {
  artifactId: Id<"artifacts">;
}

export function ArtifactDetailsTab({ artifactId }: ArtifactDetailsTabProps) {
  const [name, setName] = useState('Product Specs V3');
  const [description, setDescription] = useState(
    'Q1 2024 product specifications for the new feature launch. Includes technical requirements and mockups.'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Mock metadata
  const metadata = {
    created: 'Jan 15, 2024 at 10:30 AM',
    createdBy: 'you@company.com',
    lastModified: 'Jan 20, 2024 at 2:15 PM',
    fileSize: '245 KB',
    versions: 3,
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
    toast({ title: 'Artifact details updated' });
  };

  const handleCancel = () => {
    setName('Product Specs V3');
    setDescription(
      'Q1 2024 product specifications for the new feature launch. Includes technical requirements and mockups.'
    );
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
