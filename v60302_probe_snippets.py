from pathlib import Path

p = Path('server.js')
s = p.read_text()

OLD_VERSION = 'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-0-4-nonblocking-video-buttons";'
NEW_VERSION = 'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-0-5-results-details-buttons-only";'

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('[V60.3.0.5] ' + label + ' expected 1, found ' + str(count))
    return text.replace(old, new, 1)

s = replace_once(s, OLD_VERSION, NEW_VERSION, 'BOT_VERSION')

old_results = '''      if (iconicIsResultsRoute) {
        try {
          await sendWhatsAppVideoByLink(from, RESULTS_VIDEO_URL, "", incomingPhoneNumberId);
        } catch (error) {
          console.error("Results video send failed, continuing with buttons:", error);
        }
        await sendWhatsAppButtonMessage(from, buildResultsFollowupBody(profileName), [
          { id: "how_it_works", title: "Details | التفاصيل" },
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildResultsFollowupBody(profileName), "Results Nonblocking Video", incomingPhoneNumberId, { customerName: profileName, messageType: "Results Nonblocking Video" });
        return res.sendStatus(200);
      }
'''
new_results = '''      if (iconicIsResultsRoute) {
        await sendWhatsAppButtonMessage(from, buildResultsFollowupBody(profileName), [
          { id: "how_it_works", title: "Details | التفاصيل" },
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildResultsFollowupBody(profileName), "Results Buttons Only", incomingPhoneNumberId, { customerName: profileName, messageType: "Results Buttons Only" });
        return res.sendStatus(200);
      }
'''
s = replace_once(s, old_results, new_results, 'Results buttons-only route')

old_details = '''      if (iconicIsHowItWorksRoute) {
        try {
          await sendWhatsAppVideoByLink(from, HOW_IT_WORKS_VIDEO_URL, "", incomingPhoneNumberId);
        } catch (error) {
          console.error("Details video send failed, continuing with buttons:", error);
        }
        await sendWhatsAppButtonMessage(from, buildHowItWorksBody(profileName), [
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "results", title: "Results | نتائج" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildHowItWorksBody(profileName), "Details Nonblocking Video", incomingPhoneNumberId, { customerName: profileName, messageType: "Details Nonblocking Video" });
        return res.sendStatus(200);
      }
'''
new_details = '''      if (iconicIsHowItWorksRoute) {
        await sendWhatsAppButtonMessage(from, buildHowItWorksBody(profileName), [
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "results", title: "Results | نتائج" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildHowItWorksBody(profileName), "Details Buttons Only", incomingPhoneNumberId, { customerName: profileName, messageType: "Details Buttons Only" });
        return res.sendStatus(200);
      }
'''
s = replace_once(s, old_details, new_details, 'Details buttons-only route')

checks = [
    'iconic-team-inbox-v31-5-8-60-3-0-5-results-details-buttons-only',
    'Results Buttons Only',
    'Details Buttons Only',
    '{ id: "how_it_works", title: "Details | التفاصيل" }',
    '{ id: "booking_menu", title: "Booking | حجز" }',
    '{ id: "talk_to_team", title: "Team | فريقنا" }'
]
for item in checks:
    if item not in s:
        raise SystemExit('[V60.3.0.5] check missing: ' + item)

if 'Results video send failed, continuing with buttons' in s:
    raise SystemExit('[V60.3.0.5] old Results video fallback still present')
if 'Details video send failed, continuing with buttons' in s:
    raise SystemExit('[V60.3.0.5] old Details video fallback still present')

p.write_text(s)
print('[V60.3.0.5] results/details buttons-only emergency patch applied successfully')
