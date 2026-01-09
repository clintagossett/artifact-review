import { useState, useEffect } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArtifactDetailsTab } from './artifact-settings/ArtifactDetailsTab';
import { ArtifactVersionsTab } from './artifact-settings/ArtifactVersionsTab';
import { ArtifactAccessTab } from './artifact-settings/ArtifactAccessTab';
import { ArtifactActivityTab } from './artifact-settings/ArtifactActivityTab';
import { Id } from '@/convex/_generated/dataModel';

interface ArtifactSettingsProps {
  onBack: () => void;
  artifactId: Id<"artifacts">;
  artifactName: string;
  isOwner: boolean;
  initialTab?: TabType;
}

type TabType = 'details' | 'versions' | 'access' | 'activity';

// Map tab types to hash values
const tabToHash: Record<TabType, string> = {
  'activity': 'activity',
  'access': 'access',
  'versions': 'versions',
  'details': 'details',
};

// Map hash values to tab types
const hashToTab: Record<string, TabType> = {
  'activity': 'activity',
  'access-and-activity': 'activity',
  'access': 'access',
  'versions': 'versions',
  'details': 'details',
};

export function ArtifactSettings({ onBack, artifactId, artifactName, isOwner, initialTab = 'versions' }: ArtifactSettingsProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Update active tab when initialTab prop changes (e.g., from URL)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Listen for hash changes (browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hashToTab[hash]) {
        setActiveTab(hashToTab[hash]);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.location.hash = tabToHash[tab];
  };

  // If not owner, redirect back (shouldn't happen but safety check)
  if (!isOwner) {
    onBack();
    return null;
  }

  const tabs = [
    { id: 'versions' as TabType, label: 'Versions', icon: '📚' },
    { id: 'activity' as TabType, label: 'Activity', icon: '📈' },
    { id: 'access' as TabType, label: 'Access', icon: '👥' },
    { id: 'details' as TabType, label: 'Details', icon: '📝' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">Artifact Settings</h1>
                  <p className="text-sm text-gray-600">{artifactName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  px-4 py-3 text-sm font-medium transition-colors relative
                  ${activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'details' && <ArtifactDetailsTab artifactId={artifactId} />}
        {activeTab === 'versions' && <ArtifactVersionsTab artifactId={artifactId} />}
        {activeTab === 'access' && <ArtifactAccessTab artifactId={artifactId} />}
        {activeTab === 'activity' && <ArtifactActivityTab artifactId={artifactId} />}
      </main>
    </div>
  );
}
