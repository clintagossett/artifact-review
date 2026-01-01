import { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface UploadNewVersionDialogProps {
  open: boolean;
  onClose: () => void;
  onUploadVersion: (file: File, entryPoint?: string) => void;
}

export function UploadNewVersionDialog({
  open,
  onClose,
  onUploadVersion,
}: UploadNewVersionDialogProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setUploadedFile(file);
  };

  const handleSubmit = () => {
    if (!uploadedFile) return;

    onUploadVersion(uploadedFile);

    // Reset form
    setUploadedFile(null);
  };

  const handleClose = () => {
    setUploadedFile(null);
    setDragActive(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload New Version
          </DialogTitle>
          <DialogDescription>
            Upload a new version of this artifact. Supports HTML, Markdown, and ZIP files.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Upload Area */}
          <div>
            <Label className="mb-2 block">Select File</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : uploadedFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploadedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-green-600" />
                  <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">
                      Drop file here or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports .html, .md, and .zip files
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.md,.markdown,.zip,text/html,text/markdown,application/zip"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!uploadedFile}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Upload Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
