const fs = require('fs');
const path = require('path');
const ysFixWebmDuration = require(path.join(__dirname, '../frontend/node_modules/fix-webm-duration'));

const videoDir = path.join(__dirname, '../backend/media/proctoring_videos');

if (!fs.existsSync(videoDir)) {
  console.log("Video directory does not exist.");
  process.exit(0);
}

const files = fs.readdirSync(videoDir);
console.log(`Found ${files.length} video files in ${videoDir}`);

files.forEach(file => {
  if (file.endsWith('.webm')) {
    const filePath = path.join(videoDir, file);
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer], { type: 'video/webm' });

    // Patch WebM header with 60000ms duration (10 mins fallback if unindexed)
    ysFixWebmDuration(blob, 60000, (fixedBlob) => {
      fixedBlob.arrayBuffer().then(ab => {
        fs.writeFileSync(filePath, Buffer.from(ab));
        console.log(`[Fixed] Patched WebM duration header for ${file}`);
      }).catch(err => console.error(err));
    });
  }
});
