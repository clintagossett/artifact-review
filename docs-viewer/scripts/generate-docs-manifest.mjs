import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.resolve(__dirname, '../../docs');
const TASKS_DIR = path.resolve(__dirname, '../../tasks');
const OUTPUT_FILE = path.resolve(__dirname, '../public/docs-manifest.json');

function getFileTree(dir, relativePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const result = [];

    for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;

        const fullPath = path.join(dir, item.name);
        const relPath = path.join(relativePath, item.name);

        if (item.isDirectory()) {
            result.push({
                name: item.name,
                type: 'directory',
                path: relPath,
                children: getFileTree(fullPath, relPath)
            });
        } else {
            result.push({
                name: item.name,
                type: 'file',
                path: relPath,
                ext: path.extname(item.name)
            });
        }
    }

    // Sort: directories first, then files alphabetically
    return result.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
    });
}

try {
    const tree = [];

    // Process docs directory
    if (fs.existsSync(DOCS_DIR)) {
        console.log(`Scanning docs directory: ${DOCS_DIR}`);
        tree.push({
            name: 'docs',
            type: 'directory',
            path: 'docs',
            children: getFileTree(DOCS_DIR, 'docs')
        });
    }

    // Process tasks directory
    if (fs.existsSync(TASKS_DIR)) {
        console.log(`Scanning tasks directory: ${TASKS_DIR}`);
        tree.push({
            name: 'tasks',
            type: 'directory',
            path: 'tasks',
            children: getFileTree(TASKS_DIR, 'tasks')
        });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tree, null, 2));
    console.log(`Manifest generated at: ${OUTPUT_FILE}`);
} catch (error) {
    console.error('Error generating docs manifest:', error);
    process.exit(1);
}
