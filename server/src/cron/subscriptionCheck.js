// server/src/cron/subscriptionCheck.js

const cron = require("node-cron");

const Subscription = require("../models/Subscription");
const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");
const {
  sendSubscriptionReminderEmail,
} = require("../utils/emailTemplates");

cron.schedule("0 0 * * *", async () => {
  console.log("⏰ Subscription cron running");

  try {
    const now = new Date();

    const subs = await Subscription.find({ status: "active" });

    for (const sub of subs) {
      const diffDays = Math.ceil(
        (sub.expiresAt - now) / (1000 * 60 * 60 * 24)
      );

      let user =
        sub.userType === "agent"
          ? await Agent.findById(sub.userId)
          : await ServiceProvider.findById(sub.userId);

      if (!user) continue;

      // ⏰ Reminder
      if (diffDays === 3 || diffDays === 1) {
        await sendSubscriptionReminderEmail({
          to: user.email,
          name: user.name,
          role: sub.userType === "agent" ? "agent" : "service",
          daysLeft: diffDays,
        });
      }

      // ❌ Expired
      if (diffDays <= 0) {
        sub.status = "expired";
        await sub.save();

        user.subscription.active = false;
        await user.save();

        await sendSubscriptionReminderEmail({
          to: user.email,
          name: user.name,
          role: sub.userType === "agent" ? "agent" : "service",
          daysLeft: 0,
        });

        console.log(`❌ Blocked: ${user.email}`);
      }
    }
  } catch (err) {
    console.error("❌ Subscription cron error:", err.message);
  }
});
