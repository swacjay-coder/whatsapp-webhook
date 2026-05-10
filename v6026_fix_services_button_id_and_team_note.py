from pathlib import Path
import re

server_path = Path('server.js')
s = server_path.read_text()

VERSION = 'iconic-team-inbox-v31-5-8-60-2-6-fix-services-button-id-and-team-pause-note'


def required(label, old, new):
    global s
    if old not in s:
        raise SystemExit(f'[V60.2.6] missing expected block: {label}')
    s = s.replace(old, new, 1)
    print(f'[V60.2.6] {label}: applied')

# Version bump
s = re.sub(
    r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";',
    f'const BOT_VERSION = "{VERSION}";',
    s,
    count=1,
)

# Make Services/How-it-works pre-router read button/list IDs, not title only.
old_raw = '''      const iconicServicesRawText = (
        message?.interactive?.button_reply?.title ||
        message?.interactive?.list_reply?.title ||
        message?.button?.text ||
        message?.text?.body ||
        ""
      ).toString().trim();
      const iconicServicesText = normalizeText(iconicServicesRawText);

      if (["services | خدماتنا", "services", "خدماتنا"].includes(iconicServicesText)) {'''
new_raw = '''      const iconicServicesRawText = (
        message?.interactive?.button_reply?.id ||
        message?.interactive?.button_reply?.title ||
        message?.interactive?.list_reply?.id ||
        message?.interactive?.list_reply?.title ||
        message?.button?.payload ||
        message?.button?.text ||
        message?.text?.body ||
        ""
      ).toString().trim();
      const iconicServicesText = normalizeText(iconicServicesRawText);

      if (["services_menu", "services | خدماتنا", "services", "خدماتنا"].includes(iconicServicesText)) {'''
required('services pre-router id support', old_raw, new_raw)

old_how = '''      if (["how it works | كيف يعمل", "how it works", "كيف يعمل"].includes(iconicServicesText)) {'''
new_how = '''      if (["how_it_works", "how it works | كيف يعمل", "how it works", "كيف يعمل"].includes(iconicServicesText)) {'''
required('how it works id support', old_how, new_how)

# Add a dedicated robust Results follow-up route after the existing Services route.
# It does not touch the existing results video function; it only sends the premium follow-up/buttons when Results button ID/title is detected.
# If older code already sends video later, this route will not intercept video. To avoid double/conflict, it only handles the new Services button id/title with the new followup.
insert_after = '''        addInboxMessage(from, "bot", buildServicesMenuBody(profileName), "Services Menu", incomingPhoneNumberId, { customerName: profileName, messageType: "Services Menu" });
        return res.sendStatus(200);
      }

'''
results_route = '''      if (["results", "results | نتائج", "results", "نتائج"].includes(iconicServicesText)) {
        await sendWhatsAppButtonMessage(from, buildResultsFollowupBody(profileName), [
          { id: "how_it_works", title: "How it works | كيف يعمل" },
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildResultsFollowupBody(profileName), "Results Follow-up", incomingPhoneNumberId, { customerName: profileName, messageType: "Results Follow-up" });
        return res.sendStatus(200);
      }

'''
if 'Results Follow-up' not in s:
    required('results follow-up route', insert_after, insert_after + results_route)
else:
    print('[V60.2.6] results follow-up route already present')

# Improve Team handoff message: professional note that auto replies stop and how to reactivate.
old_team_tail = '''  return `${intro}\\n\\n` +
    "تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.\\n\\n" +
    "------------------------------\\n\\n" +
    "Your conversation has been forwarded to our team, and one of our specialists will assist you shortly.";
}'''
new_team_tail = '''  return `${intro}\\n\\n` +
    "تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.\\n\\n" +
    "ملاحظة: تم إيقاف الردود التلقائية مؤقتاً بناءً على طلبك للتحدث مع الفريق.\\n" +
    "لإعادة تفعيل الردود التلقائية لاحقاً، اكتب: تشغيل البوت\\n\\n" +
    "------------------------------\\n\\n" +
    "Your conversation has been forwarded to our team, and one of our specialists will assist you shortly.\\n\\n" +
    "Note: Automatic replies have been paused because you asked to speak with our team.\\n" +
    "To reactivate the automatic replies later, type: resume bot";
}'''
required('team handoff pause note', old_team_tail, new_team_tail)

# Safety checks
if 'services_menu' not in s or 'how_it_works' not in s:
    raise SystemExit('[V60.2.6] missing required Services/How-it-works IDs after patch')
if 'تشغيل البوت' not in s or 'resume bot' not in s:
    raise SystemExit('[V60.2.6] team reactivation note missing after patch')
if 'Consult | استشارة' not in s:
    raise SystemExit('[V60.2.6] Consult label unexpectedly missing')

server_path.write_text(s)
print('[V60.2.6] services id support and team pause note applied')
