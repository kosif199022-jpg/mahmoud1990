from pathlib import Path
p=Path('src/standards-mafateeh.js')
s=p.read_text(encoding='utf-8')
old="export async function handleStandardsMafateeh(req,env){STD_SERVICE=env?.STANDARDS||STD_SERVICE;MAF_SERVICE=env?.MAFATEEH||MAF_SERVICE;const u=new URL(req.url),p=u.pathname;if(!p.startsWith('/library'))return null;try{if(p==='/library/unlock'&&req.method==='POST')return unlockBooks(req,env);if(p==='/library/logout')return new Response(null,{status:303,headers:{location:'/library','set-cookie':'kosif_books=; Path=/library; Max-Age=0; HttpOnly; Secure; SameSite=Lax'}});if(!(await hasBookAccess(req,env)))return new Response(gateHtml(p+u.search,false),{status:401,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});if(p==='/library/smart'||p==='/library/smart/'||p.startsWith('/library/files/'))return null;"
new="export async function handleStandardsMafateeh(req,env){STD_SERVICE=env?.STANDARDS||STD_SERVICE;MAF_SERVICE=env?.MAFATEEH||MAF_SERVICE;const u=new URL(req.url),p=u.pathname;if(!p.startsWith('/library'))return null;try{if(p==='/library/smart'||p==='/library/smart/'||p.startsWith('/library/files/'))return null;if(p==='/library/unlock'&&req.method==='POST')return unlockBooks(req,env);if(p==='/library/logout')return new Response(null,{status:303,headers:{location:'/library','set-cookie':'kosif_books=; Path=/library; Max-Age=0; HttpOnly; Secure; SameSite=Lax'}});if(!(await hasBookAccess(req,env)))return new Response(gateHtml(p+u.search,false),{status:401,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});"
if old not in s:
    if new in s:
        print('already patched')
    else:
        raise SystemExit('smart library routing anchor not found')
else:
    s=s.replace(old,new,1)
    p.write_text(s,encoding='utf-8')
