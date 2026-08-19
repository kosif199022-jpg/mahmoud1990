import { createRealtimeCall, hangupRealtimeCall, realtimeConfigured, realtimeSessionKeySupported, DEFAULT_REALTIME_MODEL } from './v38-realtime.js';

function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-kosif-realtime':'session-key-v1'}})}
function err(code,message,status=400){return json({error:code,message:message||code},status)}
async function body(req){try{return await req.clone().json()}catch{return null}}

export async function handleRealtimeSession(req,env,u,owner){
  const p=u.pathname;
  if(!p.startsWith('/api/kosif/v38/realtime/'))return null;
  if(!owner)return err('OWNER_AUTH_REQUIRED','قدرات الصوت المباشر تتطلب جلسة المالك.',401);

  if(p==='/api/kosif/v38/realtime/status'&&req.method==='GET'){
    return json({
      ok:true,
      configured:realtimeConfigured(env),
      serverConfigured:realtimeConfigured(env),
      sessionKeySupported:realtimeSessionKeySupported(),
      model:DEFAULT_REALTIME_MODEL,
      transport:'webrtc-server-relay',
      keyExposure:'never-returned-never-persisted',
      advisory:'الصوت المباشر استشاري ولا يعتمد قيودًا ولا آراءً.'
    });
  }

  if(p==='/api/kosif/v38/realtime/call'&&req.method==='POST'){
    const b=await body(req);
    const r=await createRealtimeCall(env,{
      key:b?.key,
      sdp:b?.sdp,
      model:b?.model,
      voice:b?.voice,
      language:b?.language,
      company:b?.company,
      context:b?.context
    });
    if(!r.ok){
      const status=r.error==='REALTIME_NOT_CONFIGURED'?503:(r.error==='REALTIME_UPSTREAM_REJECTED'||r.error==='REALTIME_UPSTREAM_TIMEOUT'||r.error==='REALTIME_UPSTREAM_UNAVAILABLE'?502:400);
      return err(r.error,r.message,status);
    }
    return json({
      ok:true,
      answerSdp:r.answerSdp,
      callId:r.callId,
      model:r.model,
      voice:r.voice,
      transport:r.transport,
      keyExposure:r.keyExposure,
      credentialSource:r.credentialSource,
      advisory:'الصوت المباشر استشاري فقط؛ أي استنتاج يحتاج دليلًا ومراجعة بشرية قبل الاستخدام.'
    },201);
  }

  if(p==='/api/kosif/v38/realtime/hangup'&&req.method==='POST'){
    const b=await body(req);
    const r=await hangupRealtimeCall(env,b?.callId,{key:b?.key});
    return r.ok?json({ok:true,alreadyEnded:!!r.alreadyEnded}):err(r.error,r.message,r.error==='REALTIME_NOT_CONFIGURED'?503:502);
  }

  if(p==='/api/kosif/v38/realtime/session')return err('REALTIME_LEGACY_ROUTE_RETIRED','تم إيقاف مسار السر المؤقت القديم. استخدم /realtime/call عبر جلسة المالك.',410);
  return null;
}
