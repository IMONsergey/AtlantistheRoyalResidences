import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['node_modules/astro/bin/astro.mjs','dev','--host','127.0.0.1','--port','4322'],{stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',c=>logs+=c);server.stderr.on('data',c=>logs+=c);
try {let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4322')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}if(!ready)throw new Error(logs);process.env.TEST_BASE_URL='http://127.0.0.1:4322';await import('../tests/e2e.mjs');}finally{server.kill('SIGTERM');}
