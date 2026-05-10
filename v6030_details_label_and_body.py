from pathlib import Path
import re

p = Path('server.js')
s = p.read_text()
VERSION = 'iconic-team-inbox-v31-5-8-60-3-0-details-label-and-body'

s = re.sub(r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";', f'const BOT_VERSION = "{VERSION}";', s, count=1)

# Rename only visible button labels. Keep internal id how_it_works unchanged.
s = s.replace('title: "How | كيف"', 'title: "Details | التفاصيل"')
s = s.replace('title: "How | كيف يعمل"', 'title: "Details | التفاصيل"')
s = s.replace('title: "How it works | كيف يعمل"', 'title: "Details | التفاصيل"')

# Accept Details title in the same route while keeping old ids/titles compatible.
if 'iconicServicesText.includes("details")' not in s:
    s = s.replace(
        'iconicServicesText === "how_it_works" ||',
        'iconicServicesText === "how_it_works" ||\n        iconicServicesText.includes("details") ||\n        iconicServicesText.includes("تفاصيل") ||',
        1
    )

# Replace Details body with approved premium copy.
pattern = r'''function buildHowItWorksBody\(customerName = ""\) \{[\s\S]*?\n\}'''
new_body = '''function buildHowItWorksBody(customerName = "") {
  const cleanName = namePhrase(customerName);
  const intro = cleanName ? `أكيد ${cleanName} ✨` : "أكيد ✨";

  return `${intro}\\n\\n` +
    "الخطوات بسيطة ومريحة:\\n" +
    "نبدأ بفهم الشكل الذي يناسبك، ثم نختار اللوك الأقرب لطبيعة شعرك، وبعدها يتم التطبيق بمظهر طبيعي بدون جراحة.\\n\\n" +
    "The process is simple and comfortable:\\n" +
    "We start by understanding the look that suits you, choose the closest natural style for your hair, then apply it with a natural, non-surgical result.\\n\\n" +
    "شو تحب تعمل الآن؟\\n" +
    "What would you like to do now?";
}'''
s, n = re.subn(pattern, new_body, s, count=1)
if n != 1:
    raise SystemExit('[V60.3.0] buildHowItWorksBody replacement failed')

# Safety checks
if 'Details | التفاصيل' not in s:
    raise SystemExit('[V60.3.0] Details button title missing')
if 'الخطوات بسيطة ومريحة' not in s:
    raise SystemExit('[V60.3.0] approved Arabic Details body missing')
if 'The process is simple and comfortable' not in s:
    raise SystemExit('[V60.3.0] approved English Details body missing')
if 'Consult | استشارة' not in s:
    raise SystemExit('[V60.3.0] Consult label unexpectedly missing')

p.write_text(s)
print('[V60.3.0] Details label and body applied')
