from pathlib import Path

p = Path('server.js')
s = p.read_text()

OLD_VERSION = 'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-0-2-services-video-header-single-message";'
NEW_VERSION = 'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-0-3-safe-video-fallback";'

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('[V60.3.0.3] ' + label + ' expected 1, found ' + str(count))
    return text.replace(old, new, 1)

s = replace_once(s, OLD_VERSION, NEW_VERSION, 'BOT_VERSION')

old_results = '''      if (iconicIsResultsRoute) {
        await sendWhatsAppButtonMessage(from, buildResultsFollowupBody(profileName), [
          { id: "how_it_works", title: "Details | التفاصيل" },
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerVideoUrl: RESULTS_VIDEO_URL });
        addInboxMessage(from, "bot", buildResultsFollowupBody(profileName), "Results Video Header", incomingPhoneNumberId, { customerName: profileName, messageType: "Results Video Header" });
        return res.sendStatus(200);
      }
'''
new_results = '''      if (iconicIsResultsRoute) {
        await sendWhatsAppVideoByLink(from, RESULTS_VIDEO_URL, "", incomingPhoneNumberId);
        await sendWhatsAppButtonMessage(from, buildResultsFollowupBody(profileName), [
          { id: "how_it_works", title: "Details | التفاصيل" },
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildResultsFollowupBody(profileName), "Results Safe Fallback", incomingPhoneNumberId, { customerName: profileName, messageType: "Results Safe Fallback" });
        return res.sendStatus(200);
      }
'''
s = replace_once(s, old_results, new_results, 'Results fallback route')

old_details = '''      if (iconicIsHowItWorksRoute) {
        await sendWhatsAppButtonMessage(from, buildHowItWorksBody(profileName), [
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "results", title: "Results | نتائج" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerVideoUrl: HOW_IT_WORKS_VIDEO_URL });
        addInboxMessage(from, "bot", buildHowItWorksBody(profileName), "Details Video Header", incomingPhoneNumberId, { customerName: profileName, messageType: "Details Video Header" });
        return res.sendStatus(200);
      }
'''
new_details = '''      if (iconicIsHowItWorksRoute) {
        await sendWhatsAppVideoByLink(from, HOW_IT_WORKS_VIDEO_URL, "", incomingPhoneNumberId);
        await sendWhatsAppButtonMessage(from, buildHowItWorksBody(profileName), [
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "results", title: "Results | نتائج" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildHowItWorksBody(profileName), "Details Safe Fallback", incomingPhoneNumberId, { customerName: profileName, messageType: "Details Safe Fallback" });
        return res.sendStatus(200);
      }
'''
s = replace_once(s, old_details, new_details, 'Details fallback route')

checks = [
    'iconic-team-inbox-v31-5-8-60-3-0-3-safe-video-fallback',
    'await sendWhatsAppVideoByLink(from, RESULTS_VIDEO_URL, "", incomingPhoneNumberId);',
    'await sendWhatsAppVideoByLink(from, HOW_IT_WORKS_VIDEO_URL, "", incomingPhoneNumberId);',
    'Results Safe Fallback',
    'Details Safe Fallback',
    '{ id: "how_it_works", title: "Details | التفاصيل" }',
    '{ id: "booking_menu", title: "Booking | حجز" }',
    '{ id: "talk_to_team", title: "Team | فريقنا" }'
]
for item in checks:
    if item not in s:
        raise SystemExit('[V60.3.0.3] check missing: ' + item)

p.write_text(s)
print('[V60.3.0.3] safe fallback patch applied successfully')
