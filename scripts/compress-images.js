/**
 * Compress images in src/assets for faster loading.
 * Run: node scripts/compress-images.js
 * JPEG: 82% quality, max 1200px. PNG: lossy, max 1200px.
 */
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "../src/assets");
const MAX_DIM = 1200;
const JPEG_QUALITY = 82;

async function compressFile(filePath) {
    try {
        const sharp = require("sharp");
        const ext = path.extname(filePath).toLowerCase();
        const stat = fs.statSync(filePath);
        const before = stat.size;

        let pipeline = sharp(filePath);
        const meta = await pipeline.metadata();
        const needsResize =
            (meta.width > MAX_DIM || meta.height > MAX_DIM) &&
            meta.width &&
            meta.height;

        if (needsResize) {
            pipeline = pipeline.resize(MAX_DIM, MAX_DIM, {
                fit: "inside",
                withoutEnlargement: true,
            });
        }

        if (ext === ".jpg" || ext === ".jpeg") {
            await pipeline
                .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
                .toFile(filePath + ".tmp");
        } else if (ext === ".png") {
            await pipeline
                .png({ compressionLevel: 9 })
                .toFile(filePath + ".tmp");
        } else {
            return;
        }

        const after = fs.statSync(filePath + ".tmp").size;
        if (after < before) {
            fs.renameSync(filePath + ".tmp", filePath);
            const pct = ((1 - after / before) * 100).toFixed(1);
            console.log(`  ${path.basename(filePath)}: ${(before / 1024).toFixed(0)}k → ${(after / 1024).toFixed(0)}k (-${pct}%)`);
        } else {
            fs.unlinkSync(filePath + ".tmp");
        }
    } catch (err) {
        console.error(`  Error ${filePath}:`, err.message);
    }
}

function walk(dir) {
    const files = [];
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) {
            files.push(...walk(full));
        } else if (/\.(jpg|jpeg|png)$/i.test(name)) {
            files.push(full);
        }
    }
    return files;
}

async function main() {
    if (!fs.existsSync(ASSETS)) {
        console.log("No assets folder found.");
        return;
    }
    const files = walk(ASSETS);
    if (files.length === 0) {
        console.log("No images to compress.");
        return;
    }
    console.log(`Compressing ${files.length} images...`);
    for (const f of files) {
        await compressFile(f);
    }
    console.log("Done.");
}

main().catch(console.error);
