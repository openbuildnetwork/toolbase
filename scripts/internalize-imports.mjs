import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const modulesDir = path.join(process.cwd(), 'src/modules');
const modules = fs.readdirSync(modulesDir).filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory());

modules.forEach(moduleName => {
  const modulePath = path.join(modulesDir, moduleName);
  walk(modulePath, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const alias = `@/modules/${moduleName}/`;
    
    if (content.includes(alias)) {
      // Determine relative path depth
      const relativeToModule = path.relative(path.dirname(filePath), modulePath);
      const replacement = relativeToModule ? (relativeToModule + '/') : './';
      
      // Simple string replacement might be risky with sub-folders, 
      // but in our structure components/ is one level deep.
      // Let's use a more robust replacement for aliases.
      
      const newContent = content.split(alias).join(replacement);
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Converted internal alias in ${filePath}`);
      }
    }
  });
});
