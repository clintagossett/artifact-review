import { useState, useEffect } from 'react'
import { BrowserRouter as Router, useLocation } from 'react-router-dom'
import { FileTree, type DocNode } from './components/FileTree'
import { DocViewer } from './components/DocViewer'
import { Menu, X } from 'lucide-react'

function AppContent() {
  const [manifest, setManifest] = useState<DocNode[]>([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const location = useLocation()

  useEffect(() => {
    fetch('/docs-manifest.json')
      .then(res => res.json())
      .then(data => {
        setManifest(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load manifest:', err)
        setLoading(false)
      })
  }, [])

  // On mobile/small screens, close sidebar when path changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }, [location.pathname])

  const currentDocPath = decodeURIComponent(location.pathname).replace(/^\/view\//, '') || 'docs/_index.md'

  // Clean up if we somehow ended up with a leading slash that wasn't /view/
  const cleanPath = currentDocPath.replace(/^\//, '')

  return (
    <div className="flex h-screen bg-white">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 border-b bg-white flex items-center px-4 z-20">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="ml-2 font-semibold">Docs Viewer</span>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-gray-50 border-r transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarOpen ? 'shadow-xl lg:shadow-none' : ''}
        pt-14 lg:pt-0
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-gray-50 z-10">
            <h1 className="text-lg font-bold text-gray-900">Documentation</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-6 bg-gray-200 rounded w-full" />)}
              </div>
            ) : (
              <FileTree data={manifest} />
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="min-h-full flex flex-col">
          <DocViewer path={cleanPath} />
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
