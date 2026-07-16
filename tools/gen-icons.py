# 앱 아이콘 생성 — tools/icon-source.png(1024, 라운드 사각형) 하나에서 모두 뽑는다.
# (소스는 tools/, 결과물은 icons/ — gen-og.py의 og-source.png와 같은 관례)
#
#  · icon-192 / icon-512  = purpose "any". 원본의 라운드 모서리를 그대로 살린다.
#  · icon-512-maskable    = purpose "maskable". OS가 자기 마스크(원·스퀘어클·
#    각진 사각형)를 씌우므로 모서리가 투명하면 각진 마스크에서 빈칸이 드러난다.
#    원본은 공이 전부 중앙 80% 안전영역 안에 있어(측정치 0% 잘림) 크기를 줄일
#    필요 없이 투명한 모서리만 배경색으로 채우면 된다.
#
# 실행: python tools/gen-icons.py
from PIL import Image
import pathlib

SRC = pathlib.Path('tools/icon-source.png')
BG = (0, 30, 98)          # 원본 가장자리에서 샘플링한 배경 남색

src = Image.open(SRC).convert('RGBA')
if src.size != (1024, 1024):
    raise SystemExit(f'원본이 1024x1024가 아닙니다: {src.size}')

def save(im, path, size, rgb=False):
    out = im.resize((size, size), Image.LANCZOS)
    if rgb:
        out = out.convert('RGB')      # full-bleed라 알파가 전부 255 — 채널을 뺀다
    out.save(path, 'PNG', optimize=True)
    kb = pathlib.Path(path).stat().st_size / 1024
    print(f'{path:32} {size}x{size}  {kb:6.1f} KB')

# purpose "any" — 라운드 모서리 유지
save(src, 'icons/icon-192.png', 192)
save(src, 'icons/icon-512.png', 512)

# purpose "maskable" — 투명 모서리를 배경색으로 채워 full-bleed로
full = Image.new('RGBA', src.size, BG + (255,))
full.alpha_composite(src)
save(full, 'icons/icon-512-maskable.png', 512, rgb=True)

# 팔레트(PNG-8) 압축은 쓰지 않는다 — 256색으로 줄이면 72KB까지 작아지지만
# 공의 그라데이션에 띠가 보인다(PSNR 38.6dB, 육안 확인). 한 번만 받는
# 아이콘이라 화질을 택했다.
