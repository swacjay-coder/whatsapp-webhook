const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const STAFF_NUMBER = process.env.STAFF_NUMBER;

const BUSINESS_NAME_SPACED = "I C O N I C   H A I R   C A R E";
const BUSINESS_NAME = "Iconic Hair Care";
const CALL_NUMBER = "+971 4 396 3333";
const WEBSITE = "https://iconichaircare.com";

/* حساب توقيت دبي */
function getDubaiHour() {
  const now = new Date();

  const dubaiTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Dubai" })
  );

  return dubaiTime.getHours();
}

/* توحيد بعض المدخلات */
function normalizeText(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .trim();
}

/* إرسال رسالة واتساب */
async function sendWhatsAppMessage(to, body) {
  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body
    }
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
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* استقبال الرسائل */
app.post("/webhook", async (req, res) => {
  console.log("New webhook payload:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const message =
      req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;

    let text = "";

    if (message.type === "text") {
      text = normalizeText(message.text?.body);
    }

    if (!text) {
      text = "";
    }

    const hour = getDubaiHour();
    console.log("Dubai hour:", hour);

    let replyText = "";

    /* خارج أوقات العمل */
    if (hour < 10 || hour >= 19) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "شكراً لتواصلك معنا.\n\n" +
        "تم استلام رسالتك بنجاح، وسيقوم فريقنا بالرد عليك في أقرب وقت خلال ساعات العمل.\n\n" +
        "ساعات العمل:\n" +
        "10:00 صباحاً إلى 7:00 مساءً\n\n" +
        `📞 للاتصال المباشر:\n${CALL_NUMBER}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Thank you for contacting us.\n\n" +
        "Your message has been received successfully, and our team will get back to you as soon as possible during working hours.\n\n" +
        "Working hours:\n" +
        "10:00 AM to 7:00 PM\n\n" +
        `📞 Direct call:\n${CALL_NUMBER}`;
    }

    /* 1 — حجز استشارة */
    else if (text === "1" || text === "١") {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تم استلام طلب الاستشارة الخاص بك ✅\n\n" +
        "سيقوم أحد أعضاء فريقنا بالتواصل معك قريباً لمعرفة التفاصيل ومساعدتك في اختيار الخدمة الأنسب.\n\n" +
        `📞 للاتصال المباشر:\n${CALL_NUMBER}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Your consultation request has been received ✅\n\n" +
        "One of our team members will contact you shortly to understand your needs and guide you to the most suitable service.\n\n" +
        `📞 Direct call:\n${CALL_NUMBER}`;
    }

    /* 2 — الخدمات */
    else if (
      text === "2" ||
      text === "٢" ||
      text.includes("service") ||
      text.includes("services") ||
      text.includes("خدمات") ||
      text.includes("الخدمات")
    ) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "نقدم في Iconic Hair Care حلولاً مخصصة للعناية بالشعر حسب الحالة والاحتياج.\n\n" +
        "من خدماتنا:\n" +
        "• استشارات الشعر وفروة الرأس\n" +
        "• حلول التكثيف ومظهر الشعر الطبيعي\n" +
        "• عناية مخصصة حسب الحالة\n" +
        "• متابعة وتوجيه من فريق مختص\n\n" +
        "للمساعدة بشكل أدق، اختر:\n\n" +
        "1️⃣ حجز استشارة\n" +
        "6️⃣ التحدث مع أحد أعضاء الفريق\n\n" +
        `📞 للاتصال المباشر:\n${CALL_NUMBER}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "At Iconic Hair Care, we provide personalized hair care solutions based on your needs.\n\n" +
        "Our services include:\n" +
        "• Hair and scalp consultation\n" +
        "• Natural-looking hair volume solutions\n" +
        "• Personalized hair care guidance\n" +
        "• Professional support from our team\n\n" +
        "For better assistance, please choose:\n\n" +
        "1️⃣ Book a consultation\n" +
        "6️⃣ Talk to our team\n\n" +
        `📞 Direct call:\n${CALL_NUMBER}`;
    }

    /* 3 — الأسعار والعروض */
    else if (
      text === "3" ||
      text === "٣" ||
      text.includes("price") ||
      text.includes("prices") ||
      text.includes("cost") ||
      text.includes("offer") ||
      text.includes("offers") ||
      text.includes("سعر") ||
      text.includes("الاسعار") ||
      text.includes("الأسعار") ||
      text.includes("عرض") ||
      text.includes("عروض")
    ) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تختلف الأسعار حسب نوع الخدمة والحالة المطلوبة.\n\n" +
        "لذلك ننصح بحجز استشارة قصيرة حتى يستطيع فريقنا توجيهك للخيار الأنسب وتوضيح التفاصيل بدقة.\n\n" +
        "اختر:\n" +
        "1️⃣ حجز استشارة\n" +
        "6️⃣ التحدث مع أحد أعضاء الفريق\n\n" +
        `📞 للاتصال المباشر:\n${CALL_NUMBER}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Prices vary depending on the service and your specific needs.\n\n" +
        "We recommend booking a short consultation so our team can guide you to the most suitable option and explain the details clearly.\n\n" +
        "Please choose:\n" +
        "1️⃣ Book a consultation\n" +
        "6️⃣ Talk to our team\n\n" +
        `📞 Direct call:\n${CALL_NUMBER}`;
    }

    /* 4 — صور ونتائج */
    else if (
      text === "4" ||
      text === "٤" ||
      text.includes("before") ||
      text.includes("after") ||
      text.includes("results") ||
      text.includes("نتائج") ||
      text.includes("صور") ||
      text.includes("قبل") ||
      text.includes("بعد")
    ) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "يمكن لفريقنا مشاركة التفاصيل المناسبة والنتائج المتاحة حسب نوع الخدمة المطلوبة.\n\n" +
        "للحصول على توجيه أدق، اختر:\n\n" +
        "1️⃣ حجز استشارة\n" +
        "6️⃣ التحدث مع أحد أعضاء الفريق\n\n" +
        `📞 للاتصال المباشر:\n${CALL_NUMBER}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Our team can share suitable details and available results based on the service you are interested in.\n\n" +
        "For better guidance, please choose:\n\n" +
        "1️⃣ Book a consultation\n" +
        "6️⃣ Talk to our team\n\n" +
        `📞 Direct call:\n${CALL_NUMBER}`;
    }

    /* 5 — المواقع وساعات العمل */
    else if (
      text === "5" ||
      text === "٥" ||
      text.includes("location") ||
      text.includes("locations") ||
      text.includes("map") ||
      text.includes("موقع") ||
      text.includes("الموقع") ||
      text.includes("فرع") ||
      text.includes("فروع")
    ) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "فروع Iconic Hair Care:\n\n" +
        "دبي:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
        "أبوظبي:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi\n\n" +
        "ساعات العمل:\n" +
        "10:00 صباحاً إلى 7:00 مساءً\n\n" +
        `📞 للاتصال المباشر:\n${CALL_NUMBER}\n\n` +
        `الموقع الرسمي:\n${WEBSITE}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Iconic Hair Care branches:\n\n" +
        "Dubai:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
        "Abu Dhabi:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi\n\n" +
        "Working hours:\n" +
        "10:00 AM to 7:00 PM\n\n" +
        `📞 Direct call:\n${CALL_NUMBER}\n\n` +
        `Website:\n${WEBSITE}`;
    }

    /* 6 — التحدث مع موظف */
    else if (text === "6" || text === "٦") {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تم استلام طلبك بنجاح ✅\n\n" +
        "سيتم تحويل طلبك إلى أحد أعضاء فريقنا، وسنتواصل معك في أقرب وقت ممكن.\n\n" +
        `📞 للاتصال المباشر:\n${CALL_NUMBER}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Your request has been received successfully ✅\n\n" +
        "Your request has been forwarded to our team, and we will contact you as soon as possible.\n\n" +
        `📞 Direct call:\n${CALL_NUMBER}`;
    }

    /* القائمة الرئيسية */
    else {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "مرحباً بك في Iconic Hair Care.\n\n" +
        "يسعدنا مساعدتك واختيار الخدمة الأنسب لك حسب حالتك واحتياجك.\n\n" +
        "يرجى اختيار الرقم المناسب:\n\n" +
        "1️⃣ حجز استشارة\n" +
        "2️⃣ خدمات الشعر والتكثيف\n" +
        "3️⃣ الأسعار والعروض\n" +
        "4️⃣ صور ونتائج قبل/بعد\n" +
        "5️⃣ الموقع وساعات العمل\n" +
        "6️⃣ التحدث مع أحد أعضاء الفريق\n\n" +
        `📞 للاتصال المباشر:\n${CALL_NUMBER}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Welcome to Iconic Hair Care.\n\n" +
        "We’ll be happy to assist you and guide you to the most suitable service based on your needs.\n\n" +
        "Please choose one of the following options:\n\n" +
        "1️⃣ Book a consultation\n" +
        "2️⃣ Hair care & hair volume services\n" +
        "3️⃣ Prices and offers\n" +
        "4️⃣ Before / after results\n" +
        "5️⃣ Location and working hours\n" +
        "6️⃣ Talk to our team\n\n" +
        `📞 Direct call:\n${CALL_NUMBER}`;
    }

    /* إرسال الرد للعميل */
    await sendWhatsAppMessage(from, replyText);

    /* إشعار الموظف عند طلب استشارة أو موظف */
    if (text === "1" || text === "١" || text === "6" || text === "٦") {
      try {
        const staffBody =
          text === "1" || text === "١"
            ? "طلب استشارة جديد من واتساب\n\n" +
              "رقم العميل:\n" +
              from +
              "\n\n" +
              "يرجى التواصل مع العميل في أقرب وقت.\n\n" +
              "------------------------------\n\n" +
              "New WhatsApp Consultation Request\n\n" +
              "Customer Number:\n" +
              from
            : "طلب تواصل مباشر مع موظف من واتساب\n\n" +
              "رقم العميل:\n" +
              from +
              "\n\n" +
              "العميل يرغب بالتحدث مع أحد أعضاء الفريق.\n\n" +
              "------------------------------\n\n" +
              "Direct Staff Request from WhatsApp\n\n" +
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
