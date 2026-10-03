// Requires explicit disposable fixture acknowledgement; never use with real pharmacy data.
const {sourceRoot,browserTools,benchDatabaseUrl,fixtureSecret}=require('./config.cjs');
const {chromium}=require(require('node:path').join(browserTools,'node_modules/playwright'));
const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const login=await fetch('http://127.0.0.1:3000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'MvpTestPassword42'})}).then(r=>r.json());
await page.addInitScript(({token,user})=>{localStorage.setItem('token',token);localStorage.setItem('role',user.role);localStorage.setItem('user',JSON.stringify({...user,name:user.username}));},{token:login.token,user:login.user});
const times={};let start=performance.now();await page.goto('http://127.0.0.1:5173/pos');await page.getByText('Medicine 1000',{exact:true}).waitFor();times.posReady=performance.now()-start;
start=performance.now();await page.getByPlaceholder('Search products...').fill('Medicine 1000');await page.waitForFunction(()=>document.body.innerText.includes('Medicine 1000')&&!document.body.innerText.includes('Medicine 0001'));times.search=performance.now()-start;
start=performance.now();await page.getByText('Medicine 1000',{exact:true}).click();await page.getByText('1 items',{exact:true}).waitFor();times.addToCart=performance.now()-start;
start=performance.now();await page.getByRole('button',{name:'Complete Sale',exact:true}).click();await page.getByText('Sales Receipt',{exact:true}).waitFor();times.checkout=performance.now()-start;
await page.getByRole('button',{name:'Close',exact:true}).click();start=performance.now();await page.goto('http://127.0.0.1:5173/inventory');await page.getByText('Medicine 1000',{exact:true}).waitFor();times.inventoryReady=performance.now()-start;
await page.setViewportSize({width:1024,height:768});await page.screenshot({path:'/tmp/metmma-baseline-tablet.png',fullPage:true});
const api={};for(const path of ['/products?search=Medicine%201000','/products','/sales/history']) {const measurements=[];let bytes;for(let i=0;i<5;i++){const t=performance.now();const r=await fetch('http://127.0.0.1:3000/api'+path,{headers:{Authorization:'Bearer '+login.token}});const body=await r.text();bytes=Buffer.byteLength(body);measurements.push(performance.now()-t);}api[path]={meanMs:measurements.reduce((a,b)=>a+b)/5,bytes};}
const result={fixture:{products:1000,sales:100},viewport:'1440x900 / 1024x768',times,api,errors};fs.writeFileSync('/tmp/metmma-baseline-performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
