// 카카오페이 결제 준비 — Admin 키로 kapi 호출 → 결제창 URL 반환.
// 결제창→승인(approve) 사이에 tid 를 서명 쿠키(hbpay)로 넘겨 correlate.
// 키(KAKAO_ADMIN_KEY / HB_SIGN_SECRET)가 없으면 501{configured:false} → 앱은 수동 발급으로 폴백.
const { sign } = require('./_sign.js');

const PLANS = {
  day:  { amount: 1000, name: 'Hello Billiard Pro (1일권)' },
  perm: { amount: 4900, name: 'Hello Billiard Pro (영구)' },
};
// TC0ONETIME = 테스트 CID. 실제 계약 후 라이브 CID 로 교체(환경변수 KAKAO_CID 있으면 그걸 사용).
const CID = process.env.KAKAO_CID || 'TC0ONETIME';

module.exports = async function handler(req, res){
  const ADMIN = process.env.KAKAO_ADMIN_KEY;
  const SECRET = process.env.HB_SIGN_SECRET;
  if(!ADMIN || !SECRET) return res.status(501).json({ configured: false });
  if(req.method !== 'POST') return res.status(405).json({ error: 'method' });

  let body = req.body;
  if(typeof body === 'string'){ try{ body = JSON.parse(body||'{}'); }catch(e){ body = {}; } }
  const plan = body && body.plan;
  const P = PLANS[plan];
  if(!P) return res.status(400).json({ error: 'plan' });

  const order = 'hb_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const user  = 'u_'  + Math.random().toString(36).slice(2, 10);
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const origin = proto + '://' + req.headers.host;

  const form = new URLSearchParams({
    cid: CID,
    partner_order_id: order,
    partner_user_id: user,
    item_name: P.name,
    quantity: '1',
    total_amount: String(P.amount),
    tax_free_amount: '0',
    approval_url: origin + '/api/kakao-approve',
    cancel_url:   origin + '/?pay=cancel',
    fail_url:     origin + '/?pay=fail',
  });

  let data;
  try{
    const r = await fetch('https://kapi.kakao.com/v1/payment/ready', {
      method: 'POST',
      headers: {
        'Authorization': 'KakaoAK ' + ADMIN,
        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: form.toString(),
    });
    data = await r.json();
    if(!r.ok || !data.tid) return res.status(502).json({ error: 'ready_failed', detail: data });
  }catch(e){
    return res.status(502).json({ error: 'ready_error' });
  }

  // 승인 때 필요한 값을 서명 쿠키로 (10분). SameSite=Lax = 카카오→우리 top-level 리다이렉트에 전송됨.
  const token = sign({ tid: data.tid, order: order, user: user, plan: plan, exp: Date.now() + 10*60*1000 }, SECRET);
  res.setHeader('Set-Cookie', 'hbpay=' + token + '; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax');

  // 모바일/PC 결제창 URL 반환 → 클라이언트가 브라우저를 그리로 이동
  return res.status(200).json({
    configured: true,
    redirect: data.next_redirect_mobile_url || data.next_redirect_pc_url,
    redirect_pc: data.next_redirect_pc_url,
  });
};
