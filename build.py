#!/usr/bin/env python3
"""index.html の <link>/<script src> を全部インラインして、単一HTML dist/minesweeper-variants.html を作る。
 - 外部ライブラリなし(標準ライブラリのみ)。python3 build.py だけで動く。
 - 先に rules/*.js(_始まり除く)から index.html の RULES:BEGIN〜END ブロックを自動同期する。
   → 新ルールは rules/<id>.js を置いて build するだけで取り込まれる。
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent
idx = root / 'index.html'
html = idx.read_text(encoding='utf-8')

# 1) rules ブロックの同期
files = sorted(p.name for p in (root / 'rules').glob('*.js') if not p.name.startswith('_'))
block = '<!-- RULES:BEGIN -->\n' + ''.join(f'<script src="rules/{f}"></script>\n' for f in files) + '<!-- RULES:END -->'
synced = re.sub(r'<!-- RULES:BEGIN -->.*?<!-- RULES:END -->', lambda m: block, html, flags=re.S)
if synced != html:
    idx.write_text(synced, encoding='utf-8')
    html = synced
    print('index.html の RULES ブロックを同期しました:', ', '.join(files))

# 2) インライン化
def read(rel):
    p = root / rel
    if not p.exists():
        sys.exit(f'見つかりません: {rel}(index.html の参照を確認)')
    return p.read_text(encoding='utf-8')

html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
              lambda m: '<style>\n' + read(m.group(1)) + '\n</style>', html)
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: '<script>\n' + read(m.group(1)).replace('</script', '<\\/script') + '\n</script>', html)

out = root / 'dist' / 'minesweeper-variants.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f'OK: {out.relative_to(root)} ({len(html.encode("utf-8"))/1024:.1f} KB, rules={len(files)})')
