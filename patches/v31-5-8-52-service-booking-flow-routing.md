# V31.5.8.52 Service Booking Flow Routing

This patch note locks the first implementation scope for the new Service Booking Flow.

## Goal

Route `Book Service | سيرفس` to the dedicated Service Booking Flow ID instead of the consultation booking Flow.

## New Render ENV

```text
ICONIC_SERVICE_BOOKING_FLOW_ID=1707428933768266
```

## Must remain untouched

- `/api/wake`
- reminders
- cron-job
- opt-in / opt-out
- Google Sheets reminder logic
- Flyksoft

## Required code changes in `server.js`

### 1. Add Service Booking Flow constant near the existing booking Flow constants

```js
const ICONIC_SERVICE_BOOKING_FLOW_ID = (
  process.env.ICONIC_SERVICE_BOOKING_FLOW_ID ||
  process.env.SERVICE_BOOKING_FLOW_ID ||
  "1707428933768266"
).toString().trim();

const ICONIC_SERVICE_BOOKING_FLOW_TOKEN_PREFIX = (
  process.env.ICONIC_SERVICE_BOOKING_FLOW_TOKEN_PREFIX ||
  process.env.SERVICE_BOOKING_FLOW_TOKEN_PREFIX ||
  "iconic_service_booking_flow"
).toString().trim();
```

### 2. Add a Service Flow config helper

```js
function getServiceBookingFlowConfigForLine(phoneNumberId, displayPhoneNumber = "") {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const lineConfig = getLineConfig(finalPhoneNumberId, displayPhoneNumber);

  return {
    branch: lineConfig.branch,
    phoneNumberId: finalPhoneNumberId || DUBAI_PHONE_NUMBER_ID,
    flowId: ICONIC_SERVICE_BOOKING_FLOW_ID,
    tokenPrefix: ICONIC_SERVICE_BOOKING_FLOW_TOKEN_PREFIX,
    envName: "ICONIC_SERVICE_BOOKING_FLOW_ID",
    requestType: "Service Appointment"
  };
}
```

### 3. Route `Book Service | سيرفس` to the Service Flow

When incoming interactive text/button title matches:

```text
Book Service | سيرفس
Book Service
سيرفس
Service
```

Send the WhatsApp Flow using `getServiceBookingFlowConfigForLine(...)` instead of the consultation Flow config.

### 4. Flow request metadata

The Flow token/action data should mark the request type as:

```text
Service Appointment
```

Suggested metadata:

```js
{
  requestType: "Service Appointment",
  source: "team_inbox_service_booking",
  selectedPath: "service_booking"
}
```

### 5. Service Booking Flow fields

Expected fields from the new Flow:

```text
Branch
Preferred Day
Preferred Time
Team Member
Service Type
Notes
```

### 6. Team Member options

Dubai:

```text
Mr. Ahmed
Tamer
Wael
Bashir
Omar
Emad
Ani
Any Available
```

Abu Dhabi:

```text
Adham
Osama
Any Available
```

### 7. Service Type options

```text
Fitting Appointment
Service
Follow-up Visit
Adjustment
Other
```

## Test path

```text
Booking | حجز
→ Service | سيرفس
→ Book Service | سيرفس
→ Service Booking Flow opens
→ Submit
→ Pending Service Appointment appears in Team Inbox
```
