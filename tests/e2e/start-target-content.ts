import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync, symlinkSync, appendFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { startTargetContentFixture } from './target-content-fixtures';

const root=process.cwd();const output=resolve('.superpowers/task-3b');
const pharmacyApp=resolve(output,'target-pharmacy');const backofficeApp=resolve(output,'target-backoffice');
const children=new Set<ChildProcess>();let stopping=false;let fixture: Awaited<ReturnType<typeof startTargetContentFixture>>|undefined;
async function stop(){if(stopping)return;stopping=true;await Promise.all([...children].map(async child=>{if(child.exitCode!==null)return;await new Promise<void>(resolve=>{const timeout=setTimeout(()=>child.kill('SIGKILL'),5000);child.once('exit',()=>{clearTimeout(timeout);resolve();});child.kill('SIGTERM');});}));await fixture?.close();}
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>void stop().then(()=>process.exit(0)));
async function main(){
 mkdirSync(output,{recursive:true});if(existsSync(pharmacyApp)||existsSync(backofficeApp))throw new Error('Remove only prior disposable target copies before a rerun');
 cpSync(resolve('tsconfig.base.json'),resolve(output,'../tsconfig.base.json'));
 for(const name of ['egress','fixture-requests','transport'])writeFileSync(resolve(output,name+'.jsonl'),'');
 fixture=await startTargetContentFixture();
 const fixtureProbe=await fetch('http://127.0.0.1:4319/api/web-settings');if(!fixtureProbe.ok)throw new Error('Target fixture self-probe failed '+fixtureProbe.status+' '+await fixtureProbe.text());
 const assets=JSON.parse(readFileSync('tests/fixtures/assets/manifest.json','utf8'));
 for(const file of assets.assets)if(createHash('sha256').update(readFileSync(resolve('tests/fixtures/assets',file.path))).digest('hex')!==file.sha256)throw new Error('Asset changed '+file.path);
 const copy=(source:string,target:string)=>{cpSync(source,target,{recursive:true,filter:path=>!relative(source,path).split('/').some(part=>['node_modules','.next'].includes(part)||part.startsWith('.env')||part.endsWith('.tsbuildinfo'))});symlinkSync(resolve('node_modules'),resolve(target,'node_modules'),'dir');};
 const hashTree=(base:string,path=base,result:Record<string,string>={})=>{for(const name of readdirSync(path,{withFileTypes:true})){const file=resolve(path,name.name);if(name.isSymbolicLink())continue;if(name.isDirectory()){if(!['node_modules','.next'].includes(name.name))hashTree(base,file,result);}else if(!name.name.startsWith('.env')&&!name.name.endsWith('.tsbuildinfo'))result[relative(base,file)]=createHash('sha256').update(readFileSync(file)).digest('hex');}return result;};
 const pharmacySource=resolve('apps/pharmacy-web');const backofficeSource=resolve('apps/backoffice');
 const sourceHashes={pharmacy:hashTree(pharmacySource),backoffice:hashTree(backofficeSource)};
 copy(pharmacySource,pharmacyApp);copy(backofficeSource,backofficeApp);
 const copyHashes={pharmacy:hashTree(pharmacyApp),backoffice:hashTree(backofficeApp)};
 if(JSON.stringify(sourceHashes)!==JSON.stringify(copyHashes))throw new Error('Target copy differs from source before instrumentation');
 mkdirSync(resolve(output,'../tests/fixtures'),{recursive:true});cpSync(resolve('tests/fixtures/content-html.ts'),resolve(output,'../tests/fixtures/content-html.ts'));
 for(const file of [resolve(pharmacyApp,'lib/api/server.ts'),resolve(backofficeApp,'src/lib/api/server.ts')]){
  const source=readFileSync(file,'utf8');const needle="const target = getServerConfig().backendApiUrl + '/api' + apiPath(path);";
  if(!source.includes(needle))throw new Error('Target backend transport seam changed');
  const mapped=source.replace(needle,"const logicalTarget = getServerConfig().backendApiUrl + '/api' + apiPath(path);\n    const target = logicalTarget.startsWith('https://backend.example.test/api/') ? 'http://127.0.0.1:4319' + new URL(logicalTarget).pathname + new URL(logicalTarget).search : logicalTarget;");
  const request="return nativeRequest<T | Response>(target, { ...init, headers }, 'omit', response === 'response' ? async (raw) => raw : raw => decodeResponse<T>(raw, init.method));";
  if(!mapped.includes(request))throw new Error('Target backend request seam changed');
  writeFileSync(file,mapped.replace(request,"if (target.startsWith('http://127.0.0.1:4319/')) { const raw = await fetch(target, { ...init, headers, credentials:'omit', cache:'no-store', redirect:'manual' }); return response === 'response' ? raw : decodeResponse<T>(raw, init.method); }\n    "+request));
 }
 for(const app of [pharmacyApp,backofficeApp])appendFileSync(resolve(app,'next.config.ts'),`\nnextConfig.experimental = { ...nextConfig.experimental, cpus: 2 };\nnextConfig.outputFileTracingRoot = ${JSON.stringify(root)};\n`);
 const editorRoute=resolve(backofficeApp,'src/app/task3b-editor');mkdirSync(editorRoute,{recursive:true});
 writeFileSync(resolve(editorRoute,'page.tsx'),`'use client';
import { useState } from 'react';
import Editor from '@/app/components/editor/editor';
import { sanitizeRichText } from '@/features/content/sanitize';
const hostile='<p>safe</p><img src=x onerror=alert(1)><span class="ql-formula">formula</span>';
export default function EditorFixture(){
 const [value,setValue]=useState(hostile);const [raw,setRaw]=useState('');const [clean,setClean]=useState('');
 const exportHostile=async()=>{const {Quill}=await import('react-quill-new');const quill=Quill.find(document.querySelector('.ql-container')!,true) as any;const video='https://www.youtube.com/embed/x"><img src=x onerror=alert(1)>';quill.setContents([{insert:{video}},{insert:'\\n'}],'user');const html=quill.getSemanticHTML();setRaw(html);setClean(sanitizeRichText(html));};
 return <main id="task-editor"><Editor value={value} onChange={next=>{setValue(next);setClean(next)}}/><button type="button" onClick={exportHostile}>Export hostile video</button><output data-testid="raw">{raw}</output><output data-testid="clean" dangerouslySetInnerHTML={{__html:clean}}/></main>;
}`);
 // Named synthetic values only: never inherit real env/credentials.
 const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,TZ:'Asia/Bangkok',NEXT_TELEMETRY_DISABLED:'1',BACKEND_API_URL:'https://backend.example.test',PHARMACY_WEB_ORIGIN:'https://app.example.test',BACKOFFICE_ORIGIN:'https://backoffice.example.test',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4319',CONFERENCE_API_URL:'http://127.0.0.1:4319',NEXT_PUBLIC_CONTENT_IMAGE_SOURCES:JSON.stringify([{origin:'https://app.example.test',pathPrefix:'/media/'}]),NEXT_FONT_GOOGLE_MOCKED_RESPONSES:resolve('tests/e2e/font-responses.cjs'),NODE_OPTIONS:`--require=${resolve('tests/e2e/target-content-transport.cjs')}`,OFFLINE_FIXED_CLOCK:'2026-10-14T00:00:00Z',OFFLINE_EGRESS_LOG:resolve(output,'egress.jsonl'),TARGET_TRANSPORT_LOG:resolve(output,'transport.jsonl')};
 const childProbe=spawn(process.execPath,['-e',"fetch('http://127.0.0.1:4319/api/web-settings').then(r=>{if(!r.ok)process.exit(2)}).catch(e=>{console.error(e);process.exit(3)})"],{env,stdio:'inherit'});
 if(await new Promise(resolve=>childProbe.once('exit',resolve))!==0)throw new Error('Target child fixture probe failed');
 const run=(cwd:string,args:string[])=>{const child=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),...args],{cwd,env,stdio:'inherit'});children.add(child);child.once('exit',()=>children.delete(child));return child;};
 for(const [name,app] of [['Pharmacy',pharmacyApp],['Backoffice editor fixture',backofficeApp]] as const){const build=run(app,['build','--webpack']);const code=await new Promise(resolve=>build.once('exit',resolve));if(code!==0)throw new Error(name+' build failed '+code);}
 const fonts=readdirSync(resolve(pharmacyApp,'.next/static/media')).filter(p=>p.endsWith('.woff2')).map(p=>createHash('sha256').update(readFileSync(resolve(pharmacyApp,'.next/static/media',p))).digest('hex'));
 const css=['kanit.css','geist.css','geist_mono.css'].map(p=>readFileSync(resolve('tests/fixtures/assets',p),'utf8')).join('');const expected=new Set([...css.matchAll(/fonts\/([a-f0-9]{64})\.woff2/g)].map(m=>m[1]));
 if(new Set(fonts).size!==expected.size||fonts.some(hash=>!expected.has(hash)))throw new Error('Target generated font bytes differ');
 const browserFiles=(app:string)=>{const files:string[]=[];const walk=(path:string)=>{for(const name of readdirSync(path,{withFileTypes:true})){const file=resolve(path,name.name);if(name.isDirectory())walk(file);else files.push(file);}};walk(resolve(app,'.next/static'));return files;};
 const jsdomLeaks=[...browserFiles(pharmacyApp),...browserFiles(backofficeApp)].filter(file=>/jsdom/i.test(file)||readFileSync(file).includes(Buffer.from('jsdom')));
 if(jsdomLeaks.length)throw new Error('jsdom leaked into browser bundle: '+jsdomLeaks.join(','));
 const buildIds={pharmacy:readFileSync(resolve(pharmacyApp,'.next/BUILD_ID'),'utf8'),backoffice:readFileSync(resolve(backofficeApp,'.next/BUILD_ID'),'utf8')};
 writeFileSync(resolve(output,'target-identity.json'),JSON.stringify({sources:{pharmacySource,backofficeSource},sourceHashes,copyHashes,buildIds,fonts,jsdomBrowserBundleMatches:[],instrumentation:['nextConfig.experimental.cpus=2','outputFileTracingRoot=workspace','exact https://backend.example.test/api/* to owned loopback fixture mapping in copied server adapters','disposable Backoffice /task3b-editor browser fixture; no product route change']},null,2));
 const pharmacyServer=run(pharmacyApp,['start','--hostname','127.0.0.1','--port','4321']);const backofficeServer=run(backofficeApp,['start','--hostname','127.0.0.1','--port','4320']);
 await Promise.all([pharmacyServer,backofficeServer].map(server=>new Promise<void>((resolve,reject)=>{server.once('error',reject);server.once('exit',code=>stopping?resolve():reject(new Error('Target server exited '+code)));})));
}
main().catch(async error=>{console.error(error);await stop();process.exit(1);});
