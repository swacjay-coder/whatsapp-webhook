from pathlib import Path
import re

p = Path('server.js')
s = p.read_text()
VERSION = 'iconic-team-inbox-v31-5-8-60-2-6-1-services-button-id-team-pause-note'

# version
s = re.sub(r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";', f'const BOT_VERSION = "{VERSION}";', s, count=1)

# add id support to existing V60.2.4 pre-router if not already present
if 'message?.interactive?.button_reply?.id ||' not in s:
    s = s.replace(
'''      const iconicServicesRawText = (\n        message?.interactive?.button_reply?.title ||\n        message?.interactive?.list_reply?.title ||\n        message?.button?.text ||\n        message?.text?.body ||\n        ""\n      ).toString().trim();''',
'''      const iconicServicesRawText = (\n        message?.interactive?.button_reply?.id ||\n        message?.interactive?.button_reply?.title ||\n        message?.interactive?.list_reply?.id ||\n        message?.interactive?.list_reply?.title ||\n        message?.button?.payload ||\n        message?.button?.text ||\n        message?.text?.body ||\n        ""\n      ).toString().trim();''', 1)

# support services_menu and how_it_works IDs
s = s.replace('["services | خدماتنا", "services", "خدماتنا"].includes(iconicServicesText)', '["services_menu", "services | خدماتنا", "services", "خدماتنا"].includes(iconicServicesText)')
s = s.replace('["how it works | كيف يعمل", "how it works", "كيف يعمل"].includes(iconicServicesText)', '["how_it_works", "how it works | كيف يعمل", "how it works", "كيف يعمل"].includes(iconicServicesText)')

# add Results followup route after Services menu route if missing
if 'Results Follow-up' not in s:
    marker = '''        addInboxMessage(from, "bot", buildServicesMenuBody(profileName), "Services Menu", incomingPhoneNumberId, { customerName: profileName, messageType: "Services Menu" });\n        return res.sendStatus(200);\n      }\n\n'''
    route = '''      if (["results", "results | نتائج", "نتائج"].includes(iconicServicesText)) {\n        await sendWhatsAppButtonMessage(from, buildResultsFollowupBody(profileName), [\n          { id: "how_it_works", title: "How it works | كيف يعمل" },\n          { id: "booking_menu", title: "Booking | حجز" },\n          { id: "talk_to_team", title: "Team | فريقنا" }\n        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });\n        addInboxMessage(from, "bot", buildResultsFollowupBody(profileName), "Results Follow-up", incomingPhoneNumberId, { customerName: profileName, messageType: "Results Follow-up" });\n        return res.sendStatus(200);\n      }\n\n'''
    if marker not in s:
        raise SystemExit('[V60.2.6.1] Services route marker not found')
    s = s.replace(marker, marker + route, 1)

# team handoff note: insert after Arabic handoff sentence and after English handoff sentence, only once
if 'تم إيقاف الردود التلقائية مؤقتاً' not in s:
    s = s.replace(
        '"تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.\\n\\n" +',
        '"تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.\\n\\n" +\n    "ملاحظة: تم إيقاف الردود التلقائية مؤقتاً بناءً على طلبك للتحدث مع الفريق.\\n" +\n    "لإعادة تفعيل الردود التلقائية لاحقاً، اكتب: تشغيل البوت\\n\\n" +',
        1
    )
if 'Automatic replies have been paused' not in s:
    s = s.replace(
        '"Your conversation has been forwarded to our team, and one of our specialists will assist you shortly.";',
        '"Your conversation has been forwarded to our team, and one of our specialists will assist you shortly.\\n\\n" +\n    "Note: Automatic replies have been paused because you asked to speak with our team.\\n" +\n    "To reactivate the automatic replies later, type: resume bot";',
        1
    )

# safety checks
checks = [
    'services_menu", "services | خدماتنا',
    'how_it_works", "how it works | كيف يعمل',
    'تم إيقاف الردود التلقائية مؤقتاً',
    'Automatic replies have been paused',
    'Consult | استشارة',
]
missing = [c for c in checks if c not in s]
if missing:
    raise SystemExit('[V60.2.6.1] missing checks: ' + repr(missing))

p.write_text(s)
print('[V60.2.6.1] robust services id + team pause note applied')
