const express = require("express");
const app = express();

app.use(express.json());

const BALE_API_BASE = "https://tapi.bale.ai/bot";
const BOT_TOKEN = process.env.BOT_TOKEN || "936952553:U5SKjMshs9aZ3lNCxZq9rHE7WGo6vqy25wU";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "";

// حافظه موقت در صورت عدم استفاده از دیتابیس خارجی
const userStates = new Map();
const trackingData = new Map();

const LABELS = {
  person_type: "نوع شخصیت",
  device_status: "وضعیت دستگاه",
  device_model: "مدل دستگاه",
  device_serial: "شماره سریال دستگاه",
  first_name: "نام",
  last_name: "نام خانوادگی",
  father_name: "نام پدر",
  national_id: "کد ملی",
  company_name: "نام شرکت / سازمان",
  ceo_first_name: "نام مدیرعامل",
  ceo_last_name: "نام خانوادگی مدیرعامل",
  ceo_national_id: "کد ملی مدیرعامل",
  company_national_id: "شناسه ملی شرکت / سازمان",
  mobile: "شماره همراه",
  phone: "شماره تلفن ثابت محل نصب",
  address: "آدرس دقیق محل نصب",
  postal_code: "کد پستی",
  terminal_id: "شماره ترمینال",
  old_owner_id: "کد ملی / شناسه ملی مالک فعلی",
  new_owner_name: "نام و نام خانوادگی مالک جدید",
  new_owner_mobile: "شماره همراه مالک جدید",
  support_subject: "موضوع پشتیبانی",
  support_desc: "شرح مشکل"
};

// مسیر اصلی تست
app.get("/", (req, res) => {
  res.send("Totan Bale Bot Service Active on Render");
});

// مسیر دریافت Webhook از بله
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    await handleUpdate(update);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(200).send("OK");
  }
});

async function handleUpdate(update) {
  const message = update.message;
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const text = message.text ? message.text.trim() : "";
  const photo = message.photo;
  const location = message.location;

  let userState = userStates.get(chatId) || { step: "IDLE", data: {} };

  if (text === "/start" || text === "لغو و بازگشت به منوی اصلی") {
    userStates.delete(chatId);
    return await sendMainMenu(chatId, "به ربات پشتیبانی و ثبت درخواست دستگاه‌های خودپرداز غیرنقد توتان خوش آمدید.\nلطفاً گزینه مورد نظر خود را انتخاب کنید:");
  }

  if (userState.step === "IDLE") {
    switch (text) {
      case "درخواست دستگاه جدید":
        userState.step = "NEW_REQ_PERSON_TYPE";
        userState.data = { flow: "NEW_REQUEST" };
        userStates.set(chatId, userState);
        return await sendKeyboard(chatId, "لطفاً نوع شخصیت خود را انتخاب کنید:", [
          ["حقیقی", "حقوقی"],
          ["لغو و بازگشت به منوی اصلی"]
        ]);

      case "تغییر مالکیت":
        userState.step = "TRANSFER_SERIAL";
        userState.data = { flow: "OWNERSHIP_TRANSFER" };
        userStates.set(chatId, userState);
        return await sendMessage(chatId, "لطفاً شماره سریال ۱۴ رقمی دستگاه فعلی را وارد کنید:");

      case "تمدید قرارداد":
        userState.step = "RENEWAL_SERIAL";
        userState.data = { flow: "CONTRACT_RENEWAL" };
        userStates.set(chatId, userState);
        return await sendMessage(chatId, "لطفاً شماره سریال ۱۴ رقمی دستگاه را وارد کنید:");

      case "پشتیبانی":
        userState.step = "SUPPORT_SERIAL";
        userState.data = { flow: "SUPPORT" };
        userStates.set(chatId, userState);
        return await sendMessage(chatId, "لطفاً شماره سریال دستگاه یا شماره ترمینال را وارد کنید:");

      case "پیگیری درخواست":
        userState.step = "TRACKING_INPUT";
        userState.data = { flow: "TRACKING" };
        userStates.set(chatId, userState);
        return await sendMessage(chatId, "لطفاً کد پیگیری (مثال: TOT-12345) یا کد ملی / شناسه ملی ثبت‌شده را وارد کنید:");

      case "سوالات متداول":
        return await sendMessage(chatId, "بخش سوالات متداول به‌زودی تکمیل می‌شود.\nدر صورت داشتن هرگونه سوال می‌توانید از بخش پشتیبانی اقدام کنید.");

      default:
        return await sendMainMenu(chatId, "لطفاً یکی از گزینه‌های منوی اصلی را انتخاب کنید:");
    }
  }

  await processStateMachine(chatId, text, photo, location, userState);
}

