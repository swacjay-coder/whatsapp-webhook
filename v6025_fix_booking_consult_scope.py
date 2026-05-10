from pathlib import Path
import re

server_path = Path('server.js')
s = server_path.read_text()

VERSION = 'iconic-team-inbox-v31-5-8-60-2-5-fix-booking-consult-scope-services-how-it-works'


def replace_required(label, old, new):
    global s
    if old not in s:
        raise SystemExit(f'[V60.2.5] missing expected block: {label}')
    s = s.replace(old, new, 1)
    print(f'[V60.2.5] {label}: fixed')

# Version bump
s = re.sub(
    r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";',
    f'const BOT_VERSION = "{VERSION}";',
    s,
    count=1,
)

# Restore Booking menu and direct booking consultation labels.
replace_required(
    'direct booking consult button',
    'function getDirectBookingChoiceButtons() {\n  return [\n    { id: "book_service_flow", title: "Book Service | سيرفس" },\n    { id: "consult_menu", title: "How it works | كيف يعمل" }\n  ];\n}',
    'function getDirectBookingChoiceButtons() {\n  return [\n    { id: "book_service_flow", title: "Book Service | سيرفس" },\n    { id: "consult_menu", title: "Consult | استشارة" }\n  ];\n}'
)

replace_required(
    'booking submenu consult button',
    'function getBookingSubMenuButtons() {\n  return [\n    { id: "consult_menu", title: "How it works | كيف يعمل" },\n    { id: "service_menu", title: "Service | سيرفس" },\n    { id: "talk_to_team", title: "Help | ساعدني" }\n  ];\n}',
    'function getBookingSubMenuButtons() {\n  return [\n    { id: "consult_menu", title: "Consult | استشارة" },\n    { id: "service_menu", title: "Service | سيرفس" },\n    { id: "talk_to_team", title: "Help | ساعدني" }\n  ];\n}'
)

replace_required(
    'humanize consult action',
    '    consult_menu: "How it works | كيف يعمل",',
    '    consult_menu: "Consult | استشارة",'
)

# Restore consultation flow default text/comment only; do not touch Services route buttons.
s = s.replace(
    '// Opens the new consultation Flow for Dubai when customers choose How it works | كيف يعمل.',
    '// Opens the new consultation Flow for Dubai when customers choose Consult | استشارة.',
    1
)
s = s.replace(
    'const consultationActionText = getSmartCustomerActionText(message, originalText || text) || "How it works | كيف يعمل";',
    'const consultationActionText = getSmartCustomerActionText(message, originalText || text) || "Consult | استشارة";',
    1
)

# Improve V60.2.4 route button IDs to match existing menu action IDs where available.
s = s.replace(
    '{ id: "booking", title: "Booking | حجز" },\n          { id: "results", title: "Results | نتائج" },\n          { id: "team", title: "Team | فريقنا" }',
    '{ id: "booking_menu", title: "Booking | حجز" },\n          { id: "results", title: "Results | نتائج" },\n          { id: "talk_to_team", title: "Team | فريقنا" }',
    1
)

# Safety checks: Services menu must still contain How it works, Booking menu must contain Consult.
if 'function buildServicesMenuBody(' not in s or '{ id: "how_it_works", title: "How it works | كيف يعمل" }' not in s:
    raise SystemExit('[V60.2.5] Services How it works route missing after fix')
if 'function getBookingSubMenuButtons()' not in s or '{ id: "consult_menu", title: "Consult | استشارة" }' not in s:
    raise SystemExit('[V60.2.5] Booking Consult button missing after fix')

server_path.write_text(s)
print('[V60.2.5] booking consult scope fixed safely')
