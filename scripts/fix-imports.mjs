import fs from 'fs';
import path from 'path';

const mapping = {
  '@/shared/lib/ollama': '@/modules/ai-assistant/lib/ollama',
  '@/shared/lib/ping': '@/modules/ping-tester/lib/ping',
  '@/shared/lib/speed-test': '@/modules/speed-test/lib/speed-test',
  '../types/note-vault': '@/modules/note-vault/types',
  './useHistory': '@/shared/hooks/useHistory',
};

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
