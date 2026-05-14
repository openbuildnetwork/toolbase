import fs from 'fs';
import path from 'path';

const tools = [
  'base64', 'data-lens', 'format-studio', 'magic-pdf', 
  'note-vault', 'open-draw', 'pipeline', 'pixels', 'redact-secrets'
];

const mapping = {};
tools.forEach(tool => {
  mapping[`@/components/features/${tool}`] = `@/modules/${tool}/components`;
});

// Also handle relative imports that might have broken
// e.g. ../../../ui/ -> @/shared/ui/
mapping['../../../ui/'] = '@/shared/ui/';
mapping['../../ui/'] = '@/shared/ui/';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('src', (filePath) => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [oldPath, newPath] of Object.entries(mapping)) {
    if (content.includes(oldPath)) {
      content = content.split(oldPath).join(newPath);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in ${filePath}`);
  }
});
