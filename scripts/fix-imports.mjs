import fs from 'fs';
import path from 'path';

const mapping = {
  '@/modules/redact-secrets/types': '@/shared/types/redact-secrets',
  '@/modules/note-vault/types': '@/shared/types/note-vault',
  '@/modules/base64/types': '@/shared/types/base64',
  '@/modules/json-to-interface/types': '@/shared/types/json-to-interface',
  '@/modules/speed-test/types': '@/shared/types/speed-test',
  '@/modules/note-vault/hooks/useNoteVault': '@/shared/hooks/useNoteVault',
  '@/modules/redact-secrets/hooks/useRedactWorker': '@/shared/hooks/useRedactWorker',
};

// Also check for useNoteVault and useRedactWorker if they moved to shared
// Wait, did I move them? I should check.

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
