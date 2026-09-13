const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// توکن جدید ربات بله
const BALE_BOT_TOKEN = "936952553:JEcZjz0lC5iIgeq7uBdajzv6O6ENywYjxtg";
const BALE_API_URL = `https://tapi.bale.ai/bot${BALE_BOT_TOKEN}`;

// ۱. مسير بررسی سلامت سرور (برای تست دسترسی مرورگر)
app.get("/", (req, res) => {
  res.send("TOTAN Bot Server is Running Perfectly!");
});

// ۲. اندپوينت وب‌هوک برای دریافت پیام‌ها از بله
app.post("/webhook", async (req, res) => {
  console.log("=== جدیدترین پیام دریافتی از بله ===");
  console.log(JSON.stringify(req.body, null, 2));

  // پاسخ سریع به بله (۲۰۰ OK) تا بله بداند پیام دریافت شد
  res.sendStatus(200);

  const update = req.body;
  
  if (update && update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    console.log(`پیام از چت ${chatId}: ${text}`);

    // پاسخ به دستور /start
    if (text === "/start") {
      await sendMessage(chatId, "سلام! ربات توتان با توکن جدید فعال است. لطفاً خدمت مورد نظر را انتخاب کنید.");
    } else {
      await sendMessage(chatId, `پیام شما دریافت شد: "${text}"`);
    }
  }
});

// تابع ارسال پیام به کاربر در بله
async function sendMessage(chatId, text) {
  try {
    const response = await axios.post(`${BALE_API_URL}/sendMessage`, {
      chat_id: chatId,
      text: text,
    });
    console.log("پاسخ ارسال شد:", response.data.ok);
  } catch (error) {
    console.error("خطا در ارسال پیام به بله:", error.response ? error.response.data : error.message);
  }
}

// تنظیم پورت سرور
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
