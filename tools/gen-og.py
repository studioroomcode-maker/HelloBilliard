# -*- coding: utf-8 -*-
"""og-image.png (1200x630) 생성 — 앱 실제 화면 캡처(tools/og-source.png)를 사용.

  python tools/gen-og.py           # 기본: 캡처만 (여백은 앱 배경색)
  python tools/gen-og.py --wordmark  # 좌상단에 앱 이름 얹기

원본 비율(≈1.76)과 OG 비율(1.905)이 달라 잘라내지 않고 좌우 여백을 둔다.
"""
from PIL import Image, ImageDraw, ImageFont
import os, sys

W, H = 1200, 630
BG = (0x14, 0x11, 0x0d)     # 앱 배경 #14110d
PAPER = (0xf4, 0xf1, 0xe8)
ACCENT = (0xe8, 0xb5, 0x3e)
MUTED = (0x9b, 0x94, 0x84)

HERE = os.path.dirname(__file__)
src = Image.open(os.path.join(HERE, "og-source.png")).convert("RGBA")

wordmark = "--wordmark" in sys.argv
# 워드마크를 넣으면 위쪽에 텍스트 공간을 비운다.
TOP = 128 if wordmark else 0
box_w, box_h = W, H - TOP

# 잘라내지 않고 전체가 보이도록 축소 (contain)
sc = min(box_w / src.width, box_h / src.height)
nw, nh = int(src.width * sc), int(src.height * sc)
shot = src.resize((nw, nh), Image.LANCZOS)

img = Image.new("RGB", (W, H), BG)
img.paste(shot, ((W - nw) // 2, TOP + (box_h - nh) // 2), shot)

if wordmark:
    d = ImageDraw.Draw(img)
    F = "C:/Windows/Fonts/"
    f_title = ImageFont.truetype(F + "malgunbd.ttf", 44)
    f_sub = ImageFont.truetype(F + "malgun.ttf", 21)
    d.text((56, 30), "Hello Billiard", font=f_title, fill=PAPER)
    d.text((58, 84), "당구 AI 코치 · 사진으로 득점 경로 계산", font=f_sub, fill=ACCENT)
    tw = d.textlength("hellobilliard.studioroomkr.com", font=f_sub)
    d.text((W - 56 - tw, 84), "hellobilliard.studioroomkr.com", font=f_sub, fill=MUTED)

out = os.path.join(HERE, os.pardir, "og-image.png")
img.save(out, "PNG", optimize=True)
print("saved", os.path.normpath(out), os.path.getsize(out), "bytes", "· wordmark" if wordmark else "· plain")
