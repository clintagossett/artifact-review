import { InteractiveArtifactViewer } from "../../../components/spike/InteractiveArtifactViewer";

const TEST_HTML = `
<div class="wiki-content">
    <h2>1. Introduction</h2>
    <p>This is a <strong>complex HTML document</strong> designed to test the robustness of the annotation library.</p>
    <p>It includes various block-level elements, <span style="color: red;">inline styles</span>, and nested structures.</p>

    <h3>1.1 Features</h3>
    <ul>
        <li>Nested lists
            <ul>
                <li>Level 2 item A</li>
                <li>Level 2 item B</li>
            </ul>
        </li>
        <li>Code blocks</li>
        <li>Blockquotes</li>
    </ul>

    <blockquote>
        "The quick brown fox jumps over the lazy dog."
        <footer>- A famous pangram</footer>
    </blockquote>

    <h3>1.2 Code Example</h3>
    <pre><code>
function helloWorld() {
    console.log("Hello, World!");
    return true;
}
    </code></pre>

    <hr />

    <h2>2. Detailed Analysis</h2>
    <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
    <p>
        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    </p>

    <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
        <strong>Note:</strong> This is a warning box that should also be selectable.
    </div>
</div>
`;

export default function TestHtmlPage() {
    return (
        <InteractiveArtifactViewer
            title="Complex HTML Test"
            fileName="docs/specs/v2/spec-draft-v2.html"
            textContent={<div dangerouslySetInnerHTML={{ __html: TEST_HTML }} />}
        />
    );
}
