from pathlib import Path
import re

p = Path('server.js')
s = p.read_text()
VERSION = 'iconic-team-inbox-v31-5-8-60-2-8-fix-button-title-lengths'

s = re.sub(r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";', f'const BOT_VERSION = "{VERSION}";', s, count=1)

# WhatsApp Cloud API button title max length is 20 characters.
# Replace the long visible button title only; keep id how_it_works and matching logic unchanged.
s = s.replace('title: "How it works | كيف يعمل"', 'title: "How | كيف يعمل"')
s = s.replace('"How it works | كيف يعمل"', '"How | كيف يعمل"')

# Keep route matching compatible with both old and new title text.
if 'how | كيف يعمل' not in s:
    # Add normalized short title support beside the existing how route condition if possible.
    s = s.replace('iconicServicesText === "how_it_works" ||', 'iconicServicesText === "how_it_works" ||\n        iconicServicesText === "how | كيف يعمل" ||', 1)

# Safety checks: no visible button title should contain the long label anymore.
if 'title: "How it works | كيف يعمل"' in s:
    raise SystemExit('[V60.2.8] long How it works button title still exists')
if 'How | كيف يعمل' not in s:
    raise SystemExit('[V60.2.8] short How button title missing')
if 'Consult | استشارة' not in s:
    raise SystemExit('[V60.2.8] Consult label unexpectedly missing')

p.write_text(s)
print('[V60.2.8] fixed WhatsApp button title lengths')
