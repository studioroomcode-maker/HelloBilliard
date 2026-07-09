# -*- coding: utf-8 -*-
"""og-image.png (1200x630) 생성 — 앱의 실제 색 팔레트 사용.
   :root { --felt:#1f6b4a --rail:#5b3a21 --paper:#f4f1e8 --accent:#e8b53e
           --c1:#f4f1e8 --c2:#5fb8e8 --c3:#c98ce0 }  배경 #14110d
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1200, 630
SS = 3  # 슈퍼샘플링 배율 (안티에일리어싱)

BG     = (0x14, 0x11, 0x0d)
FELT   = (0x1f, 0x6b, 0x4a)
FELT_D = (0x18, 0x55, 0x3b)
RAIL   = (0x5b, 0x3a, 0x21)
RAIL_L = (0x6f, 0x4a, 0x2c)
PAPER  = (0xf4, 0xf1, 0xe8)
ACCENT = (0xe8, 0xb5, 0x3e)
C2     = (0x5f, 0xb8, 0xe8)
C3     = (0xc9, 0x8c, 0xe0)
RED    = (0xd2, 0x3b, 0x2b)
YEL    = (0xf0, 0xc5, 0x42)

img = Image.new("RGB", (W * SS, H * SS), BG)
d = ImageDraw.Draw(img)

def R(*a):
    return [int(v * SS) for v in a]

# ── 당구대 (오른쪽) ─────────────────────────────
TX, TY, TW, TH = 596, 150, 560, 330   # 2:1 근사 (대대 2844x1422)
RAILW = 22

d.rounded_rectangle(R(TX, TY, TX + TW, TY + TH), radius=int(10 * SS), fill=RAIL)
d.rounded_rectangle(R(TX + 3, TY + 3, TX + TW - 3, TY + TH - 3), radius=int(8 * SS),
                    outline=RAIL_L, width=int(2 * SS))
px0, py0 = TX + RAILW, TY + RAILW
px1, py1 = TX + TW - RAILW, TY + TH - RAILW
d.rectangle(R(px0, py0, px1, py1), fill=FELT)
# 천 음영 (아래쪽 살짝 어둡게)
for i in range(int((py1 - py0) * SS)):
    t = i / ((py1 - py0) * SS)
    if t > 0.55:
        k = (t - 0.55) / 0.45 * 0.30
        c = tuple(int(FELT[j] * (1 - k) + FELT_D[j] * k) for j in range(3))
        d.line([(px0 * SS, py0 * SS + i), (px1 * SS, py0 * SS + i)], fill=c)

def dot(x, y, r, fill, ring):
    d.ellipse(R(x - r, y - r, x + r, y + r), fill=fill, outline=ring, width=max(1, int(1.5 * SS)))

# 경로 3개 — 앱이 그리는 것과 같은 색 순서 (paper / blue / purple)
def poly(pts, color, width, dash=False):
    if not dash:
        d.line([(p[0] * SS, p[1] * SS) for p in pts], fill=color,
               width=int(width * SS), joint="curve")
        return
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        L = math.hypot(x1 - x0, y1 - y0)
        n = max(1, int(L / 9))
        for k in range(n):
            if k % 2:
                continue
            a, b = k / n, min(1.0, (k + 0.62) / n)
            d.line([((x0 + (x1 - x0) * a) * SS, (y0 + (y1 - y0) * a) * SS),
                    ((x0 + (x1 - x0) * b) * SS, (y0 + (y1 - y0) * b) * SS)],
                   fill=color, width=int(width * SS))

cue = (px0 + 96, py1 - 74)
r1  = (px0 + 232, py0 + 88)
r2  = (px1 - 104, py0 + 128)

# 경로 1: 직접 → 상단 장쿠션 1회 (paper)
poly([cue, r1, (px1 - 150, py0 + 2), r2], PAPER, 3)
# 경로 2: 뱅크 (blue)
poly([cue, (px0 + 30, py0 + 34), (px0 + 300, py1 - 30), r2], C2, 3)
# 경로 3: 끌어치기 (purple, 점선)
poly([cue, (px1 - 210, py1 - 24), (px1 - 30, py0 + 150), r1], C3, 3, dash=True)

dot(*r1, 11, RED, (0x9c, 0x28, 0x1c))
dot(*r2, 11, RED, (0x9c, 0x28, 0x1c))
dot(px1 - 46, py1 - 40, 11, YEL, (0xb8, 0x92, 0x20))
dot(*cue, 12, (0xf7, 0xf4, 0xea), (0xcf, 0xc8, 0xb4))
# 수구 강조 링
d.ellipse(R(cue[0] - 19, cue[1] - 19, cue[0] + 19, cue[1] + 19),
          outline=ACCENT, width=max(1, int(1.6 * SS)))

# ── 텍스트 (왼쪽) ───────────────────────────────
F = "C:/Windows/Fonts/"
def font(name, size):
    return ImageFont.truetype(F + name, int(size * SS))

f_title = font("malgunbd.ttf", 62)
f_sub   = font("malgunbd.ttf", 25)
f_body  = font("malgun.ttf", 21)
f_badge = font("malgunbd.ttf", 17)

X = 72
d.text((X * SS, 150 * SS), "Hello Billiard", font=f_title, fill=PAPER)
d.text((X * SS, 228 * SS), "당구 AI 코치", font=f_sub, fill=ACCENT)

body = ["당구대 사진 한 장으로 공 배치를 읽고,", "물리 시뮬레이션이 득점 경로를", "성공률과 함께 제안합니다."]
for i, line in enumerate(body):
    d.text((X * SS, (288 + i * 33) * SS), line, font=f_body, fill=(0xb9, 0xb3, 0xa4))

# 배지
bx, by = X, 412
for label in ["4구 경로", "쓰리쿠션 시스템", "온디바이스"]:
    w = d.textlength(label, font=f_badge) / SS
    pad = 15
    d.rounded_rectangle(R(bx, by, bx + w + pad * 2, by + 36), radius=int(18 * SS),
                        outline=(0x4a, 0x44, 0x39), width=max(1, int(1.4 * SS)))
    d.text(((bx + pad) * SS, (by + 9) * SS), label, font=f_badge, fill=(0xd8, 0xd2, 0xc4))
    bx += w + pad * 2 + 10

# 하단 서명 + 액센트 바
d.rectangle(R(X, 508, X + 46, 512), fill=ACCENT)
d.text((X * SS, 528 * SS), "hellobilliard.studioroomkr.com", font=f_body, fill=(0x8a, 0x84, 0x76))

img = img.resize((W, H), Image.LANCZOS)
out = os.path.join(os.path.dirname(__file__), os.pardir, "og-image.png")
img.save(out, "PNG", optimize=True)
print("saved", out, os.path.getsize(out), "bytes")
