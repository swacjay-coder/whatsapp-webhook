# Iconic Hair Care Team Inbox - Project Memory V60.1

Last updated: 2026-05-10

## Current active live base

Current active base after today's work:

```txt
V31.5.8.60.1
iconic-team-inbox-v31-5-8-60-1-fix-flow-staff-notification-routing
```

Version check URL:

```txt
https://whatsapp-webhook-g0c5.onrender.com/api/version
```

Render service:

```txt
whatsapp-webhook-g0c5
```

Render public URL:

```txt
https://whatsapp-webhook-g0c5.onrender.com
```

GitHub repo:

```txt
https://github.com/iconichaircare7-dot/whatsapp-webhook
```

## Critical do-not-touch note

These settings and variables are now confirmed working. Do not change them unless Osama explicitly asks:

```txt
DUBAI_STAFF_NUMBER=971503424811
ABU_DHABI_STAFF_NUMBER=<current Abu Dhabi staff number in Render ENV>
ICONIC_CONSULTATION_FLOW_ID_DUBAI=1607726336999909
ICONIC_CONSULTATION_FLOW_ID_ABU_DHABI=1648749433033956
ICONIC_SERVICE_BOOKING_FLOW_ID_DUBAI=1707428933768266
ICONIC_SERVICE_BOOKING_FLOW_ID_ABU_DHABI=986634320965936
```

Important:

```txt
Dubai staff notification tested and confirmed delivered to 971503424811.
Abu Dhabi staff notification tested and confirmed delivered to Abu Dhabi staff.
Do not replace DUBAI_STAFF_NUMBER back to 971569979163 unless retested and confirmed delivered/read.
```

Old Dubai staff number issue:

```txt
971569979163 received outbound failures from WhatsApp Cloud API with error code 131000 / Something went wrong.
This number should not be used as the active Dubai staff notification recipient for now.
```

## V60.1 final status

V60.1 fixed Flow staff notification routing by passing the real display phone number from the webhook metadata into the Flow submit handler and then into `notifyStaffAboutFlowBooking`.

Confirmed V60.1 commit:

```txt
8dcb58a93794d736d22f1ab6557555fe1198061b
Apply V60.1 staff notify routing fix
```

Confirmed deploy trigger:

```txt
dcaef4c7f161eff68061532ef3267fe0786b5a6c
Trigger Render deploy for V60.1 staff notify fix
```

After changing Dubai staff ENV to 971503424811, Render deploy was triggered:

```txt
e08fa0436c604074b2130ababfa705c4cf5f7f16
Trigger Render deploy after Dubai staff number change
```

## V60 purpose and behavior

V60/V60.1 includes:

```txt
1. Direct consultation intent opens Consultation Flow immediately.
2. Direct service intent opens Service Booking Flow immediately.
3. General booking intent sends only two buttons:
   Book Service | سيرفس
   Consult | استشارة
4. Customer name and phone are added to WhatsApp Flow booking request messages.
5. Flow submissions save to Team Inbox and Google Sheet.
6. Flow submissions send staff notifications by branch.
7. Dubai staff notification routes to DUBAI_STAFF_NUMBER.
8. Abu Dhabi staff notification routes to ABU_DHABI_STAFF_NUMBER.
9. Multiple staff numbers are supported if comma-separated.
10. Resume bot command exists:
    تشغيل البوت
    resume bot
```

## Working staff notification variables

Dubai:

```txt
DUBAI_STAFF_NUMBER=971503424811
```

Abu Dhabi:

```txt
ABU_DHABI_STAFF_NUMBER=<keep current Render ENV value; tested and working>
```

If more than one staff recipient is needed later, use comma-separated numbers without spaces:

```txt
DUBAI_STAFF_NUMBER=971503424811,9715XXXXXXX
ABU_DHABI_STAFF_NUMBER=9715YYYYYYY,9715ZZZZZZZ
```

Number format must be:

```txt
9715XXXXXXXX
```

No plus sign and no spaces.

## Flow IDs and branch mapping

Dubai phone number:

```txt
Dubai display number: 97143963333
Dubai phone_number_id: 1100042333191350
```

Abu Dhabi phone number:

```txt
Abu Dhabi display number: 97125622778
Abu Dhabi phone_number_id: 1000146433192239
```

Dubai Consultation Flow:

```txt
ICONIC_CONSULTATION_FLOW_ID_DUBAI=1607726336999909
Screen: CONSULTATION_BOOKING
Branch payload: Dubai
Dynamic Today time options through endpoint
```

