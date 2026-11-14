const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const FPS = 30;
const FFMPEG_BIN = '/home/pc-adrian/.local/bin/ffmpeg';
const CHROME_BIN = [
    process.env.CHROME_BIN,
    '/home/pc-adrian/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
    '/home/pc-adrian/.cache/puppeteer/chrome-headless-shell/linux-148.0.7778.97/chrome-headless-shell-linux64/chrome-headless-shell',
    '/usr/bin/google-chrome',
].find(p => p && fs.existsSync(p)) || 'google-chrome';
const TMP_DIR = '/tmp/explainer_render';
const DEFAULT_VIDEO_DIR = '/home/pc-adrian/Vídeos';

const posArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flagArgs = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => {
            const idx = a.indexOf('=');
            return idx === -1 ? [a.slice(2), 'true'] : [a.slice(2, idx), a.slice(idx + 1)];
        })
);

const PORT = Number(flagArgs.port || 0);

const ROOT_DIR = flagArgs.root || '/home/pc-adrian/Imágenes/BinaryLiquid_showcase/explainer';
const targetLang = (posArgs[0] || 'es').toLowerCase(); // 'es' or 'en'
const targetSceneArg = posArgs[1] || 'all'; // 'all' or '1'..'8'

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(DEFAULT_VIDEO_DIR, { recursive: true });

// Helper to get exact audio duration via ffmpeg (never relies on ffprobe)
function getAudioDuration(audioPath) {
    try {
        const res = require('child_process').spawnSync(FFMPEG_BIN, ['-i', audioPath], { encoding: 'utf-8' });
        const out = (res.stdout || '') + (res.stderr || '');
        const match = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
        if (match) {
            return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseFloat(match[3]);
        }
    } catch (e) {}
    return 30.0;
}

// Detect number of scenes present from audio directory or default
function detectSceneCount() {
    if (flagArgs.scenes) return parseInt(flagArgs.scenes, 10);
    let count = 0;
    for (let i = 1; i <= 20; i++) {
        const fn = targetLang === 'es' ? `scene${i}_es.mp3` : `scene${i}.mp3`;
        if (fs.existsSync(path.join(ROOT_DIR, 'audio', fn))) {
            count = i;
        } else {
            break;
        }
    }
    return count || 8;
}

const totalScenes = detectSceneCount();
const scenesToProcess = targetSceneArg === 'all'
    ? Array.from({ length: totalScenes }, (_, i) => i + 1)
    : targetSceneArg.split(',').map(n => parseInt(n.trim(), 10));

const finalOutPath = flagArgs.out || path.join(DEFAULT_VIDEO_DIR, `BinaryLiquid_Explainer_${targetLang.toUpperCase()}.mp4`);

console.log(`=======================================================`);
console.log(`🎬 DETERMINISTIC 1080p MP4 VIDEO RENDERER (${FPS} FPS)`);
console.log(`Root: ${ROOT_DIR}`);
console.log(`Language: ${targetLang.toUpperCase()} | Scenes: ${scenesToProcess.join(', ')}`);
console.log(`Output: ${finalOutPath}`);
console.log(`=======================================================`);

let currentSceneIdx = 0;

function processNextScene() {
    if (currentSceneIdx >= scenesToProcess.length) {
        console.log(`\n🎉 All target scenes rendered! Compiling final MP4...`);
        assembleFinalVideo();
        return;
    }

    const sceneNum = scenesToProcess[currentSceneIdx];
    const audioFilename = targetLang === 'es' ? `scene${sceneNum}_es.mp3` : `scene${sceneNum}.mp3`;
    const audioPath = path.join(ROOT_DIR, 'audio', audioFilename);
    const outMp4 = path.join(TMP_DIR, `scene_${targetLang}_${sceneNum}.mp4`);
    if (flagArgs['skip-existing'] === 'true' && fs.existsSync(outMp4) && fs.statSync(outMp4).size > 50000) {
        console.log(`\n⏭ [${currentSceneIdx + 1}/${scenesToProcess.length}] Skipping existing Scene ${sceneNum}: ${outMp4}`);
        currentSceneIdx++;
        processNextScene();
        return;
    }
    const sceneDuration = getAudioDuration(audioPath);

    console.log(`\n▶ [${currentSceneIdx + 1}/${scenesToProcess.length}] Rendering Scene ${sceneNum} (${sceneDuration.toFixed(2)}s @ ${FPS}fps)...`);

    renderSceneDeterministic(sceneNum, sceneDuration, targetLang, audioPath, () => {
        currentSceneIdx++;
        processNextScene();
    });
}

