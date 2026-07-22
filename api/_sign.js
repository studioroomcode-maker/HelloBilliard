// HMAC 서명 유틸 — 결제 상태/언락 토큰 위조 방지 (HB_SIGN_SECRET 사용)
const crypto = require('crypto');

function b64url(buf){ return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function fromB64url(s){ s=String(s).replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; return Buffer.from(s,'base64'); }

// payload(객체) → "base64url(json).base64url(hmac)"
function sign(payload, secret){
  const body = b64url(JSON.stringify(payload));
  const mac  = crypto.createHmac('sha256', secret).update(body).digest();
  return body + '.' + b64url(mac);
}

// 토큰 검증 → payload 객체(만료 exp 확인) 또는 null
function verify(token, secret){
  if(!token || typeof token!=='string' || token.indexOf('.')<0) return null;
  const parts = token.split('.'), body = parts[0], macStr = parts[1];
  const expect = crypto.createHmac('sha256', secret).update(body).digest();
  const got = fromB64url(macStr||'');
  if(expect.length!==got.length || !crypto.timingSafeEqual(expect, got)) return null;
  let obj; try{ obj = JSON.parse(fromB64url(body).toString('utf8')); }catch(e){ return null; }
  if(obj && obj.exp && Date.now() > obj.exp) return null;   // 만료
  return obj;
}

module.exports = { sign, verify };