Abu Dhabi Consultation Flow:

```txt
ICONIC_CONSULTATION_FLOW_ID_ABU_DHABI=1648749433033956
Screen: CONSULTATION_BOOKING
Branch payload: Abu Dhabi
No Today dynamic logic in Abu Dhabi static Flow
```

Dubai Service Booking Flow:

```txt
ICONIC_SERVICE_BOOKING_FLOW_ID_DUBAI=1707428933768266
```

Abu Dhabi Service Booking Flow:

```txt
ICONIC_SERVICE_BOOKING_FLOW_ID_ABU_DHABI=986634320965936
```

Correct Abu Dhabi Service ENV name:

```txt
ICONIC_SERVICE_BOOKING_FLOW_ID_ABU_DHABI
```

Do not use wrong name:

```txt
ICONIC_SERVICE_BOOKING_FLOWID_ABU_DHABI
```

## Abu Dhabi Consultation Flow JSON reference

Abu Dhabi Consultation Flow must follow Dubai's structure/version style:

```txt
version: 7.2
data_api_version: 3.0
routing_model: { CONSULTATION_BOOKING: [] }
screen id: CONSULTATION_BOOKING
title: Abu Dhabi Consultation
branch payload: Abu Dhabi
preferred_day: tomorrow, day_after_tomorrow
preferred_time: static list
consultation_type: same as Dubai
no branch dropdown shown to customer
```

The accepted final Abu Dhabi Flow direction:

```txt
Use the same structure as Dubai Consultation Flow.
Remove Today.
Remove dynamic data_exchange.
Use static preferred_time data-source.
Do not show Branch to customer.
Include branch: Abu Dhabi in complete payload.
Include request_type: Consultation Booking in complete payload.
```

## Render/GitHub deployment workflow

Render Deploy Hook is saved as GitHub Actions secret:

```txt
RENDER_DEPLOY_HOOK
```

GitHub workflow:

```txt
.github/workflows/render-deploy.yml
```

Trigger file:

```txt
.render-deploy-trigger.txt
```

To deploy without entering Render:

```txt
Update .render-deploy-trigger.txt
GitHub Action Deploy to Render runs
Render deploy starts
Verify /api/version
```

## Current package start command

Current start command in package.json:

```txt
node --check server.js && node server.js
```

Do not revert this to old v59/v60 patch command unless intentionally rolling back.

## Future edit rule

For future code changes:

```txt
Do not ask Osama to download/upload full server.js manually.
Use GitHub workflow / helper script / patch approach.
Run node --check server.js before deploy.
Trigger Render deploy through GitHub Action.
Verify /api/version after deploy.
```

## Do not touch without explicit request

Do not change these unless explicitly requested:

```txt
/api/wake
/api/reminders/preview
/api/reminders/send-due
FOLLOW_UP_DELAY_DAYS
FOLLOW_UP_TEMPLATE_NAME_DUBAI
FOLLOW_UP_TEMPLATE_NAME_ABU_DHABI
cron-job
opt-in / opt-out
Google Sheets reminder logic
Flyksoft
Service Flow structure
Dubai Consultation Flow dynamic behavior
staff notification ENV variables
```

## Testing checklist after deploy

After deploy check:

```txt
https://whatsapp-webhook-g0c5.onrender.com/api/version
```

Expected currently:

```txt
iconic-team-inbox-v31-5-8-60-1-fix-flow-staff-notification-routing
```

WhatsApp tests:

```txt
1. Send: استشارة
Expected: Consultation Flow opens directly.

2. Send: سيرفس
Expected: Service Flow opens directly.

3. Send: حجز موعد
Expected: bot sends two buttons only:
Book Service | سيرفس
Consult | استشارة

4. Press Team | فريقنا
Expected: final handoff message is sent, then bot pauses.

5. Send: تشغيل البوت or resume bot
Expected: Bot Active confirmation.

6. Submit Dubai Flow from a customer number
Expected: Team Inbox + Google Sheet + notification to 971503424811.

7. Submit Abu Dhabi Flow from a customer number
Expected: Team Inbox + Google Sheet + notification to Abu Dhabi staff.
```

## Important operational note

Testing from staff numbers can confuse conversation states and staff notification tests. Prefer using a non-staff customer number for Flow tests.

If testing old staff number 971569979163, verify WhatsApp delivery status first. Previously it failed outbound delivery with:

```txt
code: 131000
Something went wrong
```
