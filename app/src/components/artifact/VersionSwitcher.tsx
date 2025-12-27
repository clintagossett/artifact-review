import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VersionSwitcherProps {
  currentVersion: number;
  versions: Array<{
    versionNumber: number;
    createdAt: number;
  }>;
  onVersionChange: (versionNumber: number) => void;
}

export function VersionSwitcher({
  currentVersion,
  versions,
  onVersionChange,
}: VersionSwitcherProps) {
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Sort versions in descending order (newest first)
  const sortedVersions = [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber
  );

  return (
    <Select
      value={currentVersion.toString()}
      onValueChange={(value) => onVersionChange(parseInt(value))}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue>v{currentVersion}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortedVersions.map((version) => (
          <SelectItem
            key={version.versionNumber}
            value={version.versionNumber.toString()}
          >
            v{version.versionNumber} - {formatDate(version.createdAt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
