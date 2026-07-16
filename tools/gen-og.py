# -*- coding: utf-8 -*-
"""og-image.png (1200x630) 생성 — 공유 링크 미리보기.

  python tools/gen-og.py

구성: 왼쪽에 아이덴티티(아이콘·이름·설명·주소), 오른쪽에 실제 앱 화면.
예전 판은 당구대 캡처만 있고 앱 이름조차 없어서, 카톡·SNS에서 보면
무슨 앱인지 알 수 없었다.

소스:
  · tools/icon-source.png  — 앱 아이콘 원본 (gen-icons.py와 공용)
  · tools/og-source.png    — 앱 화면 캡처 (3구 보드, 숫자 라벨이 보이는 상태)
  · fonts/*.woff2          — 앱이 실제로 쓰는 글자꼴. 워드마크가 앱과 달라
                             보이지 않도록 woff2를 메모리에서 풀어 쓴다.
                             (woff2는 라틴 서브셋이라 한글은 맑은 고딕)
"""
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
import io, os

W, H = 1200, 630
BG = (0x14, 0x11, 0x0d)          # 앱 배경 #14110d
PAPER = (0xf6, 0xf2, 0xe9)
ACCENT = (0xe8, 0xb5, 0x3e)
MUTED = (0x9b, 0x94, 0x84)
LINE = (0x31, 0x28, 0x19)

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, os.pardir)


def woff2_font(rel, size):
    """woff2 → ttf(메모리) → PIL 폰트. 앱과 같은 글자꼴을 쓰기 위해."""
    f = TTFont(os.path.join(ROOT, "fonts", rel))   # fontTools가 woff2를 풀어준다
    f.flavor = None                                # 압축을 풀어 순수 ttf로
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


MALGUN = "C:/Windows/Fonts/malgun.ttf"
MALGUN_BD = "C:/Windows/Fonts/malgunbd.ttf"

f_title = woff2_font("bricolage-grotesque-latin.woff2", 60)
f_url = woff2_font("spline-sans-mono-latin.woff2", 17)
f_sub = ImageFont.truetype(MALGUN_BD, 23)
f_body = ImageFont.truetype(MALGUN, 19)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# ── 오른쪽: 앱 화면 ─────────────────────────────────────────────
shot = Image.open(os.path.join(HERE, "og-source.png")).convert("RGBA")
PANE_X, PANE_W = 466, W - 466 - 44
sc = min(PANE_W / shot.width, (H - 104) / shot.height)
nw, nh = int(shot.width * sc), int(shot.height * sc)
shot = shot.resize((nw, nh), Image.LANCZOS)
sx, sy = PANE_X + (PANE_W - nw) // 2, (H - nh) // 2
d.rounded_rectangle([sx - 9, sy - 9, sx + nw + 8, sy + nh + 8], radius=15,
                    fill=(0x1b, 0x16, 0x10), outline=LINE, width=2)
img.paste(shot, (sx, sy), shot)

# ── 왼쪽: 아이덴티티 ────────────────────────────────────────────
icon = Image.open(os.path.join(HERE, "icon-source.png")).convert("RGBA")
icon = icon.resize((100, 100), Image.LANCZOS)
img.paste(icon, (56, 116), icon)

d.text((56, 248), "Hello Billiard", font=f_title, fill=PAPER)
d.text((58, 324), "당구 AI 코치", font=f_sub, fill=ACCENT)
d.text((58, 364), "3구 시스템 계산기 + 4구 경로 시뮬레이터", font=f_body, fill=PAPER)
d.text((58, 394), "사진으로 공 배치를 읽고 득점 경로를 제안합니다", font=f_body, fill=MUTED)
d.text((58, 462), "hellobilliard.studioroomkr.com", font=f_url, fill=MUTED)

out = os.path.join(ROOT, "og-image.png")
img.save(out, "PNG", optimize=True)
print("saved", os.path.normpath(out), f"{os.path.getsize(out)/1024:.1f} KB")