function renderSceneDeterministic(sceneNum, duration, lang, voiceAudio, onComplete) {
    const bgmAudio = path.join(ROOT_DIR, 'ambient_bgm.mp3');
    const outMp4 = path.join(TMP_DIR, `scene_${lang}_${sceneNum}.mp4`);
    const totalFrames = Math.max(1, Math.ceil((duration + 0.08) * FPS));

    const ffArgs = [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', 'png',
        '-framerate', String(FPS),
        '-i', '-',
        '-i', voiceAudio
    ];

    if (fs.existsSync(bgmAudio)) {
        ffArgs.push(
            '-stream_loop', '-1',
            '-i', bgmAudio,
            '-filter_complex', '[1:a]volume=1.0[v_a];[2:a]volume=0.08[bg_a];[v_a][bg_a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a_out]',
            '-map', '0:v',
            '-map', '[a_out]'
        );
    } else {
        ffArgs.push('-map', '0:v', '-map', '1:a');
    }

    ffArgs.push(
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        '-r', String(FPS),
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-movflags', '+faststart',
        outMp4
    );

    const ffProc = spawn(FFMPEG_BIN, ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
    let ffStderr = '';
    ffProc.stderr.on('data', d => { ffStderr += d.toString(); });

    const ffDone = new Promise((resolve, reject) => {
        ffProc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exited ${code}: ${ffStderr.slice(-600)}`));
        });
    });

    let chromeProc = null;
    const server = http.createServer((req, res) => {
        const urlObj = new URL(req.url, `http://localhost:${PORT}`);
        const pathname = urlObj.pathname;

        if (req.method === 'GET' && pathname === '/record') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { margin: 0; padding: 0; background: #080B11; overflow: hidden; }
        canvas { display: block; width: 1920px; height: 1080px; }
    </style>
</head>
<body>
    <div id="scene-indicator" style="display:none;"></div>
    <div id="video-title" style="display:none;"></div>
    <div id="time-display" style="display:none;"></div>
    <div id="progress-bar" style="display:none;"></div>
    <div id="scene-pills" style="display:none;"></div>
    <div id="btn-play" style="display:none;"></div>
    <div id="btn-prev" style="display:none;"></div>
    <div id="btn-next" style="display:none;"></div>
    <div id="btn-lang-es" style="display:none;"></div>
    <div id="btn-lang-en" style="display:none;"></div>
    <div id="btn-fullscreen" style="display:none;"></div>
    <div id="progress-bar-container" style="display:none;"></div>
    <div id="stage-container" style="display:block;">
        <canvas id="stage" width="1920" height="1080"></canvas>
    </div>

    <script src="./studio.js"></script>
    <script>
        function canvasToPngBlob(canvas) {
            return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        }

        async function runDeterministicCapture() {
            const sceneIdx = ${sceneNum - 1};
            const fps = ${FPS};
            const totalFrames = ${totalFrames};
            const lang = '${lang}';

            if (typeof window.prepareRecording === 'function') {
                window.prepareRecording(sceneIdx, lang);
            }

            // Wait until all preload images settle
            if (typeof TOKEN_IMAGES !== 'undefined') {
                const imgs = Object.values(TOKEN_IMAGES);
                await Promise.all(imgs.map(img => new Promise(res => {
                    if (img.complete) return res();
                    img.addEventListener('load', res, { once: true });
                    img.addEventListener('error', res, { once: true });
                    setTimeout(res, 2000);
                })));
            } else {
                await new Promise(r => setTimeout(r, 400));
            }

            const canvas = document.getElementById('stage');
            for (let i = 0; i < totalFrames; i++) {
                const tTime = i / fps;
                window.renderAtTime(tTime);
                const blob = await canvasToPngBlob(canvas);
                await fetch('/frame', {
                    method: 'POST',
                    headers: { 'Content-Type': 'image/png' },
                    body: blob
                });
            }
            await fetch('/finish', { method: 'POST' });
        }
        window.addEventListener('load', runDeterministicCapture);
    </script>
</body>
</html>`);
        }

        if (req.method === 'GET') {
            const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
            const filePath = path.join(ROOT_DIR, rel);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const ext = path.extname(filePath);
                const types = {
                    '.html': 'text/html',
                    '.js': 'application/javascript',
                    '.css': 'text/css',
                    '.png': 'image/png',
                    '.mp3': 'audio/mpeg'
                };
                res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
                fs.createReadStream(filePath).pipe(res);
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
            return;
        }

        if (req.method === 'POST' && pathname === '/frame') {
            const chunks = [];
            req.on('data', c => chunks.push(c));
            req.on('end', () => {
                const buf = Buffer.concat(chunks);
                const canWrite = ffProc.stdin.write(buf);
                if (canWrite) {
                    res.writeHead(200);
                    res.end('OK');
                } else {
                    ffProc.stdin.once('drain', () => {
                        res.writeHead(200);
                        res.end('OK');
                    });
                }
            });
            return;
        }

        if (req.method === 'POST' && pathname === '/finish') {
            res.writeHead(200);
            res.end('DONE');
            ffProc.stdin.end();
            ffDone.then(() => {
                const sz = fs.statSync(outMp4).size;
                console.log(`   ✓ Scene ${sceneNum} encoded deterministically: ${outMp4} (${(sz / 1024 / 1024).toFixed(2)} MB)`);
                if (chromeProc) chromeProc.kill();
                server.close(() => onComplete());
            }).catch(err => {
                console.error(`   ❌ Scene ${sceneNum} encode error:`, err.message);
                if (chromeProc) chromeProc.kill();
                server.close(() => process.exit(1));
            });
            return;
        }
    });

    server.listen(PORT, '127.0.0.1', () => {
        const actualPort = server.address().port;
        const chromeDataDir = path.join(TMP_DIR, `chrome_profile_${sceneNum}_${Date.now()}`);
        fs.mkdirSync(chromeDataDir, { recursive: true });
        chromeProc = spawn(CHROME_BIN, [
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            `--user-data-dir=${chromeDataDir}`,
            '--window-size=1920,1080',
            `http://127.0.0.1:${actualPort}/record`
        ], { stdio: 'ignore' });
        chromeProc.on('error', (err) => {
            console.error(`   ❌ Chrome launch error on Scene ${sceneNum}:`, err.message);
            process.exit(1);
        });
    });
}

