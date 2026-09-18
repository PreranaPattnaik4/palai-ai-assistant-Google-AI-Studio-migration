import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const templatesDir = path.join(rootDir, 'templates');
const staticDir = path.join(rootDir, 'static');

// Ensure public directory and subdirectories exist
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(path.join(publicDir, 'static'), { recursive: true });
fs.mkdirSync(path.join(publicDir, 'templates'), { recursive: true });

// Copy templates/index.html -> public/index.html and public/templates/index.html
if (fs.existsSync(path.join(templatesDir, 'index.html'))) {
  fs.copyFileSync(
    path.join(templatesDir, 'index.html'),
    path.join(publicDir, 'index.html')
  );
  fs.copyFileSync(
    path.join(templatesDir, 'index.html'),
    path.join(publicDir, 'templates', 'index.html')
  );
  console.log('Synced templates/index.html to public/index.html and public/templates/index.html');
}

// Copy static/style.css -> public/static/style.css
if (fs.existsSync(path.join(staticDir, 'style.css'))) {
  fs.copyFileSync(
    path.join(staticDir, 'style.css'),
    path.join(publicDir, 'static', 'style.css')
  );
  console.log('Synced static/style.css to public/static/style.css');
}

console.log('Build completed successfully.');
