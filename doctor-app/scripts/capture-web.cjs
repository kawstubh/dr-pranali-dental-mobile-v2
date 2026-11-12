const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const chromePath = process.env.CHROME_BIN || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
const port = Number(process.env.CDP_PORT || 9223), baseUrl = process.env.DOCTOR_WEB_BASE_URL || 'http://127.0.0.1:19007';
const outDir = path.join(process.cwd(), 'build-evidence', 'doctor-web');
fs.mkdirSync(outDir, { recursive: true });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const chrome = spawn(chromePath, ['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--remote-debugging-port='+port,'--remote-allow-origins=*','--disable-dev-shm-usage','--user-data-dir='+path.join(process.cwd(),'.chrome-doctor-profile-'+process.pid),'--window-size=1440,1000',baseUrl], {stdio:'ignore',windowsHide:true});
let ws, nextId=0;
const pending=new Map(), sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,ms=20000){const end=Date.now()+ms;while(Date.now()<end){const v=await fn();if(v)return v;await sleep(250);}throw new Error('Timed out waiting for Doctor desktop UI');}
function send(method,params={}){const id=++nextId;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('CDP timeout: '+method));}},20000);});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text||'Browser evaluation failed');return r.result&&r.result.value;}
async function capture(name,width=1440,height=1000){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(500);const s=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});fs.writeFileSync(path.join(outDir,name),Buffer.from(s.data,'base64'));}
async function clickText(label){const e=`(()=>{const ns=[...document.querySelectorAll('button,[role="button"],a')];const n=ns.find(x=>(x.innerText||x.textContent||'').includes(${JSON.stringify(label)}));if(!n)return {found:false,candidates:ns.map(x=>(x.innerText||x.textContent||'').trim()).filter(Boolean).slice(0,40)};n.click();return {found:true};})()`;const r=await evaluate(e);if(!r||!r.found)throw new Error('Could not find Doctor control '+label+': '+JSON.stringify(r));}
async function fillInput(placeholder,value){const e=`(()=>{const i=[...document.querySelectorAll('input')].find(x=>x.placeholder===${JSON.stringify(placeholder)});if(!i)return false;const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`;if(!await evaluate(e))throw new Error('Doctor login input not found: '+placeholder);}
(async()=>{let authenticated=false;try{
 await waitFor(async()=>{const r=await fetch('http://127.0.0.1:'+port+'/json/list').catch(()=>null);if(!r||!r.ok)return false;return (await r.json()).find(x=>x.type==='page'&&x.webSocketDebuggerUrl&&x.url.startsWith(baseUrl));});
 const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),target=targets.find(x=>x.type==='page'&&x.webSocketDebuggerUrl&&x.url.startsWith(baseUrl));if(!target)throw new Error('Chrome page target not found');
 ws=new WebSocket(target.webSocketDebuggerUrl);ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result||{});}});
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:baseUrl});
 const login='Sign in with your clinic-issued email and password.';await waitFor(()=>evaluate('document.body.innerText.includes('+JSON.stringify(login)+')'));
 await capture('doctor-login-1440x1000.png');await capture('doctor-login-1280x800.png',1280,800);
 const email=process.env.DENTAL_STAGING_DOCTOR_EMAIL||'',password=process.env.DENTAL_STAGING_DOCTOR_PASSWORD||'';
 if(email&&password){
  await fillInput('doctor@clinic.com',email);await fillInput('Enter your password',password);await clickText('Sign in securely');
  await waitFor(()=>evaluate('document.body.innerText.includes("Good day, Doctor")'),30000);authenticated=true;
  await capture('doctor-dashboard-1440x1000.png');await capture('doctor-dashboard-1280x800.png',1280,800);
  await clickText('Patients');await waitFor(()=>evaluate('document.body.innerText.includes("Patients")'));await capture('doctor-patient-list-1440x1000.png');
  await clickText('Appointments');await waitFor(()=>evaluate('document.body.innerText.includes("Appointments")'));await capture('doctor-appointments-1440x1000.png');
  await clickText('Clinical AI');await waitFor(()=>evaluate('document.body.innerText.toLowerCase().includes("clinical")'));await capture('doctor-clinical-ai-1440x1000.png');
  await send('Page.reload');await waitFor(()=>evaluate('document.body.innerText.includes("Good day, Doctor")'),30000);await capture('doctor-session-restored-1440x1000.png');
 }
 fs.writeFileSync(path.join(outDir,'build-info.txt'),'commit='+commit+'\nenvironment=staging\napi='+(process.env.EXPO_PUBLIC_DENTAL_API_URL || 'https://oralyn-multitenant-staging.onrender.com')+'\npackage=com.drpranali.dental.doctor\nauthenticatedDashboard='+authenticated+'\n');
 if(!authenticated)console.warn('Authenticated dashboard, clinical screens and session persistence skipped: staging doctor test secrets are not configured.');
 console.log(JSON.stringify({commit,authenticated,screenshots:fs.readdirSync(outDir)}));
}finally{if(ws)ws.close();if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(chrome.pid),'/T','/F'],{stdio:'ignore'});}catch{chrome.kill();}}else chrome.kill('SIGTERM');}})().catch(e=>{console.error(e.stack||e);process.exit(1);});
