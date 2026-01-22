import { InteractiveArtifactViewer } from "../../../components/spike/InteractiveArtifactViewer";

// Simulating rendered Markdown
const RENDERED_MARKDOWN = (
    <div className="markdown-body">
        <h1>Project Phoenix: Technical Specification</h1>

        <p><strong>Status:</strong> Draft | <strong>Author:</strong> Jane Doe | <strong>Date:</strong> 2023-10-27</p>

        <h2>Overview</h2>
        <p>
            Project Phoenix aims to revitalize the legacy codebase by migrating to a modern tech stack.
            This document outlines the architectural decisions and migration strategy.
        </p>

        <h2>Architecture</h2>
        <p>We will adopt a <em>micro-frontend</em> architecture to allow independent deployment of features.</p>

        <h3>Core Components</h3>
        <ol>
            <li>
                <strong>Shell App:</strong> The main container handling routing and authentication.
            </li>
            <li>
                <strong>Auth Service:</strong> Handles JWT issuance and validation.
            </li>
            <li>
                <strong>Data Layer:</strong> GraphQL federation gateway.
            </li>
        </ol>

        <h2>Migration Strategy</h2>
        <p>The migration will happen in phases:</p>

        <table>
            <thead>
                <tr>
                    <th className="border p-2 bg-gray-100">Phase</th>
                    <th className="border p-2 bg-gray-100">Description</th>
                    <th className="border p-2 bg-gray-100">Duration</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="border p-2">Phase 1</td>
                    <td className="border p-2">Shell App Setup</td>
                    <td className="border p-2">2 Weeks</td>
                </tr>
                <tr>
                    <td className="border p-2">Phase 2</td>
                    <td className="border p-2">Auth Migration</td>
                    <td className="border p-2">3 Weeks</td>
                </tr>
            </tbody>
        </table>

        <h2>Risks</h2>
        <ul>
            <li>Legacy data consistency during transition.</li>
            <li>Team learning curve for new stack.</li>
        </ul>
    </div>
);

export default function TestMdPage() {
    return (
        <InteractiveArtifactViewer
            title="Complex Markdown Test"
            fileName="projects/phoenix/design/phoenix-spec.md"
            textContent={RENDERED_MARKDOWN}
        />
    );
}
