from pathlib import Path
import re

p = Path('server.js')
s = p.read_text()
VERSION = 'iconic-team-inbox-v31-5-8-60-2-9-restore-original-results-video-route'

s = re.sub(r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";', f'const BOT_VERSION = "{VERSION}";', s, count=1)

# Remove the custom Results Follow-up route added by V60.2.6.
# This route was intercepting Results before the original existing Results media/video logic.
pattern = r'''\n\s*if \(\["results", "results \| نتائج", "results", "نتائج"\]\.includes\(iconicServicesText\)\) \{\n\s*await sendWhatsAppButtonMessage\(from, buildResultsFollowupBody\(profileName\), \[\n\s*\{ id: "how_it_works", title: "[^"]+" \},\n\s*\{ id: "booking_menu", title: "Booking \| حجز" \},\n\s*\{ id: "talk_to_team", title: "Team \| فريقنا" \}\n\s*\], incomingPhoneNumberId, \{ headerImageUrl: BOT_HEADER_IMAGE_URL \}\);\n\s*addInboxMessage\(from, "bot", buildResultsFollowupBody\(profileName\), "Results Follow-up", incomingPhoneNumberId, \{ customerName: profileName, messageType: "Results Follow-up" \}\);\n\s*return res\.sendStatus\(200\);\n\s*\}\n'''
s, n = re.subn(pattern, '\n', s, count=1)

# Also handle newer broad-matching variant if present.
pattern2 = r'''\n\s*if \(iconicIsResultsRoute\) \{\n\s*await sendWhatsAppButtonMessage\(from, buildResultsFollowupBody\(profileName\), \[\n\s*\{ id: "how_it_works", title: "[^"]+" \},\n\s*\{ id: "booking_menu", title: "Booking \| حجز" \},\n\s*\{ id: "talk_to_team", title: "Team \| فريقنا" \}\n\s*\], incomingPhoneNumberId, \{ headerImageUrl: BOT_HEADER_IMAGE_URL \}\);\n\s*addInboxMessage\(from, "bot", buildResultsFollowupBody\(profileName\), "Results Follow-up", incomingPhoneNumberId, \{ customerName: profileName, messageType: "Results Follow-up" \}\);\n\s*return res\.sendStatus\(200\);\n\s*\}\n'''
s, n2 = re.subn(pattern2, '\n', s, count=1)

if n + n2 == 0:
    print('[V60.2.9] no custom Results Follow-up route found; continuing')
else:
    print(f'[V60.2.9] removed custom Results route count={n+n2}')

# Ensure How visible button title is short for WhatsApp button max length.
s = s.replace('title: "How it works | كيف يعمل"', 'title: "How | كيف"')
s = s.replace('"How it works | كيف يعمل"', '"How | كيف"')

# Ensure How route can accept the short title too if title is used instead of id.
if '"how | كيف"' not in s:
    s = s.replace('"how it works", "كيف يعمل"', '"how | كيف", "how it works", "كيف يعمل"', 1)

# Safety: How video URL must remain; original Results route should no longer be blocked by our custom Results follow-up return.
if 'HOW_IT_WORKS_VIDEO_URL' not in s:
    raise SystemExit('[V60.2.9] HOW_IT_WORKS_VIDEO_URL missing')
if 'Results Follow-up' in s:
    raise SystemExit('[V60.2.9] custom Results Follow-up route still present')
if 'title: "How it works | كيف يعمل"' in s:
    raise SystemExit('[V60.2.9] long How title still present')

p.write_text(s)
print('[V60.2.9] original Results video route restored; How video route kept')