function assembleFinalVideo() {
    if (scenesToProcess.length === 1) {
        const single = path.join(TMP_DIR, `scene_${targetLang}_${scenesToProcess[0]}.mp4`);
        fs.mkdirSync(path.dirname(finalOutPath), { recursive: true });
        fs.copyFileSync(single, finalOutPath);
        console.log(`\n🎉 SINGLE SCENE COMPLETE: ${finalOutPath}`);
        process.exit(0);
    }

    const listTxt = path.join(TMP_DIR, `concat_${targetLang}_${process.pid}.txt`);
    const fileContent = scenesToProcess.map(s => `file '${path.join(TMP_DIR, `scene_${targetLang}_${s}.mp4`)}'`).join('\n');
    fs.writeFileSync(listTxt, fileContent);
    fs.mkdirSync(path.dirname(finalOutPath), { recursive: true });

    console.log(`\n🎞 Stitching ${scenesToProcess.length} scenes cleanly: ${finalOutPath}...`);
    const concatCmd = `${FFMPEG_BIN} -y -f concat -safe 0 -i "${listTxt}" -c copy -movflags +faststart "${finalOutPath}"`;
    try {
        execSync(concatCmd, { stdio: 'pipe' });
        const sz = fs.statSync(finalOutPath).size;
        console.log(`\n=======================================================`);
        console.log(`🎉 VIDEO COMPILATION COMPLETE!`);
        console.log(`File: ${finalOutPath}`);
        console.log(`Size: ${(sz / 1024 / 1024).toFixed(2)} MB`);
        console.log(`=======================================================`);
    } catch (e) {
        console.error(`❌ Concat error:`, e.message);
        process.exit(1);
    }
    process.exit(0);
}

processNextScene();
