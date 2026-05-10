from pathlib import Path
import re

p = Path('server.js')
s = p.read_text()
VERSION = 'iconic-team-inbox-v31-5-8-60-2-8-1-fix-how-button-title-only'

s = re.sub(r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";', f'const BOT_VERSION = "{VERSION}";', s, count=1)

# WhatsApp button title max length is 20 chars.
# Only shorten the visible button title. Keep ids and matching logic unchanged.
s = s.replace('title: "How it works | كيف يعمل"', 'title: "How | كيف"')
s = s.replace('"How it works | كيف يعمل"', '"How | كيف"')

# Keep incoming title matching compatible with both old and new titles if route logic exists.
if 'how | كيف' not in s:
    s = s.replace('"how it works | كيف يعمل",', '"how | كيف", "how it works | كيف يعمل",', 1)

p.write_text(s)
print('[V60.2.8.1] shortened How button title for WhatsApp limit')
