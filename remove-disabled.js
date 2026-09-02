const fs = require('fs');
const glob = require('glob'); // Not available by default in base node, let's use standard fs
const path = require('path');

const dir = 'src/app/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('[disabled]="form.invalid"')) {
    content = content.replace(/\[disabled\]="form\.invalid" /g, '');
    fs.writeFileSync(filePath, content);
    console.log('Modified', file);
  }
});
