// 카카오페이 결제 승인 — 결제창에서 돌아온 pg_token + 쿠키(tid/plan)로 최종 승인.
// 성공하면 '언락 토큰'을 발급해 앱으로 리다이렉트(/?unlock=...) → 앱이 Pro 자동 활성화.
const { sign, verify } = require('./_sign.js');

const CID = process.env.KAKAO_CID || 'TC0ONETIME';

function readCookie(req, name){
  if(req.cookies && req.cookies[name]) return req.cookies[name];
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = async function handler(req, res){
  const ADMIN = process.env.KAKAO_ADMIN_KEY;
  const SECRET = process.env.HB_SIGN_SECRET;
  const clearCookie = 'hbpay=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
  const bail = function(q){ res.setHeader('Set-Cookie', clearCookie); res.writeHead(302, { Location: '/?pay=' + q }); res.end(); };

  if(!ADMIN || !SECRET) return bail('unavailable');

  const pgToken = req.query && (req.query.pg_token || req.query.pgToken);
  const st = verify(readCookie(req, 'hbpay'), SECRET);
  if(!pgToken || !st || !st.tid) return bail('expired');

  const form = new URLSearchParams({
    cid: CID,
    tid: st.tid,
    partner_order_id: st.order,
    partner_user_id: st.user,
    pg_token: pgToken,
  });

  try{
    const r = await fetch('https://kapi.kakao.com/v1/payment/approve', {
      method: 'POST',
      headers: {
        'Authorization': 'KakaoAK ' + ADMIN,
        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: form.toString(),
    });
    const data = await r.json();
    if(!r.ok || !data.aid) return bail('fail');
  }catch(e){
    return bail('error');
  }

  // 승인 성공 → 언락 토큰(짧은 만료) 발급 후 앱으로. verify-unlock 이 재검증한다.
  const unlock = sign({ plan: st.plan, exp: Date.now() + 10*60*1000 }, SECRET);
  res.setHeader('Set-Cookie', clearCookie);
  res.writeHead(302, { Location: '/?unlock=' + encodeURIComponent(unlock) });
  res.end();
};
