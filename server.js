const express = require("express");

const app = express();
app.use(express.json());

// توکن جدید ربات بله
const BALE_BOT_TOKEN = "936952553:JEcZjz0lC5iIgeq7uBdajzv6O6ENywYjxtg";
const BALE_API_URL = `https://tapi.bale.ai/bot${BALE_BOT_TOKEN}`;

// ۱. مسیر بررسی سلامت سرور
app.get("/", (req, res) => {
  res.send("TOTAN Bot Server is Running Perfectly!");
});

// ۲. اندپوینت وب‌هوک برای دریافت پیام‌ها از بله
app.post("/webhook", async (req, res) => {
  console.log("=== جدیدترین پیام دریافتی از بله ===");
  console.log(JSON.stringify(req.body, null, 2));

  // پاسخ سریع به بله (۲۰۰ OK)
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

// تابع ارسال پیام به کاربر در بله با استفاده از fetch داخلی Node.js
async function sendMessage(chatId, text) {
  try {
    const response = await fetch(`${BALE_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
    const data = await response.json();
    console.log("پاسخ ارسال شد:", data.ok);
  } catch (error) {
    console.error("خطا در ارسال پیام به بله:", error.message);
  }
}

// تنظیم پورت سرور
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
