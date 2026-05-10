from pathlib import Path
import re

p = Path('server.js')
s = p.read_text()
VERSION = 'iconic-team-inbox-v31-5-8-60-2-7-2-force-services-matching'

s = re.sub(r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";', f'const BOT_VERSION = "{VERSION}";', s, count=1)

# Force broad matching by replacing the existing Services condition, regardless of the exact array content.
services_pattern = r'if \(\[[^\]]*(?:services|خدمات)[^\]]*\]\.includes\(iconicServicesText\)\) \{'
services_repl = 'if (iconicServicesText === "services_menu" || iconicServicesText === "servicesmenu" || iconicServicesText.includes("services") || iconicServicesText.includes("خدمات")) {'
s, n_services = re.subn(services_pattern, services_repl, s, count=1)

results_pattern = r'if \(\[[^\]]*(?:results|نتائج)[^\]]*\]\.includes\(iconicServicesText\)\) \{'
results_repl = 'if (iconicServicesText === "results" || iconicServicesText.includes("result") || iconicServicesText.includes("نتائج")) {'
s, n_results = re.subn(results_pattern, results_repl, s, count=1)

how_pattern = r'if \(\[[^\]]*(?:how_it_works|how it works|كيف)[^\]]*\]\.includes\(iconicServicesText\)\) \{'
how_repl = 'if (iconicServicesText === "how_it_works" || iconicServicesText === "howitworks" || (iconicServicesText.includes("how") && iconicServicesText.includes("work")) || iconicServicesText.includes("كيف")) {'
s, n_how = re.subn(how_pattern, how_repl, s, count=1)

if n_services < 1:
    raise SystemExit('[V60.2.7.2] Services condition was not replaced')
if n_how < 1:
    raise SystemExit('[V60.2.7.2] How it works condition was not replaced')
# Results may already have been converted or may not be present; do not fail, but report.
print(f'[V60.2.7.2] replacements services={n_services} results={n_results} how={n_how}')

# Ensure raw text reads ids/payloads as well as titles.
if 'message?.interactive?.button_reply?.id ||' not in s:
    s = s.replace('message?.interactive?.button_reply?.title ||', 'message?.interactive?.button_reply?.id ||\n        message?.interactive?.button_reply?.title ||', 1)
if 'message?.interactive?.list_reply?.id ||' not in s:
    s = s.replace('message?.interactive?.list_reply?.title ||', 'message?.interactive?.list_reply?.id ||\n        message?.interactive?.list_reply?.title ||', 1)
if 'message?.button?.payload ||' not in s:
    s = s.replace('message?.button?.text ||', 'message?.button?.payload ||\n        message?.button?.text ||', 1)

checks = [
    'iconicServicesText.includes("services")',
    'iconicServicesText.includes("خدمات")',
    'iconicServicesText.includes("how") && iconicServicesText.includes("work")',
    'message?.interactive?.button_reply?.id ||',
]
missing = [c for c in checks if c not in s]
if missing:
    raise SystemExit('[V60.2.7.2] missing checks: ' + repr(missing))

p.write_text(s)
print('[V60.2.7.2] forced broad matching applied')
