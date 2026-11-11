const fs = require('fs');
const path = require('path');
const root = process.cwd();
const dist = path.join(root, 'dist');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Expo web export missing dist/index.html');
const isDoctor = app.name.toLowerCase().includes('doctor');
const name = isDoctor ? 'Oralyn Doctor' : 'Oralyn Patient';
const shortName = isDoctor ? 'Oralyn Doctor' : 'Oralyn';
const theme = isDoctor ? '#082B49' : '#F4FBFF';
const iconSource = path.join(root, 'assets', 'oralyn-icon.png');
fs.copyFileSync(iconSource, path.join(dist, 'oralyn-icon.png'));
const manifest = {
  id: '/', name, short_name: shortName, start_url: '/', scope: '/', display: 'standalone',
  display_override: ['standalone', 'minimal-ui'], orientation: 'portrait', background_color: theme,
  theme_color: theme, icons: [{ src: '/oralyn-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
};
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
const sw = `const CACHE='${isDoctor ? 'oralyn-doctor' : 'oralyn-patient'}-shell-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/','/index.html','/manifest.webmanifest','/oralyn-icon.png'])).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => { const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/v1/')) return; if(e.request.mode==='navigate'){ e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('/index.html',copy));return r;}).catch(()=>caches.match('/index.html'))); } });`;
fs.writeFileSync(path.join(dist, 'service-worker.js'), sw);
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const head = `<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="${theme}"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="${shortName}"><link rel="apple-touch-icon" href="/oralyn-icon.png">`;
html = html.replace('</head>', `${head}</head>`);
html = html.replace('</body>', `<script>if('serviceWorker' in navigator && location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(console.error));}</script></body>`);
fs.writeFileSync(path.join(dist, 'index.html'), html);
console.log(`${name} PWA shell generated in dist`);