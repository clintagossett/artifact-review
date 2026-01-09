import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.resolve(__dirname, '../../docs');
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
    console.log(`Scanning docs directory: ${DOCS_DIR}`);
    const tree = getFileTree(DOCS_DIR);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tree, null, 2));
    console.log(`Manifest generated at: ${OUTPUT_FILE}`);
} catch (error) {
    console.error('Error generating docs manifest:', error);
    process.exit(1);
}
