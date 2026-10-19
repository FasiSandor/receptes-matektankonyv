import test, {after, before} from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";

const port=43187;
const base=`http://127.0.0.1:${port}/api/intelligens-hozzaadas`;
let server;
before(async()=>{
  server=spawn("npm",["run","start","--","-p",String(port)],{stdio:"ignore",env:{...process.env,NODE_ENV:"production"}});
  for(let i=0;i<80;i++){
    if(server.exitCode!==null)throw Error("Next.js server terminated before tests");
    try {const r=await fetch(base,{method:"GET"});if(r.status===405)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw Error("Next.js server did not start");
});
after(()=>{if(server){server.kill("SIGTERM");}});

test("rejects non-JSON content",async()=>{
 const r=await fetch(base,{method:"POST",headers:{"content-type":"text/plain"},body:"hello"});
 assert.equal(r.status,415);
});
test("rejects foreign browser origins",async()=>{
 const r=await fetch(base,{method:"POST",headers:{"content-type":"application/json","origin":"https://attacker.example"},body:JSON.stringify({url:"https://example.com"})});
 assert.equal(r.status,403);
});
test("rejects local and metadata URLs without fetching them",async()=>{
 for(const url of ["http://127.0.0.1/","http://169.254.169.254/latest/meta-data/","http://localhost/","file:///etc/passwd","http://10.0.0.1/"]){
  const r=await fetch(base,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url})});
  assert.equal(r.status,422,url);
 }
});
test("rejects oversized JSON requests",async()=>{
 const r=await fetch(base,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:"https://example.com/",padding:"x".repeat(5000)})});
 assert.equal(r.status,413);
});
