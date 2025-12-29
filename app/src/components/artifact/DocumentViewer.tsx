"use client";

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Users,
  MessageSquare,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Reply,
  X,
  Send,
  CheckCircle2,
  XCircle,
  Edit3,
  Upload,
  History,
  Star,
  MapPin,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CommentToolbar } from '@/components/comments/CommentToolbar';
import type {
  Comment,
  TextEdit,
  ToolMode,
  ToolBadge,
  Version,
  Project
} from '@/components/comments/types';
import { Id } from '@/convex/_generated/dataModel';
import { useComments } from '@/hooks/useComments';
import { useCommentActions } from '@/hooks/useCommentActions';
import { useReplyActions } from '@/hooks/useReplyActions';

interface DocumentViewerProps {
  documentId: string;
  onBack: () => void;
  project?: Project;
  onNavigateToSettings?: () => void;
  onNavigateToShare?: () => void;
  onNavigateToVersions?: () => void;
  // Real artifact data
  shareToken: string;
  versionNumber: number;
  versionId: Id<"artifactVersions">;
  convexUrl: string;
}

const mockReviewers = [
  { name: 'Sarah Chen', avatar: 'SC', online: true },
  { name: 'Mike Johnson', avatar: 'MJ', online: true },
  { name: 'Emma Davis', avatar: 'ED', online: false },
];

// Mock comments for Interactive Components demo
// These comments showcase advanced features: hidden tabs, collapsed accordions, multi-page navigation
const mockComments: Comment[] = [
  // Index page - Hidden tab comments
  {
    id: '1',
    versionId: 'v1',
    author: { name: 'Mike Johnson', avatar: 'MJ' },
    content: 'This pricing is too high for starter plan. Should be $19/month.',
    timestamp: '1 hour ago',
    resolved: false,
    highlightedText: '$29/month',
    elementType: 'text',
    elementId: 'pricing-starter', // This is in a HIDDEN tab!
    page: '/index.html',
    replies: [],
  },
  {
    id: '2',
    versionId: 'v1',
    author: { name: 'Emma Davis', avatar: 'ED' },
    content: 'Should we add more details about the Text Edit Tool here?',
    timestamp: '3 hours ago',
    resolved: false,
    elementType: 'text',
    elementId: 'features-li-2', // This is in a HIDDEN tab!
    highlightedText: 'Text Edit Tool',
    page: '/index.html',
    replies: [],
  },
  {
    id: '3',
    versionId: 'v1',
    author: { name: 'Sarah Chen', avatar: 'SC' },
    content: 'The support info looks good. Maybe add live chat hours?',
    timestamp: '4 hours ago',
    resolved: false,
    elementType: 'heading',
    elementId: 'support-heading', // This is in a HIDDEN tab!
    page: '/index.html',
    replies: [],
  },
  // Index page - Accordion comments
  {
    id: '4',
    versionId: 'v1',
    author: { name: 'Sarah Chen', avatar: 'SC' },
    content: 'Great explanation! This FAQ is really helpful.',
    timestamp: '2 hours ago',
    resolved: true,
    elementType: 'text',
    elementId: 'faq3-details', // This is in a COLLAPSED accordion!
    highlightedText: 'automatically expand that section',
    page: '/index.html',
    replies: [
      {
        id: '4-1',
        author: { name: 'Mike Johnson', avatar: 'MJ' },
        content: 'Agreed, the auto-expand feature is a game changer.',
        timestamp: '1 hour ago',
      },
    ],
  },
  {
    id: '5',
    versionId: 'v1',
    author: { name: 'Mike Johnson', avatar: 'MJ' },
    content: 'We should emphasize the optional labels feature more prominently.',
    timestamp: '5 hours ago',
    resolved: false,
    elementType: 'text',
    elementId: 'faq1-li-2',
    highlightedText: 'Optional custom labels',
    page: '/index.html',
    replies: [],
  },
  // Documentation page comments
  {
    id: '6',
    versionId: 'v1',
    author: { name: 'Mike Johnson', avatar: 'MJ' },
    content: 'The API table is really well organized. Nice work!',
    timestamp: '2 hours ago',
    resolved: true,
    elementType: 'section',
    elementId: 'api-table',
    page: '/documentation.html',
    replies: [],
  },
  {
    id: '7',
    versionId: 'v1',
    author: { name: 'Emma Davis', avatar: 'ED' },
    content: 'Should we add authentication examples in this section?',
    timestamp: '1 hour ago',
    resolved: false,
    elementType: 'heading',
    elementId: 'endpoints',
    highlightedText: 'Main Endpoints',
    page: '/documentation.html',
    replies: [
      {
        id: '7-1',
        author: { name: 'Sarah Chen', avatar: 'SC' },
        content: 'Good idea! Let\'s add a separate authentication section.',
        timestamp: '30 mins ago',
      },
    ],
  },
  {
    id: '8',
    versionId: 'v1',
    author: { name: 'Sarah Chen', avatar: 'SC' },
    content: 'This configuration example is perfect. Very clear.',
    timestamp: '3 hours ago',
    resolved: true,
    elementType: 'text',
    elementId: 'config-example',
    page: '/documentation.html',
    replies: [],
  },
];

const mockTextEdits: TextEdit[] = [
  {
    id: 'edit-1',
    author: { name: 'Sarah Chen', avatar: 'SC' },
    type: 'replace',
    originalText: 'cutting-edge solution',
    newText: 'innovative platform',
    comment: 'More accessible language for our target audience',
    timestamp: '1 hour ago',
    status: 'pending',
  },
  {
    id: 'edit-2',
    author: { name: 'Mike Johnson', avatar: 'MJ' },
    type: 'delete',
    originalText: 'No technical expertise required.',
    comment: 'Redundant with "Easy to Use" heading',
    timestamp: '3 hours ago',
    status: 'pending',
  },
];

