from pathlib import Path
import json

server_path = Path("server.js")
s = server_path.read_text()


def replace_once(label, old, new):
    global s
    if new in s:
        print(f"[V60.1] {label}: already applied")
        return
    if old not in s:
        raise SystemExit(f"[V60.1] missing block: {label}")
    s = s.replace(old, new, 1)
    print(f"[V60.1] {label}: applied")

replace_once(
    "version",
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-flow-customer-name-staff-notifications-and-resume-bot";',
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-1-fix-flow-staff-notification-routing";'
)

replace_once(
    "handler param displayPhoneNumber",
    '''async function handleWhatsAppFlowBookingSubmit({
  from,
  message,
  incomingPhoneNumberId,
  lineConfig,
  profileName
}) {''',
    '''async function handleWhatsAppFlowBookingSubmit({
  from,
  message,
  incomingPhoneNumberId,
  lineConfig,
  profileName,
  displayPhoneNumber = ""
}) {'''
)

replace_once(
    "notify call display phone",
    '''  notifyStaffAboutFlowBooking(flowData, from, incomingPhoneNumberId, "").catch((error) => {
    console.log("Staff booking notification failed:");
    console.log(error);
  });''',
    '''  console.log("[Staff Booking Notify] preparing", {
    branch: selectedBranch,
    phoneNumberId: incomingPhoneNumberId,
    displayPhoneNumber,
    customerPhone: from,
    customerName: flowData.customerName || profileName || ""
  });

  notifyStaffAboutFlowBooking(flowData, from, incomingPhoneNumberId, displayPhoneNumber || "").catch((error) => {
    console.log("Staff booking notification failed:");
    console.log(error);
  });'''
)

replace_once(
    "call site display phone",
    '''      profileName
    });''',
    '''      profileName,
      displayPhoneNumber: value?.metadata?.display_phone_number || ""
    });'''
)

server_path.write_text(s)

pkg_path = Path("package.json")
pkg = json.loads(pkg_path.read_text())
pkg["scripts"]["start"] = "node --check server.js && node server.js"
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + "\n")

print("[V60.1] flow staff notify routing fix finished")
