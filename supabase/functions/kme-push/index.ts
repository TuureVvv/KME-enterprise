import webpush from 'npm:web-push@3.6.7';
import {allowedEndpoint,payloadFor,retryDelay} from './push-utils.js';
const URL_BASE=Deno.env.get('SUPABASE_URL')!,SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,ANON=Deno.env.get('SUPABASE_ANON_KEY')!;
const SITE='https://tuurevvv.github.io/KME-enterprise/';
const cors={'Access-Control-Allow-Origin':'https://tuurevvv.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
async function rpc(name:string,args:Record<string,unknown>={},token=SERVICE,key=SERVICE){const r=await fetch(URL_BASE+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args)});if(!r.ok)throw new Error('Backend request denied ('+r.status+').');return r.json();}
function response(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:cors});}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return response({ok:false,message:'POST required.'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>4096)return response({ok:false,message:'Request too large.'},413);
  const bodyText=await req.text();if(bodyText.length>4096)return response({ok:false,message:'Request too large.'},413);const body=bodyText?JSON.parse(bodyText):{},dispatcher=req.headers.get('x-kme-dispatch');
  let userId:string|null=null,token='';
  if(!dispatcher){token=(req.headers.get('Authorization')||'').replace(/^Bearer /i,'');if(!token)return response({ok:false,message:'Device authentication required.'},401);const auth=await fetch(URL_BASE+'/auth/v1/user',{headers:{apikey:ANON,Authorization:'Bearer '+token}});if(!auth.ok)return response({ok:false,message:'Device session expired.'},401);const user=await auth.json();userId=user.id;if(!await rpc('kme_has_access',{},token,ANON))return response({ok:false,message:'Enter the group password first.'},403);}
  if(dispatcher&&!await rpc('kme_push_dispatch_admit',{p_ticket:dispatcher}))return response({ok:false,message:'Dispatcher denied.'},403);let secrets=await rpc('kme_push_secrets');
  if(!secrets.public_key){const keys=webpush.generateVAPIDKeys();secrets=await rpc('kme_push_init_keys',{p_public:keys.publicKey,p_private:keys.privateKey});}
  if(!dispatcher&&body.action==='config')return response({ok:true,public_key:secrets.public_key});
  if(!dispatcher&&body.action!=='test')return response({ok:false,message:'Unknown notification action.'},400);
  if(!dispatcher)await rpc('kme_push_test',{},token,ANON);
  const jobs=await rpc('kme_push_claim',{p_token:secrets.scheduler_token,p_user_id:userId});let sent=0,failed=0;
  for(let start=0;start<jobs.length;start+=4)await Promise.all(jobs.slice(start,start+4).map(async(job:any)=>{let status=0,retry=60;try{if(!allowedEndpoint(job.subscription.endpoint)){status=410;}else{const request=webpush.generateRequestDetails(job.subscription,JSON.stringify(payloadFor(job,SITE)),{TTL:300,contentEncoding:'aes128gcm',urgency:'normal',topic:'kme-'+job.kind,vapidDetails:{subject:SITE,publicKey:secrets.public_key,privateKey:secrets.private_key}});const r=await fetch(request.endpoint,{method:request.method,headers:request.headers,body:new Uint8Array(request.body),redirect:'error',signal:AbortSignal.timeout(8000)});status=r.status;retry=retryDelay(r.headers.get('retry-after'));await r.body?.cancel();}}catch{status=0;}if(status>=200&&status<300)sent++;else failed++;await rpc('kme_push_complete',{p_id:job.id,p_lease:job.lease_token,p_status:status,p_retry_seconds:retry});}));
  return response({ok:true,sent,failed,queued:jobs.length,...(!jobs.length?{message:'No active subscriptions are ready. Enable notifications on this device first.'}:{})});
 }catch{return response({ok:false,message:'Notification service could not complete this request. Try again shortly.'},400);}
});
