# Meta DM Current Working State

## Current confirmed scope
- Area: Instagram + Messenger only.
- File: `meta-dm/server.js`.
- Render service: `iconic-meta-dm`.
- Version endpoint: `https://iconic-meta-dm.onrender.com/api/version`.
- WhatsApp main app file `server.js` must not be touched for Meta DM reply changes unless explicitly requested.
- Team Inbox for Meta DM is not currently enabled.
- Customer smart-name lookup is not enabled because the previous attempt stopped replies.

## Current accepted working version
- Latest stable Meta DM branch-sender version tested in logs: `iconic-meta-dm-v1-smart-language-branch-sender-v1`.
- A later typing-indicator experiment was tested, but Instagram did not visibly show typing; do not treat typing as a required feature.
- Video upload can fail on Instagram because of attachment upload or file-size limits. This is acceptable if the bot sends the video URL fallback.

## Confirmed features
- Instagram webhook is working.
- Messenger is configured.
- If real Instagram DMs stop reaching Render while Meta webhook Test still reaches Render, fix by toggling Instagram API account Webhook Subscription OFF, wait about 10 seconds, then ON.
- Main menu supports smart language mode: Arabic customer input gets Arabic replies/buttons; English customer input gets English replies/buttons.
- Services menu includes Results, Details, Location, and Consult.
- Results and Details send text plus video behavior; if Instagram rejects video upload, sending the link is acceptable.
- Location flow is fixed: choosing Dubai or Abu Dhabi after Location returns the branch location once and does not loop back to branch selection.
- Service flow is branch-aware: customer chooses branch first, then specialists are shown by branch.

## Staff by branch
- Dubai service specialists: Ahmad, Wael, Tamer, Bashir, Emad, Hamouda, Ani, Omar.
- Abu Dhabi service specialists: Adham, Osama.

## Staff notification routing
- Dubai booking notification sends from Dubai WhatsApp Phone Number ID `1100042333191350` to Dubai staff number `971503424811`.
- Abu Dhabi booking notification sends from Abu Dhabi WhatsApp Phone Number ID `1000146433192239` to Abu Dhabi staff number `971503750616`.
- Required Render ENV values on `iconic-meta-dm`:
  - `STAFF_WHATSAPP_TOKEN`
  - `DUBAI_STAFF_NOTIFY_PHONE_NUMBER_ID=1100042333191350`
  - `ABU_DHABI_STAFF_NOTIFY_PHONE_NUMBER_ID=1000146433192239`
  - `DUBAI_STAFF_NUMBER=971503424811`
  - `ABU_DHABI_STAFF_NUMBER=971503750616`

## Staff notification delivery rule
- WhatsApp text notifications work only inside the 24-hour window.
- If a staff notification fails with WhatsApp error `131047` / `Re-engagement message`, it means more than 24 hours passed since that staff member last messaged that branch number.
- Current low-cost workaround: each staff member sends `0` once daily to their branch WhatsApp number:
  - Dubai staff sends `0` to Dubai branch WhatsApp.
  - Abu Dhabi staff sends `0` to Abu Dhabi branch WhatsApp.
- Do not create paid staff alert templates unless explicitly approved later.

## Known log meanings
- `[Staff Notify] sent from ... to ... messageId=wamid...` means WhatsApp API accepted the message.
- Accepted with a `wamid` is not the same as delivered; check WhatsApp webhook statuses if delivery is unclear.
- `131047 Re-engagement message` means the 24-hour window is closed.
- `Attachment upload failed` or Instagram attachment-size errors mean Instagram rejected media upload; video link fallback is acceptable.

## Current next-step rules
- Any further reply changes should be small and tested immediately with real Instagram DM.
- Preserve current routing and branch notification logic.
- Do not reintroduce Meta DM Team Inbox, smart-name lookup, or typing indicator unless explicitly requested.