async function processStateMachine(chatId, text, photo, location, state) {
  const cancelBtn = [["لغو و بازگشت به منوی اصلی"]];

  if (text === "لغو و بازگشت به منوی اصلی") {
    userStates.delete(chatId);
    return await sendMainMenu(chatId, "عملیات لغو شد. به منوی اصلی بازگشتید.");
  }

  if (state.data.flow === "NEW_REQUEST") {
    switch (state.step) {
      case "NEW_REQ_PERSON_TYPE":
        if (!["حقیقی", "حقوقی"].includes(text)) return await sendMessage(chatId, "لطفاً فقط یکی از گزینه‌های «حقیقی» یا «حقوقی» را انتخاب کنید.");
        state.data.person_type = text;
        state.step = "NEW_REQ_DEVICE_STATUS";
        userStates.set(chatId, state);
        return await sendKeyboard(chatId, "وضعیت دستگاه را انتخاب کنید:", [
          ["قصد خرید دستگاه جدید دارم", "دستگاه دارم (فعال‌سازی)"],
          ...cancelBtn
        ]);

      case "NEW_REQ_DEVICE_STATUS":
        if (!["قصد خرید دستگاه جدید دارم", "دستگاه دارم (فعال‌سازی)"].includes(text)) return await sendMessage(chatId, "لطفاً یکی از گزینه‌های موجود را انتخاب کنید.");
        state.data.device_status = text;
        state.step = "NEW_REQ_DEVICE_MODEL";
        userStates.set(chatId, state);
        return await sendKeyboard(chatId, "مدل دستگاه را انتخاب کنید:", [
          ["iKushk50", "iKushk100"],
          ...cancelBtn
        ]);

      case "NEW_REQ_DEVICE_MODEL":
        if (!["iKushk50", "iKushk100"].includes(text)) return await sendMessage(chatId, "لطفاً مدل را دقیق انتخاب کنید.");
        state.data.device_model = text;
        if (state.data.device_status === "دستگاه دارم (فعال‌سازی)") {
          state.step = "NEW_REQ_SERIAL";
          userStates.set(chatId, state);
          return await sendMessage(chatId, "لطفاً شماره سریال ۱۴ رقمی دستگاه خود را وارد کنید:");
        } else {
          return await startFormFields(chatId, state);
        }

      case "NEW_REQ_SERIAL":
        if (!text || text.length < 5) return await sendMessage(chatId, "لطفاً شماره سریال معتبر وارد کنید.");
        state.data.device_serial = text;
        return await startFormFields(chatId, state);

      case "NEW_REQ_FIELDS":
        const currentField = state.data.fields[state.data.fieldIndex];
        state.data[currentField.key] = text;
        state.data.fieldIndex++;

        if (state.data.fieldIndex < state.data.fields.length) {
          userStates.set(chatId, state);
          const nextField = state.data.fields[state.data.fieldIndex];
          return await sendMessage(chatId, `لطفاً ${nextField.label} را وارد کنید:`);
        } else {
          delete state.data.fields;
          delete state.data.fieldIndex;
          state.step = "NEW_REQ_DOCS";
          state.data.docIndex = 0;
          state.data.docs = getRequiredDocs(state.data.person_type);
          state.data.uploadedDocs = {};
          userStates.set(chatId, state);
          const firstDoc = state.data.docs[0];
          return await sendMessage(chatId, `اطلاعات متنی ثبت شد.\nحالا لطفاً تصویر ${firstDoc.label} را ارسال کنید:`);
        }

      case "NEW_REQ_DOCS":
        const reqDoc = state.data.docs[state.data.docIndex];
        
        if (reqDoc.key === "location") {
          if (!location) return await sendMessage(chatId, "لطفاً موقعیت مکانی (Location) خود را ارسال کنید.");
          state.data.uploadedDocs[reqDoc.key] = { latitude: location.latitude, longitude: location.longitude };
        } else {
          if (!photo || photo.length === 0) return await sendMessage(chatId, `لطفاً تصویر ${reqDoc.label} را به‌صورت عکس ارسال کنید.`);
          state.data.uploadedDocs[reqDoc.key] = photo[photo.length - 1].file_id;
        }

        state.data.docIndex++;
        if (state.data.docIndex < state.data.docs.length) {
          userStates.set(chatId, state);
          const nextDoc = state.data.docs[state.data.docIndex];
          if (nextDoc.key === "location") {
            return await sendMessage(chatId, `لطفاً ${nextDoc.label} را از طریق گزینه ارسال Location ارسال کنید:`);
          }
          return await sendMessage(chatId, `لطفاً تصویر ${nextDoc.label} را ارسال کنید:`);
        } else {
          state.step = "NEW_REQ_CONFIRM";
          userStates.set(chatId, state);
          return await showSummaryAndConfirm(chatId, state);
        }

      case "NEW_REQ_CONFIRM":
        if (text === "تایید و ثبت نهایی") {
          return await finalizeRegistration(chatId, state);
        } else if (text === "ویرایش و شروع مجدد") {
          state.step = "NEW_REQ_PERSON_TYPE";
          state.data = { flow: "NEW_REQUEST" };
          userStates.set(chatId, state);
          return await sendKeyboard(chatId, "لطفاً نوع شخصیت خود را انتخاب کنید:", [["حقیقی", "حقوقی"], ...cancelBtn]);
        }
        break;
    }
  }

  // TRACKING FLOW
  if (state.data.flow === "TRACKING") {
    if (state.step === "TRACKING_INPUT") {
      const result = trackingData.get(text);
      userStates.delete(chatId);
      if (!result) {
        return await sendMainMenu(chatId, "اطلاعاتی با این کد پیگیری پیدا نشد. لطفاً کد را بررسی کرده و مجدداً تلاش کنید.");
      }
      return await sendMainMenu(chatId, `🔍 نتیجه پیگیری درخواست\n\nکد پیگیری: ${text}\nنوع درخواست: ${result.type}\nوضعیت: ${result.status}\nتاریخ ثبت: ${new Date(result.date).toLocaleDateString('fa-IR')}`);
    }
  }
}

