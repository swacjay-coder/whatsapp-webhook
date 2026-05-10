from pathlib import Path
import re

p = Path('server.js')
s = p.read_text()
VERSION = 'iconic-team-inbox-v31-5-8-60-2-7-fix-services-normalized-matching'

s = re.sub(r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";', f'const BOT_VERSION = "{VERSION}";', s, count=1)

# Add broad route flags immediately after iconicServicesText is created.
old = '''      const iconicServicesText = normalizeText(iconicServicesRawText);

      if (["services_menu", "services | خدماتنا", "services", "خدماتنا"].includes(iconicServicesText)) {'''
new = '''      const iconicServicesText = normalizeText(iconicServicesRawText);
      const iconicIsServicesRoute = (
        iconicServicesText === "services_menu" ||
        iconicServicesText === "servicesmenu" ||
        iconicServicesText === "services" ||
        iconicServicesText.includes("services") ||
        iconicServicesText.includes("خدمات")
      );
      const iconicIsResultsRoute = (
        iconicServicesText === "results" ||
        iconicServicesText.includes("result") ||
        iconicServicesText.includes("نتائج")
      );
      const iconicIsHowItWorksRoute = (
        iconicServicesText === "how_it_works" ||
        iconicServicesText === "howitworks" ||
        (iconicServicesText.includes("how") and iconicServicesText.includes("work")) ||
        iconicServicesText.includes("كيف")
      );

      if (iconicIsServicesRoute) {'''
if old not in s:
    raise SystemExit('[V60.2.7] services condition anchor not found')
s = s.replace(old, new, 1)

s = s.replace('if (["results", "results | نتائج", "results", "نتائج"].includes(iconicServicesText)) {', 'if (iconicIsResultsRoute) {', 1)
s = s.replace('if (["how_it_works", "how it works | كيف يعمل", "how it works", "كيف يعمل"].includes(iconicServicesText)) {', 'if (iconicIsHowItWorksRoute) {', 1)

# Fix accidental Python-style `and` inside JS if present.
s = s.replace('(iconicServicesText.includes("how") and iconicServicesText.includes("work"))', '(iconicServicesText.includes("how") && iconicServicesText.includes("work"))')

if 'const iconicIsServicesRoute' not in s or 'if (iconicIsServicesRoute)' not in s:
    raise SystemExit('[V60.2.7] services broad matching not applied')
if '&& iconicServicesText.includes("work")' not in s:
    raise SystemExit('[V60.2.7] JS && check missing')

p.write_text(s)
print('[V60.2.7] broad normalized Services/Results/How-it-works matching applied')
