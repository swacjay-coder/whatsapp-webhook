from pathlib import Path
import re

p = Path('server.js')
s = p.read_text()
VERSION = 'iconic-team-inbox-v31-5-8-60-3-0-1-details-label-and-body-safe'

s = re.sub(r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";', f'const BOT_VERSION = "{VERSION}";', s, count=1)

# Rename visible button labels only. Keep internal ids untouched.
for old in [
    'title: "How | كيف"',
    'title: "How | كيف يعمل"',
    'title: "How it works | كيف يعمل"'
]:
    s = s.replace(old, 'title: "Details | التفاصيل"')

# Add Details matching safely if the route condition exists.
if 'iconicServicesText.includes("details")' not in s:
    s = s.replace(
        'iconicServicesText === "how_it_works" ||',
        'iconicServicesText === "how_it_works" ||\n        iconicServicesText.includes("details") ||\n        iconicServicesText.includes("تفاصيل") ||',
        1
    )

# Replace only the old visible copy lines; do not replace the whole function.
replacements = {
    '"الفكرة بسيطة:\\n" +': '"الخطوات بسيطة ومريحة:\\n" +',
    '"نختار لك الشكل المناسب، اللون المناسب، والكثافة المناسبة لشعرك، ثم يتم التركيب بطريقة طبيعية بدون جراحة.\\n\\n" +': '"نبدأ بفهم الشكل الذي يناسبك، ثم نختار اللوك الأقرب لطبيعة شعرك، وبعدها يتم التطبيق بمظهر طبيعي بدون جراحة.\\n\\n" +',
    '"The process is simple:\\n" +': '"The process is simple and comfortable:\\n" +',
    '"We choose the right style, color, and density for you, then apply it naturally with no surgery.\\n\\n" +': '"We start by understanding the look that suits you, choose the closest natural style for your hair, then apply it with a natural, non-surgical result.\\n\\n" +'
}
for old, new in replacements.items():
    if old in s:
        s = s.replace(old, new, 1)

# Safety checks: fail only if the exact intended final content is absent.
required = [
    'Details | التفاصيل',
    'الخطوات بسيطة ومريحة',
    'نبدأ بفهم الشكل الذي يناسبك',
    'The process is simple and comfortable',
    'choose the closest natural style for your hair',
    'Consult | استشارة'
]
missing = [x for x in required if x not in s]
if missing:
    raise SystemExit('[V60.3.0.1] missing after patch: ' + repr(missing))

p.write_text(s)
print('[V60.3.0.1] safe Details label and body applied')