async function startFormFields(chatId, state) {
  if (state.data.person_type === "حقیقی") {
    state.data.fields = [
      { key: "first_name", label: LABELS.first_name },
      { key: "last_name", label: LABELS.last_name },
      { key: "father_name", label: LABELS.father_name },
      { key: "national_id", label: LABELS.national_id },
      { key: "mobile", label: LABELS.mobile },
      { key: "phone", label: LABELS.phone },
      { key: "address", label: LABELS.address },
      { key: "postal_code", label: LABELS.postal_code }
    ];
  } else {
    state.data.fields = [
      { key: "company_name", label: LABELS.company_name },
      { key: "ceo_first_name", label: LABELS.ceo_first_name },
      { key: "ceo_last_name", label: LABELS.ceo_last_name },
      { key: "ceo_national_id", label: LABELS.ceo_national_id },
      { key: "company_national_id", label: LABELS.company_national_id },
      { key: "phone", label: LABELS.phone },
      { key: "address", label: LABELS.address },
      { key: "postal_code", label: LABELS.postal_code }
    ];
  }

  state.step = "NEW_REQ_FIELDS";
  state.data.fieldIndex = 0;
  userStates.set(chatId, state);
  return await sendMessage(chatId, `لطفاً ${state.data.fields[0].label} را وارد کنید:`);
}

