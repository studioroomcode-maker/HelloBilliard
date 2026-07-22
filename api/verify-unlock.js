// 앱이 ?unlock=<토큰> 을 받아 이 엔드포인트로 검증 요청 → 진짜 결제로 발급된
// 토큰이면 {ok:true, plan} 반환. 클라이언트는 그때만 Pro 를 켠다(위조 방지).
const { verify } = require('./_sign.js');

module.exports = async function handler(req, res){
  const SECRET = process.env.HB_SIGN_SECRET;
  if(!SECRET) return res.status(501).json({ ok: false, configured: false });
  if(req.method !== 'POST') return res.status(405).json({ ok: false });

  let body = req.body;
  if(typeof body === 'string'){ try{ body = JSON.parse(body||'{}'); }catch(e){ body = {}; } }
  const token = body && body.token;
  const st = verify(token, SECRET);
  if(!st || (st.plan !== 'day' && st.plan !== 'perm')) return res.status(200).json({ ok: false });
  return res.status(200).json({ ok: true, plan: st.plan });
};
