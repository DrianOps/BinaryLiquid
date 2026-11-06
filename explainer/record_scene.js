const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 9876;
const ROOT_DIR = '/home/pc-adrian/Imágenes/BinaryLiquid_showcase/explainer';
const OUTPUT_DIR = '/tmp/explainer_parts';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Target scene to record: passed as arg, or all
const targetScene = parseInt(process.argv[2] || '1', 10);

const SCENE_DURATIONS = {
    1: 46.63,
    2: 49.15,
    3: 36.91,
    4: 35.85,
    5: 25.51,
    6: 25.75,
    7: 24.05,
    8: 31.87
};

const duration = SCENE_DURATIONS[targetScene] || 10;
console.log(`Starting recorder for Scene ${targetScene} (Duration: ${duration}s)...`);

const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    
    if (req.method === 'GET') {
        let filePath = path.join(ROOT_DIR, url === '/' ? 'index.html' : url);
        if (url === '/recorder') {
            // Serve specialized recorder HTML
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(`
                <!DOCTYPE html>
                <html>
                <body style="margin:0; background:#080b11; overflow:hidden;">
                <canvas id="stage" width="1920" height="1080"></canvas>
                <div id="scene-indicator" style="display:none;"></div>
                <script src="studio.js"></script>
                <script>
                    const sceneIdx = ${targetScene - 1};
                    const durationSec = ${duration};
                    
                    window.prepareRecording(sceneIdx);
                    
                    const canvas = document.getElementById('stage');
                    const stream = canvas.captureStream(30);
                    const recorder = new MediaRecorder(stream, {
                        mimeType: 'video/webm; codecs=vp9',
                        videoBitsPerSecond: 6000000 // 6 Mbps high fidelity 1080p
                    });
                    
                    const chunks = [];
                    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                    recorder.onstop = async () => {
                        const blob = new Blob(chunks, { type: 'video/webm' });
                        console.log('RECORD_COMPLETE, size:', blob.size);
                        await fetch('/upload-scene?scene=${targetScene}', {
                            method: 'POST',
                            headers: { 'Content-Type': 'video/webm' },
                            body: blob
                        });
                    };
                    
                    recorder.start(1000); // 1s slice
                    console.log('RECORDING_STARTED for scene', sceneIdx + 1);
                    
                    let startTime = performance.now();
                    function anim(now) {
                        const elapsed = (now - startTime) / 1000;
                        window.renderAtTime(elapsed);
                        if (elapsed >= durationSec) {
                            recorder.stop();
                        } else {
                            requestAnimationFrame(anim);
                        }
                    }
                    requestAnimationFrame(anim);
                </script>
                </body>
                </html>
            `);
        }
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.mp3': 'audio/mpeg',
                '.png': 'image/png'
            };
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    } else if (req.method === 'POST' && req.url.startsWith('/upload-scene')) {
        const outPath = path.join(OUTPUT_DIR, `part${targetScene}.webm`);
        const fileStream = fs.createWriteStream(outPath);
        req.pipe(fileStream);
        req.on('end', () => {
            const size = fs.statSync(outPath).size;
            console.log(`[DONE] Scene ${targetScene} saved to ${outPath} (${size} bytes)`);
            res.writeHead(200);
            res.end('OK');
            server.close();
            if (chromeProc) chromeProc.kill();
            process.exit(0);
        });
    }
});

let chromeProc = null;
server.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}. Launching headless Chrome...`);
    chromeProc = spawn('google-chrome', [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1920,1080',
        `http://localhost:${PORT}/recorder`
    ]);
    chromeProc.stderr.on('data', d => {
        const msg = d.toString();
        if (msg.includes('RECORDING_STARTED') || msg.includes('RECORD_COMPLETE')) {
            console.log('[CHROME]', msg.trim());
        }
    });
});