function getRequiredDocs(personType) {
  const common = [
    { key: "doc_front", label: "عکس روی کارت ملی" },
    { key: "doc_back", label: "عکس پشت کارت ملی" },
    { key: "doc_store", label: "عکس سردر فروشگاه یا مرکز محل نصب" },
    { key: "doc_place", label: "عکس محل نصب دستگاه (قبل از نصب)" },
    { key: "doc_ownership", label: "عکس سند مالکیت یا اجاره‌نامه یا استشهادنامه" },
    { key: "doc_contract", label: "عکس قرارداد امضاشده بهره‌برداری" },
    { key: "location", label: "موقعیت مکانی (لوکیشن)" }
  ];

  if (personType === "حقوقی") {
    return [
      { key: "doc_establishment", label: "تصویر آگهی تاسیس" },
      { key: "doc_changes", label: "تصویر آخرین تغییرات روزنامه رسمی" },
      ...common
    ];
  }
  return common;
}

async function showSummaryAndConfirm(chatId, state) {
  let summary = `📋 خلاصه اطلاعات ثبت شده:\n\n`;
  for (const [key, val] of Object.entries(state.data)) {
    if (LABELS[key] && typeof val === "string") {
      summary += `• ${LABELS[key]}: ${val}\n`;
    }
  }
  summary += `\nتمام مدارک و لوکیشن با موفقیت دریافت گردید.\nآیا اطلاعات مورد تایید است؟`;

  return await sendKeyboard(chatId, summary, [
    ["تایید و ثبت نهایی"],
    ["ویرایش و شروع مجدد"],
    ["لغو و بازگشت به منوی اصلی"]
  ]);
}

async function finalizeRegistration(chatId, state) {
  const trackId = `TOT-${Math.floor(10000 + Math.random() * 90000)}`;
  trackingData.set(trackId, { type: "NEW_REQUEST", data: state.data, status: "در حال بررسی مدارک", date: new Date().toISOString() });
  userStates.delete(chatId);

  let adminMsg = `📥 ثبت درخواست دستگاه جدید\nکد پیگیری: ${trackId}\n\n`;
  for (const [key, val] of Object.entries(state.data)) {
    if (LABELS[key] && typeof val === "string") {
      adminMsg += `• ${LABELS[key]}: ${val}\n`;
    }
  }
  await notifyAdmin(adminMsg);

  return await sendMainMenu(chatId, `ثبت درخواست شما با موفقیت انجام شد.\n\n🔑 کد پیگیری اختصاصی: ${trackId}\n\nپرونده شما در دست بررسی کارشناسان قرار گرفت.`);
}

async function sendMainMenu(chatId, text) {
  const menu = [
    ["درخواست دستگاه جدید", "تغییر مالکیت"],
    ["تمدید قرارداد", "پشتیبانی"],
    ["پیگیری درخواست", "سوالات متداول"]
  ];
  return await sendKeyboard(chatId, text, menu);
}

async function sendMessage(chatId, text) {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const url = `${BALE_API_BASE}${BOT_TOKEN}/sendMessage`;
  return await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}

async function sendKeyboard(chatId, text, keyboard) {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const url = `${BALE_API_BASE}${BOT_TOKEN}/sendMessage`;
  const formattedKeyboard = keyboard.map(row => row.map(btnText => ({ text: btnText })));
  
  return await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: { keyboard: formattedKeyboard, resize_keyboard: true }
    })
  });
}

async function notifyAdmin(text) {
  if (!ADMIN_CHAT_ID) return;
  return await sendMessage(ADMIN_CHAT_ID, text);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));