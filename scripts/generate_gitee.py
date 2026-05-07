#!/usr/bin/env python3
"""
Gitee 版仪表盘生成脚本
基于已生成的 docs/index.html 去掉表单，生成 docs/index-gitee.html
"""
import os

SCRIPT_DIR = os.path.dirname(__file__)
HTML_PATH = os.path.join(SCRIPT_DIR, "..", "docs", "index.html")
GITEE_PATH = os.path.join(SCRIPT_DIR, "..", "docs", "index-gitee.html")

if not os.path.exists(HTML_PATH):
    print("❌ docs/index.html not found. Run generate_dashboard.py first.")
    exit(1)

with open(HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

# Find the form card (first <div class="card">)
cards = []
idx = 0
while True:
    idx = html.find('<div class="card">', idx)
    if idx == -1:
        break
    cards.append(idx)
    idx += 1

if not cards:
    print("❌ No cards found in HTML")
    exit(1)

# First card is the form card
form_start = cards[0]
# Find next card or footer
next_card = html.find('<div class="card">', form_start + 1)
footer_start = html.find('<div class="footer"', form_start)
form_end = next_card if next_card != -1 else footer_start

replacement = """<div class="card">
      <div class="card-title">💡 数据查看</div>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:4px 0;">
        体重数据由 yumeAlexLee 在日本更新。<br>
        如需录入新数据，请联系他。
      </p>
    </div>"""

html = html[:form_start] + replacement + html[form_end:]

with open(GITEE_PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"✅ Gitee dashboard generated: {GITEE_PATH}")
print(f"   Size: {len(html)} bytes")
