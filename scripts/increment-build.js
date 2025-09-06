const fs = require('fs');
const path = require('path');

// Đường dẫn đến file version service
const versionServicePath = path.join(__dirname, '../src/app/services/version.service.ts');

// Đọc file version service
let content = fs.readFileSync(versionServicePath, 'utf8');

// Tìm và tăng build number
const buildRegex = /getCurrentBuild\(\): number \{[\s\S]*?return build \? parseInt\(build, 10\) : (\d+);/;
const match = content.match(buildRegex);

if (match) {
  const currentBuild = parseInt(match[1], 10);
  const newBuild = currentBuild + 1;
  
  // Thay thế build number
  content = content.replace(buildRegex, `getCurrentBuild(): number {
    const build = localStorage.getItem(this.BUILD_KEY);
    return build ? parseInt(build, 10) : ${newBuild};`);
  
  // Ghi lại file
  fs.writeFileSync(versionServicePath, content, 'utf8');
  
  console.log(`✅ Build number incremented to: ${newBuild}`);
} else {
  console.log('❌ Could not find build number to increment');
}
