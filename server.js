const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const STAFF_NUMBER = process.env.STAFF_NUMBER;

/* حساب وقت دبي */
function getDubaiHour() {
  const now = new Date();

  const dubaiTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Dubai" })
  );

  return dubaiTime.getHours();
}

/* إرسال رسالة واتساب */
async function sendWhatsAppMessage(to, body) {
  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    console.log("WhatsApp API send failed:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("WhatsApp message sent successfully:");
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

/* تحقق من Webhook */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* استقبال الرسائل */
app.post('/webhook', async (req, res) => {
  console.log("New webhook payload:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const message =
      req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = (message.text?.body || "")
      .toLowerCase()
      .trim();

    const hour = getDubaiHour();

    console.log("Dubai hour:", hour);

    let replyText = "";

    /* خارج أوقات العمل - توقيت دبي */
    if (hour < 10 || hour >= 19) {
      replyText =
        "شكراً لتواصلك مع Iconic Hair Care ✨\n\n" +
        "يسعدنا خدمتك خلال ساعات العمل:\n" +
        "من 10:00 صباحاً حتى 7:00 مساءً\n\n" +
        "تم استلام رسالتك، وسيقوم فريقنا بالرد عليك في أقرب وقت خلال أوقات العمل.\n\n" +
        "------------------------------\n\n" +
        "Thank you for contacting Iconic Hair Care ✨\n\n" +
        "We are available during our working hours:\n" +
        "10:00 AM to 7:00 PM\n\n" +
        "Your message has been received, and our team will get back to you as soon as possible during working hours.";
    }

    /* 1 — طلب استشارة */
    else if (text === "1") {
      replyText =
        "تم استلام طلب الاستشارة الخاص بك ✅\n\n" +
        "سيقوم أحد أعضاء فريقنا بالتواصل معك قريباً لمساعدتك بشكل مناسب.\n\n" +
        "------------------------------\n\n" +
        "Your consultation request has been received ✅\n\n" +
        "One of our team members will contact you shortly to assist you.";
    }

    /* 6 — التحدث مع موظف */
    else if (text === "6") {
      replyText =
        "تم استلام طلبك بنجاح ✅\n\n" +
        "سيتم تحويل طلبك إلى أحد موظفينا، وسنتواصل معك في أقرب وقت ممكن.\n\n" +
        "------------------------------\n\n" +
        "Your request has been received successfully ✅\n\n" +
        "It has been forwarded to one of our staff members, and we will contact you as soon as possible.";
    }

    /* 5 — المواقع */
    else if (
      text === "5" ||
      text.includes("location") ||
      text.includes("موقع")
    ) {
      replyText =
        "فروع Iconic Hair Care:\n\n" +
        "دبي:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
        "أبوظبي:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi\n\n" +
        "ساعات العمل:\n" +
        "10:00 صباحاً إلى 7:00 مساءً\n\n" +
        "------------------------------\n\n" +
        "Iconic Hair Care Branches:\n\n" +
        "Dubai:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
        "Abu Dhabi:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi\n\n" +
        "Working Hours:\n" +
        "10:00 AM to 7:00 PM";
    }

    /* الأسعار */
    else if (
      text.includes("price") ||
      text.includes("prices") ||
      text.includes("cost") ||
      text.includes("سعر") ||
      text.includes("الاسعار")
    ) {
      replyText =
        "تختلف الأسعار حسب نوع الخدمة والحالة المطلوبة.\n\n" +
        "يسعدنا مساعدتك في اختيار الخدمة المناسبة لك.\n\n" +
        "يرجى اختيار أحد الخيارات التالية:\n\n" +
        "1️⃣ طلب استشارة\n" +
        "6️⃣ التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "Prices vary depending on the service and your specific needs.\n\n" +
        "We will be happy to help you choose the most suitable service.\n\n" +
        "Please select one of the following options:\n\n" +
        "1️⃣ Consultation\n" +
        "6️⃣ Talk to Staff";
    }

    /* القائمة الرئيسية */
    else {
      replyText =
        "مرحباً بك في Iconic Hair Care ✨\n\n" +
        "يسعدنا خدمتك ومساعدتك في اختيار الأنسب لك.\n\n" +
        "يرجى اختيار أحد الخيارات التالية:\n\n" +
        "1️⃣ طلب استشارة\n" +
        "5️⃣ المواقع وساعات العمل\n" +
        "6️⃣ التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "Welcome to Iconic Hair Care ✨\n\n" +
        "We are delighted to assist you and help you choose the best option for your needs.\n\n" +
        "Please select one of the following options:\n\n" +
        "1️⃣ Consultation\n" +
        "5️⃣ Locations and Working Hours\n" +
        "6️⃣ Talk to Staff";
    }

    /* إرسال الرد للعميل */
    await sendWhatsAppMessage(from, replyText);

    /* إشعار الموظف */
    if (text === "1" || text === "6") {
      try {
        const staffBody =
          text === "1"
            ? "طلب استشارة جديد\n\n" +
              "رقم العميل:\n" +
              from +
              "\n\n" +
              "يرجى التواصل مع العميل في أقرب وقت.\n\n" +
              "------------------------------\n\n" +
              "New Consultation Request\n\n" +
              "Customer Number:\n" +
              from
            : "طلب تواصل مباشر مع موظف\n\n" +
              "رقم العميل:\n" +
              from +
              "\n\n" +
              "العميل يرغب بالتحدث مع أحد الموظفين.\n\n" +
              "------------------------------\n\n" +
              "Direct Staff Request\n\n" +
              "Customer Number:\n" +
              from;

        await sendWhatsAppMessage(STAFF_NUMBER, staffBody);
      } catch (staffError) {
        console.log("Staff notification failed:");
        console.log(staffError);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error handling webhook:");
    console.error(error);

    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