// Interactive Components HTML with Tabs and Accordion
const interactiveComponentsHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive UI Components</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        
        /* Header */
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 0; text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 42px; margin-bottom: 10px; }
        .header p { font-size: 18px; opacity: 0.9; }
        
        /* Tabs */
        .tabs-container { background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 40px; }
        .tab-buttons { display: flex; background: #f8f9fa; border-bottom: 2px solid #e9ecef; }
        .tab-button { flex: 1; padding: 16px 24px; border: none; background: transparent; color: #6c757d; font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.3s; border-bottom: 3px solid transparent; }
        .tab-button:hover { background: #e9ecef; }
        .tab-button.active { color: #667eea; border-bottom-color: #667eea; background: white; }
        .tab-content { display: none; padding: 30px; }
        .tab-content.active { display: block; }
        .tab-content h2 { color: #667eea; margin-bottom: 15px; font-size: 28px; }
        .tab-content p { margin-bottom: 15px; color: #555; }
        .tab-content ul { margin-left: 20px; margin-bottom: 15px; }
        .tab-content li { margin-bottom: 8px; color: #555; }
        
        /* Accordion */
        .accordion-container { background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .accordion-item { border-bottom: 1px solid #e9ecef; }
        .accordion-item:last-child { border-bottom: none; }
        .accordion-header { padding: 20px 24px; background: white; border: none; width: 100%; text-align: left; cursor: pointer; font-size: 18px; font-weight: 600; color: #333; display: flex; justify-content: space-between; align-items: center; transition: background 0.3s; }
        .accordion-header:hover { background: #f8f9fa; }
        .accordion-header.active { color: #667eea; background: #f8f9fa; }
        .accordion-icon { transition: transform 0.3s; font-weight: bold; color: #667eea; }
        .accordion-header.active .accordion-icon { transform: rotate(180deg); }
        .accordion-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
        .accordion-content.active { max-height: 1000px; }
        .accordion-body { padding: 0 24px 20px 24px; }
        .accordion-body h3 { color: #667eea; margin-bottom: 10px; font-size: 20px; }
        .accordion-body p { margin-bottom: 12px; color: #555; }
        .accordion-body ul { margin-left: 20px; margin-bottom: 12px; }
        .accordion-body li { margin-bottom: 6px; color: #555; }
        
        /* Highlight effect */
        .highlight-element { box-shadow: 0 0 0 3px #a78bfa, 0 0 20px rgba(167, 139, 250, 0.5) !important; }
        h2.highlight-element, h3.highlight-element, p.highlight-element { background: rgba(167, 139, 250, 0.2); padding: 8px; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <h1 id="main-heading">Interactive UI Components Demo</h1>
        <p id="main-subtitle">Testing tabs and accordion with hidden content</p>
    </div>

    <div class="container">
        <!-- Tabs Section -->
        <div class="tabs-container">
            <div class="tab-buttons">
                <button class="tab-button active" onclick="openTab(event, 'overview')">Overview</button>
                <button class="tab-button" onclick="openTab(event, 'features')">Features</button>
                <button class="tab-button" onclick="openTab(event, 'pricing')">Pricing</button>
                <button class="tab-button" onclick="openTab(event, 'support')">Support</button>
            </div>

            <div id="overview" class="tab-content active">
                <h2 id="overview-heading">Product Overview</h2>
                <p id="overview-intro">Our platform revolutionizes the way teams collaborate on HTML document reviews. Built for product managers, designers, and developers.</p>
                <p id="overview-benefits">Key benefits include real-time collaboration, version control, and comprehensive commenting tools that make feedback collection seamless.</p>
                <ul>
                    <li id="overview-li-1">Streamlined review process</li>
                    <li id="overview-li-2">Built-in version management</li>
                    <li id="overview-li-3">Team collaboration features</li>
                </ul>
            </div>

            <div id="features" class="tab-content">
                <h2 id="features-heading">Advanced Features</h2>
                <p id="features-intro">Discover powerful tools designed to enhance your review workflow.</p>
                <ul>
                    <li id="features-li-1"><strong>Comment Tool:</strong> Add non-destructive feedback on any element or selected text</li>
                    <li id="features-li-2"><strong>Text Edit Tool:</strong> Suggest Track Changes-style edits</li>
                    <li id="features-li-3"><strong>Version Control:</strong> Upload multiple versions and compare changes</li>
                    <li id="features-li-4"><strong>Real-time Presence:</strong> See who's viewing the document</li>
                </ul>
                <p id="features-outro">All features are designed with product teams in mind, ensuring a smooth and efficient review process.</p>
            </div>

            <div id="pricing" class="tab-content">
                <h2 id="pricing-heading">Pricing Plans</h2>
                <p id="pricing-intro">Choose the plan that fits your team's needs.</p>
                <p id="pricing-starter"><strong>Starter:</strong> $29/month - Perfect for small teams (up to 5 members)</p>
                <p id="pricing-pro"><strong>Professional:</strong> $99/month - For growing teams (up to 20 members)</p>
                <p id="pricing-enterprise"><strong>Enterprise:</strong> Custom pricing - Unlimited members with premium support</p>
            </div>

            <div id="support" class="tab-content">
                <h2 id="support-heading">Customer Support</h2>
                <p id="support-intro">We're here to help you succeed with our platform.</p>
                <p id="support-availability">Our support team is available 24/7 via email, chat, and phone.</p>
                <ul>
                    <li id="support-li-1">Email: support@artifactreview.com</li>
                    <li id="support-li-2">Chat: Available in-app</li>
                    <li id="support-li-3">Phone: +1 (555) 123-4567</li>
                </ul>
            </div>
        </div>

        <!-- Accordion Section -->
        <h2 style="margin-bottom: 20px; color: #333;">Frequently Asked Questions</h2>
        <div class="accordion-container">
            <div class="accordion-item">
                <button class="accordion-header active" onclick="toggleAccordion(this)">
                    <span>How does version control work?</span>
                    <span class="accordion-icon">▼</span>
                </button>
                <div class="accordion-content active">
                    <div class="accordion-body">
                        <p id="faq1-intro">Our version control system maintains a complete history of all uploaded HTML documents.</p>
                        <p id="faq1-details">Each upload creates an immutable version (v1, v2, v3, etc.) within your project. Comments are version-specific, meaning each version has its own isolated set of comments.</p>
                        <ul>
                            <li id="faq1-li-1">Auto-incrementing version numbers</li>
                            <li id="faq1-li-2">Optional custom labels</li>
                            <li id="faq1-li-3">Set any version as default for sharing</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="accordion-item">
                <button class="accordion-header" onclick="toggleAccordion(this)">
                    <span>What file formats are supported?</span>
                    <span class="accordion-icon">▼</span>
                </button>
                <div class="accordion-content">
                    <div class="accordion-body">
                        <h3 id="faq2-heading">Supported Formats</h3>
                        <p id="faq2-html">We support .html files and .md (Markdown) files.</p>
                        <p id="faq2-formats">Upload your HTML or Markdown artifacts to start reviewing with your team.</p>
                    </div>
                </div>
            </div>

            <div class="accordion-item">
                <button class="accordion-header" onclick="toggleAccordion(this)">
                    <span>Can I comment on hidden content?</span>
                    <span class="accordion-icon">▼</span>
                </button>
                <div class="accordion-content">
                    <div class="accordion-body">
                        <p id="faq3-intro">Yes! You can add comments to any element, even if it's in a collapsed accordion or hidden tab.</p>
                        <p id="faq3-details">When you hover over a comment that references hidden content, we'll automatically expand that section and highlight the element.</p>
                        <ul>
                            <li id="faq3-li-1">Smart navigation to hidden elements</li>
                            <li id="faq3-li-2">Automatic expansion of collapsed sections</li>
                            <li id="faq3-li-3">Visual highlighting of referenced content</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="accordion-item">
                <button class="accordion-header" onclick="toggleAccordion(this)">
                    <span>How do permissions work?</span>
                    <span class="accordion-icon">▼</span>
                </button>
                <div class="accordion-content">
                    <div class="accordion-body">
                        <p id="faq4-intro">Artifact Review offers granular permission controls for sharing projects.</p>
                        <p id="faq4-roles">Three roles are available: Viewer (read-only), Commenter (can add feedback), and Editor (full access).</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Navigation to subpage -->
        <div style="text-align: center; padding: 40px 0;">
            <a href="/documentation.html" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: transform 0.2s;" id="nav-docs-link">
                📚 View API Documentation →
            </a>
        </div>
    </div>

    <script>
        function openTab(evt, tabName) {
            const tabContents = document.getElementsByClassName('tab-content');
            for (let i = 0; i < tabContents.length; i++) {
                tabContents[i].classList.remove('active');
            }
            
            const tabButtons = document.getElementsByClassName('tab-button');
            for (let i = 0; i < tabButtons.length; i++) {
                tabButtons[i].classList.remove('active');
            }
            
            document.getElementById(tabName).classList.add('active');
            evt.currentTarget.classList.add('active');
        }

        function toggleAccordion(header) {
            const content = header.nextElementSibling;
            const isActive = header.classList.contains('active');
            
            // Close all accordions
            const allHeaders = document.querySelectorAll('.accordion-header');
            const allContents = document.querySelectorAll('.accordion-content');
            allHeaders.forEach(h => h.classList.remove('active'));
            allContents.forEach(c => c.classList.remove('active'));
            
            // Open clicked accordion if it wasn't active
            if (!isActive) {
                header.classList.add('active');
                content.classList.add('active');
            }
        }
    </script>
</body>
</html>
`;

// Subpage for Interactive Components
const interactiveComponentsSubPageHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation - Interactive UI Components</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        
        /* Header */
        .header { background: linear-gradient(135deg, #764ba2 0%, #667eea 100%); color: white; padding: 60px 0; text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 42px; margin-bottom: 10px; }
        .header p { font-size: 18px; opacity: 0.9; }
        .nav-link { display: inline-block; margin-top: 20px; color: white; text-decoration: none; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 6px; transition: background 0.3s; }
        .nav-link:hover { background: rgba(255,255,255,0.3); }
        
        /* Documentation Section */
        .doc-section { background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 40px; margin-bottom: 30px; }
        .doc-section h2 { color: #667eea; margin-bottom: 20px; font-size: 32px; }
        .doc-section h3 { color: #764ba2; margin-top: 25px; margin-bottom: 15px; font-size: 24px; }
        .doc-section p { margin-bottom: 15px; color: #555; line-height: 1.8; }
        .doc-section ul { margin-left: 30px; margin-bottom: 20px; }
        .doc-section li { margin-bottom: 10px; color: #555; }
        .doc-section code { background: #f8f9fa; padding: 2px 6px; border-radius: 4px; font-family: 'Monaco', monospace; color: #667eea; }
        .code-block { background: #2d3748; color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; overflow-x: auto; }
        .code-block code { background: transparent; color: #68d391; }
        
        /* Table */
        .api-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .api-table th { background: #667eea; color: white; padding: 12px; text-align: left; }
        .api-table td { padding: 12px; border-bottom: 1px solid #e9ecef; }
        .api-table tr:hover { background: #f8f9fa; }
        
        /* Highlight effect */
        .highlight-element { box-shadow: 0 0 0 3px #a78bfa, 0 0 20px rgba(167, 139, 250, 0.5) !important; }
        h2.highlight-element, h3.highlight-element, p.highlight-element { background: rgba(167, 139, 250, 0.2); padding: 8px; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <h1 id="doc-heading">API Documentation</h1>
        <p id="doc-subtitle">Complete guide to using our platform</p>
        <a href="/index.html" class="nav-link">← Back to Home</a>
    </div>

    <div class="container">
        <!-- Getting Started -->
        <div class="doc-section">
            <h2 id="getting-started">Getting Started</h2>
            <p id="intro-text">Welcome to the comprehensive documentation for our Interactive UI Components platform. This guide will help you understand how to integrate and customize our components for your projects.</p>
            
            <h3 id="installation">Installation</h3>
            <p id="install-desc">To get started, include our library in your HTML file:</p>
            <div class="code-block">
                <code>&lt;script src="https://cdn.example.com/ui-components.js"&gt;&lt;/script&gt;</code>
            </div>
            <p id="install-note">Make sure to include the script before your custom JavaScript files.</p>
        </div>

        <!-- API Reference -->
        <div class="doc-section">
            <h2 id="api-reference">API Reference</h2>
            <p id="api-intro">Our platform provides a robust API for programmatic access to all features.</p>
            
            <h3 id="endpoints">Main Endpoints</h3>
            <table class="api-table" id="api-table">
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr id="endpoint-1">
                        <td><code>GET</code></td>
                        <td><code>/api/components</code></td>
                        <td>Retrieve all available UI components</td>
                    </tr>
                    <tr id="endpoint-2">
                        <td><code>POST</code></td>
                        <td><code>/api/components</code></td>
                        <td>Create a new component instance</td>
                    </tr>
                    <tr id="endpoint-3">
                        <td><code>PUT</code></td>
                        <td><code>/api/components/:id</code></td>
                        <td>Update an existing component</td>
                    </tr>
                    <tr id="endpoint-4">
                        <td><code>DELETE</code></td>
                        <td><code>/api/components/:id</code></td>
                        <td>Remove a component</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Configuration Options -->
        <div class="doc-section">
            <h2 id="config-options">Configuration Options</h2>
            <p id="config-intro">Customize the behavior of components using these configuration options:</p>
            
            <ul>
                <li id="config-1"><strong>theme</strong> - Choose between light, dark, or auto themes</li>
                <li id="config-2"><strong>animations</strong> - Enable or disable transition animations</li>
                <li id="config-3"><strong>responsive</strong> - Configure breakpoints for responsive design</li>
                <li id="config-4"><strong>accessibility</strong> - Set ARIA labels and keyboard navigation options</li>
            </ul>
            
            <p id="config-example">Example configuration:</p>
            <div class="code-block">
                <code>
{
  "theme": "auto",
  "animations": true,
  "responsive": {
    "mobile": 768,
    "tablet": 1024,
    "desktop": 1440
  }
}
                </code>
            </div>
        </div>

        <!-- Best Practices -->
        <div class="doc-section">
            <h2 id="best-practices">Best Practices</h2>
            <p id="practices-intro">Follow these guidelines to get the most out of our platform:</p>
            
            <h3 id="performance">Performance Optimization</h3>
            <ul>
                <li id="practice-1">Lazy load components that are below the fold</li>
                <li id="practice-2">Use CSS animations instead of JavaScript where possible</li>
                <li id="practice-3">Minimize DOM manipulations by batching updates</li>
            </ul>
            
            <h3 id="accessibility">Accessibility</h3>
            <p id="a11y-text">Ensure your implementation is accessible to all users by following WCAG 2.1 guidelines.</p>
        </div>
    </div>
</body>
</html>
`;

const sampleHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Landing Page</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 100px 0; text-align: center; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('https://images.unsplash.com/photo-1524758631624-e2822e304c36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzY2NDIyNzYxfDA&ixlib=rb-4.1.0&q=80&w=1080') center/cover; opacity: 0.15; }
        .hero .container { position: relative; z-index: 1; }
        .hero h1 { font-size: 48px; margin-bottom: 20px; }
        .hero p { font-size: 20px; margin-bottom: 30px; opacity: 0.9; }
        .cta-button { background: white; color: #667eea; padding: 15px 40px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; display: inline-block; text-decoration: none; transition: all 0.3s; }
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .cta-button.highlight-element { box-shadow: 0 0 0 3px #a78bfa, 0 0 20px rgba(167, 139, 250, 0.5); }
        .features { padding: 80px 0; background: #f8f9fa; }
        .features h2 { text-align: center; font-size: 36px; margin-bottom: 50px; }
        .features h2.highlight-element { background: rgba(167, 139, 250, 0.2); padding: 10px; border-radius: 8px; }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
        .feature { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .feature h3 { font-size: 24px; margin-bottom: 15px; color: #667eea; }
        .feature img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-top: 15px; transition: all 0.3s; }
        .feature img.highlight-element { box-shadow: 0 0 0 3px #a78bfa, 0 0 20px rgba(167, 139, 250, 0.5); transform: scale(1.02); }
        .footer { background: #2d3748; color: white; padding: 40px 0; text-align: center; }
        .showcase-section { padding: 60px 0; background: white; }
        .showcase-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .showcase-item { position: relative; overflow: hidden; border-radius: 12px; aspect-ratio: 4/3; }
        .showcase-item img { width: 100%; height: 100%; object-fit: cover; transition: all 0.3s; }
        .showcase-item img.highlight-element { box-shadow: 0 0 0 3px #a78bfa, 0 0 20px rgba(167, 139, 250, 0.5); transform: scale(1.05); }
    </style>
</head>
<body>
    <section class="hero" id="hero-image">
        <div class="container">
            <h1>Welcome to Our Amazing Product</h1>
            <p>Transform your workflow with our cutting-edge solution</p>
            <a href="#" class="cta-button" id="cta-button">Get Started Today</a>
        </div>
    </section>

    <section class="features">
        <div class="container">
            <h2 id="mission-heading">Our Mission</h2>
            <div class="feature-grid">
                <div class="feature">
                    <h3>Easy to Use</h3>
                    <p>Our intuitive interface makes it simple to get started. No technical expertise required.</p>
                </div>
                <div class="feature">
                    <h3>Powerful Features</h3>
                    <p>Access advanced tools that help you work smarter, not harder.</p>
                    <img src="https://images.unsplash.com/photo-1704225618899-b19b021dc9e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NjY0OTc0NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080" alt="Product technology" id="feature-image-1">
                </div>
                <div class="feature">
                    <h3>24/7 Support</h3>
                    <p>Our dedicated team is always here to help you succeed.</p>
                    <img src="https://images.unsplash.com/photo-1709715357479-591f9971fb05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXN0b21lciUyMHN1cHBvcnR8ZW58MXx8fHwxNzY2NTIyMzkwfDA&ixlib=rb-4.1.0&q=80&w=1080" alt="Customer support" id="feature-image-2">
                </div>
            </div>
        </div>
    </section>

    <section class="showcase-section">
        <div class="container">
            <h2 style="text-align: center; margin-bottom: 40px; color: #667eea;">Our Team in Action</h2>
        </div>
        <div class="showcase-grid">
            <div class="showcase-item">
                <img src="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbnxlbnwxfHx8fDE3NjY0OTA2ODB8MA&ixlib=rb-4.1.0&q=80&w=1080" alt="Team collaboration" id="showcase-image-1">
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 Our Company. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>
`;

export function DocumentViewer({
  documentId,
  onBack,
  project,
  onNavigateToSettings,
  onNavigateToShare,
  onNavigateToVersions,
  shareToken,
  versionNumber,
  versionId,
  convexUrl
}: DocumentViewerProps) {
  // Fetch comments from backend
  const backendComments = useComments(versionId);
  const { createComment } = useCommentActions();
  const { createReply } = useReplyActions();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [comments, setComments] = useState<Comment[]>(mockComments);

  // Merge backend comments with mock comments when backend data loads
  useEffect(() => {
    if (backendComments) {
      // Transform backend comments to frontend Comment type
      const transformedComments: Comment[] = backendComments.map((bc) => ({
        id: bc._id,
        versionId: bc.versionId,
        author: {
          name: bc.author.name || 'Anonymous',
          avatar: (bc.author.name || 'A').substring(0, 2).toUpperCase(),
        },
        content: bc.content,
        timestamp: new Date(bc.createdAt).toLocaleString(),
        resolved: bc.resolved,
        // We'll fetch replies separately for now (or set empty array)
        replies: [],
        // Map target metadata to frontend fields
        elementType: bc.target?.type === 'element' ? (bc.target.elementId ? 'section' : 'text') : 'text',
        elementId: bc.target?.elementId,
        highlightedText: bc.target?.selectedText,
        page: bc.target?.page,
      }));

      // Prepend backend comments to mock comments
      setComments([...transformedComments, ...mockComments]);
    }
  }, [backendComments]);
  const [textEdits, setTextEdits] = useState<TextEdit[]>(mockTextEdits);
  const [selectedText, setSelectedText] = useState('');
  const [showCommentTooltip, setShowCommentTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<{
    type: 'text' | 'image' | 'heading' | 'button' | 'section';
    id?: string;
    preview?: string;
    text?: string;
  } | null>(null);
  
  // Tool states
  const [activeToolMode, setActiveToolMode] = useState<ToolMode>(null);
  const [commentBadge, setCommentBadge] = useState<ToolBadge>(null);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [showTextEditDialog, setShowTextEditDialog] = useState(false);
  const [textEditComment, setTextEditComment] = useState('');
  const [pendingTextEdit, setPendingTextEdit] = useState<{
    type: 'delete' | 'replace';
    originalText: string;
    newText?: string;
  } | null>(null);

  // Refs to track current tool state for event listeners (fixes closure issue)
  const activeToolModeRef = useRef<ToolMode>(null);
  const commentBadgeRef = useRef<ToolBadge>(null);

  // Keep refs in sync with state
  useEffect(() => {
    activeToolModeRef.current = activeToolMode;
  }, [activeToolMode]);

  useEffect(() => {
    commentBadgeRef.current = commentBadge;
  }, [commentBadge]);
  
  // Version management states
  const [currentVersionId, setCurrentVersionId] = useState<string>(
    project?.versions[project.versions.length - 1]?.id || 'v1'
  );
  const [defaultVersionId, setDefaultVersionId] = useState<string>(
    project?.versions[project.versions.length - 1]?.id || 'v1'
  );
  
  // Presence states
  const [recentActivity, setRecentActivity] = useState<{
    message: string;
    timestamp: number;
  } | null>(null);
  
  // Multi-page navigation state
  const [currentPage, setCurrentPage] = useState('/index.html');
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['/index.html']);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Filter comments by current version and page
  const currentVersionComments = comments.filter(
    comment => comment.versionId === currentVersionId &&
      (!comment.page || comment.page === currentPage) // Filter by page if specified
  );
  
  const currentVersion = project?.versions.find(v => v.id === currentVersionId);
  const isViewingOldVersion = currentVersionId !== defaultVersionId;
  
  // Build URL to artifact HTML via Next.js proxy (same-origin to avoid CORS issues)
  // Format: /api/artifact/{shareToken}/v{versionNumber}/{page}
  // This proxies to Convex HTTP endpoint, allowing iframe.contentDocument access
  const getArtifactUrl = (page: string = 'index.html') => {
    // Remove leading slash from page if present
    const cleanPage = page.startsWith('/') ? page.substring(1) : page;
    return `/api/artifact/${shareToken}/v${versionNumber}/${cleanPage}`;
  };

  const artifactUrl = getArtifactUrl(currentPage);
  
  // Store location context for each comment
  const [commentLocations, setCommentLocations] = useState<Record<string, Comment['location']>>({});
  
  // Helper: Detect element location (tab/accordion/visible)
  const detectElementLocation = (elementId: string, doc: Document): Comment['location'] | undefined => {
    const element = doc.getElementById(elementId);
    if (!element) return undefined;
    
    // Check if element is in a tab
    let parent = element.parentElement;
    while (parent) {
      if (parent.classList.contains('tab-content')) {
        const tabId = parent.id;
        const isActive = parent.classList.contains('active');
        const tabButton = doc.querySelector(`[onclick*="${tabId}"]`) as HTMLElement;
        const label = tabButton?.textContent?.trim() || tabId;
        return {
          type: 'tab',
          label: label,
          isHidden: !isActive,
        };
      }
      
      // Check if element is in an accordion
      if (parent.classList.contains('accordion-content')) {
        const isActive = parent.classList.contains('active');
        const accordionHeader = parent.previousElementSibling as HTMLElement;
        const label = accordionHeader?.querySelector('span')?.textContent?.trim() || 'Accordion section';
        return {
          type: 'accordion',
          label: label,
          isHidden: !isActive,
        };
      }
      
      parent = parent.parentElement;
    }
    
    return {
      type: 'visible',
      label: '',
      isHidden: false,
    };
  };
  
  // Helper: Navigate to and reveal hidden element
  const navigateToElement = (elementId: string, location?: Comment['location']) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    
    const element = doc.getElementById(elementId);
    if (!element) return;
    
    if (location?.type === 'tab' && location.isHidden) {
      // Find and click the tab button
      let parent = element.parentElement;
      while (parent && !parent.classList.contains('tab-content')) {
        parent = parent.parentElement;
      }
      if (parent) {
        const tabId = parent.id;
        const tabButton = doc.querySelector(`[onclick*="${tabId}"]`) as HTMLButtonElement;
        if (tabButton) {
          tabButton.click();
        }
      }
    }
    
    if (location?.type === 'accordion' && location.isHidden) {
      // Find and click the accordion header
      let parent = element.parentElement;
      while (parent && !parent.classList.contains('accordion-content')) {
        parent = parent.parentElement;
      }
      if (parent) {
        const accordionHeader = parent.previousElementSibling as HTMLButtonElement;
        if (accordionHeader) {
          accordionHeader.click();
        }
      }
    }
    
    // Wait for animation, then scroll and highlight
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-element');
      setTimeout(() => {
        element.classList.remove('highlight-element');
      }, 3000);
    }, 350);
  };

  // Global click handler to block ALL clicks when comment mode is active
  const handleGlobalClick = (e: Event) => {
    // Only intercept when comment mode is active
    if (activeToolModeRef.current !== 'comment' && commentBadgeRef.current === null) {
      return; // Let clicks work normally
    }

    const target = e.target as HTMLElement;

    // Allow clicks on comment tooltip (don't block our own UI)
    if (target.closest('.comment-tooltip')) {
      return;
    }

    // Block ALL clicks when comment mode is active
    e.preventDefault();
    e.stopPropagation();

    // If element has an ID, trigger comment creation
    if (target.id) {
      handleElementClick(e);
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const setupIframeListeners = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Add global click handler with capture phase (runs before element handlers)
      doc.addEventListener('click', handleGlobalClick, true);

      // Add selection listener for text
      doc.addEventListener('mouseup', handleTextSelection);

        // Add click listeners for images and other elements (for comment creation)
        const images = doc.querySelectorAll('img[id]');
        images.forEach((img) => {
          img.addEventListener('click', handleElementClick);
          img.addEventListener('contextmenu', handleElementClick);
          // Add hover effect styling
          (img as HTMLElement).style.cursor = 'pointer';
        });

        // Add click listeners for buttons
        const buttons = doc.querySelectorAll('a.cta-button[id], button[id]');
        buttons.forEach((btn) => {
          btn.addEventListener('click', handleElementClick);
          btn.addEventListener('contextmenu', handleElementClick);
          (btn as HTMLElement).style.cursor = 'pointer';
        });

        // Add click listeners for headings
        const headings = doc.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
        headings.forEach((heading) => {
          heading.addEventListener('click', handleElementClick);
          heading.addEventListener('contextmenu', handleElementClick);
          (heading as HTMLElement).style.cursor = 'pointer';
        });
        
        // Add navigation handling for links
        const links = doc.querySelectorAll('a[href]');
        links.forEach((link) => {
          link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && (href.endsWith('.html') || href.startsWith('/'))) {
              e.preventDefault();
              // Navigate to the new page
              const newPage = href.startsWith('/') ? href : '/' + href;
              setCurrentPage(newPage);
              
              // Update navigation history
              const newHistory = navigationHistory.slice(0, historyIndex + 1);
              newHistory.push(newPage);
              setNavigationHistory(newHistory);
              setHistoryIndex(newHistory.length - 1);
            }
          });
        });
        
        // Detect location context for all comments with elementIds
        const locations: Record<string, Comment['location']> = {};
        currentVersionComments.forEach(comment => {
          if (comment.elementId) {
            const location = detectElementLocation(comment.elementId, doc);
            if (location) {
              locations[comment.id] = location;
            }
          }
        });
        setCommentLocations(locations);
        
        // Add presence indicators styles
        const presenceStyle = doc.createElement('style');
        presenceStyle.textContent = `
          .presence-indicator {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            animation: presencePulse 2s ease-in-out infinite;
          }
          
          @keyframes presencePulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
          }
          
          .presence-label {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 9999;
            margin-top: -20px;
            margin-left: 10px;
          }
        `;
        doc.head.appendChild(presenceStyle);
    };

    // Wait for iframe to load before setting up listeners
    iframe.addEventListener('load', setupIframeListeners);

    // If already loaded, setup immediately
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      setupIframeListeners();
    }

    return () => {
      iframe.removeEventListener('load', setupIframeListeners);
      if (iframe.contentDocument) {
        iframe.contentDocument.removeEventListener('click', handleGlobalClick, true);
        iframe.contentDocument.removeEventListener('mouseup', handleTextSelection);
      }
    };
  }, [currentVersionId, artifactUrl, currentPage]);

  // Reset to index page when version changes
  useEffect(() => {
    setCurrentPage('/index.html');
    setNavigationHistory(['/index.html']);
    setHistoryIndex(0);
  }, [currentVersionId]);

  const handleTextSelection = (e: MouseEvent) => {
    // Block commenting on old versions
    if (isViewingOldVersion) {
      return;
    }

    // Only show comment tooltip if comment tool is active (via button or badge)
    // Use refs to get current values (fixes closure issue)
    if (activeToolModeRef.current !== 'comment' && commentBadgeRef.current === null) {
      return;
    }

    const selection = iframeRef.current?.contentWindow?.getSelection();
    const selectedTextValue = selection?.toString().trim() || '';

    if (selection && selectedTextValue.length > 0) {
      setSelectedText(selection.toString());
      setSelectedElement(null);
      setShowCommentTooltip(true);

      // Position tooltip relative to iframe position
      const iframeRect = iframeRef.current?.getBoundingClientRect();
      if (iframeRect) {
        setTooltipPosition({
          x: iframeRect.left + e.clientX,
          y: iframeRect.top + e.clientY
        });
      } else {
        setTooltipPosition({ x: e.clientX, y: e.clientY });
      }
    } else {
      setShowCommentTooltip(false);
    }
  };

  const handleElementClick = (e: Event) => {
    // Block commenting on old versions
    if (isViewingOldVersion) {
      return;
    }

    // Only allow commenting when comment tool is active
    // Use refs to get current values (fixes closure issue)
    if (activeToolModeRef.current !== 'comment' && commentBadgeRef.current === null) {
      return;
    }

    // When comment mode is active, prevent normal element behavior
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    const elementId = target.id;

    if (!elementId) return;

    let elementType: 'image' | 'heading' | 'button' | 'section' = 'section';
    let elementPreview: string | undefined;
    let elementText: string | undefined;

    // Determine element type
    if (target.tagName === 'IMG') {
      elementType = 'image';
      elementPreview = (target as HTMLImageElement).src;
    } else if (target.tagName.match(/^H[1-6]$/)) {
      elementType = 'heading';
      elementText = target.textContent || undefined;
    } else if (target.tagName === 'A' || target.tagName === 'BUTTON') {
      elementType = 'button';
      elementText = target.textContent || undefined;
    }

    setSelectedElement({
      type: elementType,
      id: elementId,
      preview: elementPreview,
      text: elementText,
    });

    setSelectedText('');
    setShowCommentTooltip(true);
    
    // Get position relative to the viewport
    const rect = target.getBoundingClientRect();
    const iframeRect = iframeRef.current?.getBoundingClientRect();
    
    if (iframeRect) {
      setTooltipPosition({
        x: iframeRect.left + rect.right + 10,
        y: iframeRect.top + rect.top,
      });
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    try {
      // Build target metadata object for backend
      let target: any;

      if (selectedElement) {
        // Comment on an element (image, button, heading, etc.)
        target = {
          _version: 1,
          type: 'element',
          elementId: selectedElement.id,
          selectedText: selectedElement.text,
          page: currentPage,
        };
      } else if (selectedText) {
        // Comment on selected text
        target = {
          _version: 1,
          type: 'text',
          selectedText: selectedText,
          page: currentPage,
        };
      } else {
        return;
      }

      // Save to backend (Convex will broadcast update via useComments hook)
      await createComment(versionId, newCommentText, target);

      // Clear form
      setNewCommentText('');
      setSelectedText('');
      setSelectedElement(null);
      setShowCommentTooltip(false);

      // Handle one-shot vs infinite mode
      if (commentBadge === 'one-shot') {
        // One-shot mode: deactivate tool after creating comment
        setActiveToolMode(null);
        setCommentBadge(null);
      } else if (commentBadge === 'infinite') {
        // Infinite mode: keep tool active
        // Tool stays active for next comment
      }
      // If activeToolMode is set without badge, keep it active (manual toggle mode)
    } catch (error) {
      console.error('Failed to create comment:', error);
      // TODO: Show error toast to user
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    try {
      // Save reply to backend (replies won't show yet - need to fetch them separately)
      await createReply(commentId as Id<"comments">, replyText);

      // Clear form
      setReplyText('');
      setReplyingTo(null);

      // Note: Replies won't appear in UI yet because we're not fetching them
      // TODO: Fetch replies using useCommentReplies hook
    } catch (error) {
      console.error('Failed to create reply:', error);
      // TODO: Show error toast to user
    }
  };

  const toggleResolve = (commentId: string) => {
    setComments(
      comments.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: !comment.resolved } : comment
      )
    );
  };

  const highlightElement = (elementId: string | undefined) => {
    if (!elementId || !iframeRef.current?.contentDocument) return;
    
    const doc = iframeRef.current.contentDocument;
    const element = doc.getElementById(elementId);
    
    if (element) {
      element.classList.add('highlight-element');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const removeHighlight = (elementId: string | undefined) => {
    if (!elementId || !iframeRef.current?.contentDocument) return;
    
    const doc = iframeRef.current.contentDocument;
    const element = doc.getElementById(elementId);
    
    if (element) {
      element.classList.remove('highlight-element');
    }
  };

  useEffect(() => {
    if (hoveredComment) {
      const comment = comments.find((c) => c.id === hoveredComment);
      if (comment?.elementId) {
        // Only highlight if element is currently visible
        const location = commentLocations[comment.id];
        if (!location?.isHidden) {
          highlightElement(comment.elementId);
        }
        // If hidden, clicking the comment card will navigate to it
      }
    } else {
      // Remove all highlights
      comments.forEach((comment) => {
        if (comment.elementId) {
          removeHighlight(comment.elementId);
        }
      });
    }
  }, [hoveredComment, commentLocations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'in-review':
        return 'bg-blue-100 text-blue-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Track last click to prevent double-firing
  const lastClickRef = useRef<number>(0);

  // Tool handlers
  const handleToolChange = (tool: ToolMode) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickRef.current;

    // Prevent double-clicks within 300ms
    if (timeSinceLastClick < 300) {
      return;
    }

    lastClickRef.current = now;
    setActiveToolMode(tool);
  };

  const handleBadgeClick = () => {
    if (commentBadge === null) {
      setCommentBadge('one-shot');
      setActiveToolMode('comment');
    } else if (commentBadge === 'one-shot') {
      setCommentBadge('infinite');
    } else {
      setCommentBadge(null);
      setActiveToolMode(null);
    }
  };

  const handleAcceptTextEdit = (editId: string) => {
    // In a real app, apply the edit to the document
    setTextEdits(textEdits.map(edit => 
      edit.id === editId ? { ...edit, status: 'accepted' } : edit
    ));
  };

  const handleRejectTextEdit = (editId: string) => {
    setTextEdits(textEdits.map(edit => 
      edit.id === editId ? { ...edit, status: 'rejected' } : edit
    ));
  };

  const filteredComments = currentVersionComments.filter(comment => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return comment.resolved;
    if (filter === 'unresolved') return !comment.resolved;
    return true;
  });

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(0.9);
          }
        }
        
        @keyframes presenceBlink {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
          }
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateX(20px);
          }
        }
      `}</style>
      
      {/* Activity Notification */}
      {recentActivity && (
        <div 
          className="fixed top-20 right-6 z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[200px]"
          style={{
            animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s forwards',
          }}
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-gray-900 font-medium">{recentActivity.message}</span>
        </div>
      )}
      
      <div className="h-screen flex flex-col bg-white">
        {/* Top Bar */}
        <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            
            {/* Version Selector */}
            {project && project.versions.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="font-semibold text-gray-900">{project.name}</h1>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <History className="w-4 h-4" />
                        v{currentVersion?.number || 1}
                        {currentVersionId === defaultVersionId && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs ml-1">
                            Default
                          </Badge>
                        )}
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-80">
                      <div className="px-2 py-1.5 text-sm font-semibold text-gray-900">Version History</div>
                      <DropdownMenuSeparator />
                      {project.versions.slice().reverse().map((version) => (
                        <DropdownMenuItem
                          key={version.id}
                          onClick={() => setCurrentVersionId(version.id)}
                          className={`${currentVersionId === version.id ? 'bg-purple-50' : ''}`}
                        >
                          <div className="flex items-start justify-between w-full gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">v{version.number}</span>
                                {version.label && (
                                  <Badge variant="secondary" className="text-xs">
                                    {version.label}
                                  </Badge>
                                )}
                                {version.id === defaultVersionId && (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                                    👁️ Default
                                  </Badge>
                                )}
                                {currentVersionId === version.id && (
                                  <Check className="w-4 h-4 text-purple-600" />
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {version.fileName}
                                {version.entryPoint && ` → ${version.entryPoint}`}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {version.uploadedAt} • {version.uploadedBy}
                              </div>
                            </div>
                            {currentVersionId === version.id && version.id !== defaultVersionId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDefaultVersionId(version.id);
                                }}
                              >
                                <Star className="w-3 h-3 mr-1" />
                                Set Default
                              </Button>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-purple-600"
                        onClick={onNavigateToVersions}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload New Version
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
            
            {!project && <h1 className="font-semibold text-gray-900">homepage-v2.html</h1>}
            
            <Badge className={getStatusColor(status)}>
              {status === 'in-review' ? 'In Review' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {onNavigateToShare && (
                <Button variant="outline" size="sm" onClick={onNavigateToShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}
              {onNavigateToSettings && (
                <Button variant="outline" size="sm" onClick={onNavigateToSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Comment Toolbar */}
      <CommentToolbar
        activeToolMode={activeToolMode}
        commentBadge={commentBadge}
        onToolChange={handleToolChange}
        onBadgeClick={handleBadgeClick}
        filter={filter}
        onFilterChange={setFilter}
        activeCount={filteredComments.filter(c => !c.resolved).length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Display */}
        <div className="flex-1 overflow-auto bg-gray-50 p-8">
          {/* Old Version Banner */}
          {isViewingOldVersion && (
            <div className="max-w-5xl mx-auto mb-4 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-amber-200 text-amber-900">
                  📜 Historical Version
                </Badge>
                <p className="text-amber-900">
                  You're viewing <strong>v{currentVersion?.number}</strong> (read-only). 
                  Comments are locked on old versions.
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setCurrentVersionId(defaultVersionId)}
              >
                Switch to Default (v{project?.versions.find(v => v.id === defaultVersionId)?.number})
              </Button>
            </div>
          )}
          
          {/* Helpful Hint Banner - Only show on default version */}
          {!isViewingOldVersion && (
            <div className="max-w-5xl mx-auto mb-4 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                💡 Tip
              </Badge>
              <p className="text-purple-900">
                <strong>Select text</strong> to comment, or <strong>right-click images, buttons, or headings</strong> to add comments to them
              </p>
            </div>
          )}

          <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
            <iframe
              ref={iframeRef}
              src={artifactUrl}
              className="w-full h-[1000px] border-0"
              title="HTML Document Preview"
            />
          </div>
        </div>

        {/* Comments Sidebar */}
        {sidebarOpen && (
          <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-700" />
                <h2 className="font-semibold text-gray-900">
                  Comments ({comments.filter((c) => !c.resolved).length})
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Comments List */}
              {filteredComments.map((comment) => {
                const isHidden = commentLocations[comment.id]?.isHidden;
                return (
                <div
                  key={comment.id}
                  className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-lg ${
                    comment.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                  } ${hoveredComment === comment.id ? (isHidden ? 'ring-2 ring-amber-400 shadow-md' : 'ring-2 ring-purple-400 shadow-md') : ''}`}
                  onMouseEnter={() => setHoveredComment(comment.id)}
                  onMouseLeave={() => setHoveredComment(null)}
                  onClick={() => {
                    if (comment.elementId) {
                      const location = commentLocations[comment.id];
                      navigateToElement(comment.elementId, location);
                    }
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white text-xs">
                        {comment.author.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-gray-900">{comment.author.name}</span>
                        <span className="text-gray-500">{comment.timestamp}</span>
                        {comment.elementType && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {comment.elementType}
                          </Badge>
                        )}
                        {/* Location Badge for Hidden Content */}
                        {commentLocations[comment.id]?.isHidden && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            {commentLocations[comment.id]?.type === 'tab' ? 'Tab' : 'Accordion'}: {commentLocations[comment.id]?.label.substring(0, 25)}{commentLocations[comment.id]?.label && commentLocations[comment.id]!.label.length > 25 ? '...' : ''}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Image Preview for Image Comments */}
                      {comment.elementType === 'image' && comment.elementPreview && (
                        <div className="mb-2 relative group">
                          <img
                            src={comment.elementPreview}
                            alt="Referenced element"
                            className="w-full h-32 object-cover rounded border-2 border-purple-200"
                          />
                          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs opacity-90">
                            📍 Linked Image
                          </div>
                        </div>
                      )}
                      
                      {comment.highlightedText && !comment.elementPreview && (
                        <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded mb-2 font-mono inline-block">
                          "{comment.highlightedText}"
                        </div>
                      )}
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies.length > 0 && (
                    <div className="ml-11 space-y-3 mt-3 pt-3 border-t border-gray-200">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="bg-gradient-to-br from-green-400 to-teal-500 text-white text-xs">
                              {reply.author.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{reply.author.name}</span>
                              <span className="text-gray-500">{reply.timestamp}</span>
                            </div>
                            <p className="text-gray-700">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  {replyingTo === comment.id ? (
                    <div className="ml-11 mt-3 pt-3 border-t border-gray-200">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAddReply(comment.id); }}>
                          <Send className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setReplyingTo(null); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-11 mt-3 pt-3 border-t border-gray-200 flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setReplyingTo(comment.id); }}
                      >
                        Reply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); toggleResolve(comment.id); }}
                      >
                        {comment.resolved ? (
                          <>Unresolve</>
                        ) : (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Resolve
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>
        )}

        {/* Collapsed Sidebar Toggle */}
        {!sidebarOpen && (
          <Button
            variant="outline"
            size="sm"
            className="absolute right-4 top-20"
            onClick={() => setSidebarOpen(true)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Comments ({comments.filter((c) => !c.resolved).length})
          </Button>
        )}
      </div>

      {/* Comment Tooltip */}
      {showCommentTooltip && (
        <div
          className="fixed bg-white shadow-lg rounded-lg p-4 z-50 w-80 border border-gray-200"
          style={{
            left: Math.min(tooltipPosition.x, window.innerWidth - 340),
            top: tooltipPosition.y + 10,
          }}
        >
          <div className="mb-3">
            {selectedElement?.type === 'image' && selectedElement.preview ? (
              <>
                <div className="text-gray-600 mb-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {selectedElement.type}
                  </Badge>
                  <span className="text-xs">Click to comment on this image</span>
                </div>
                <img
                  src={selectedElement.preview}
                  alt="Selected element"
                  className="w-full h-40 object-cover rounded border-2 border-purple-200 mb-2"
                />
              </>
            ) : selectedElement?.text ? (
              <>
                <div className="text-gray-600 mb-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {selectedElement.type}
                  </Badge>
                  <span className="text-xs">Commenting on this element</span>
                </div>
                <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded mb-2 font-mono">
                  "{selectedElement.text.substring(0, 50)}{selectedElement.text.length > 50 ? '...' : ''}"
                </div>
              </>
            ) : selectedText ? (
              <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded mb-2 font-mono">
                "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
              </div>
            ) : null}
          </div>
          <Textarea
            placeholder="Add a comment..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddComment}>
              <Send className="w-3 h-3 mr-1" />
              Comment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCommentTooltip(false);
                setNewCommentText('');
                setSelectedText('');
                setSelectedElement(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      </div>
    </>
  );
}