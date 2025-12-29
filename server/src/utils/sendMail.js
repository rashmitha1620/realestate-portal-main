const nodemailer = require("nodemailer");

/* ======================================================
   GMAIL SMTP TRANSPORT
====================================================== */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_EMAIL,
    pass: process.env.MAIL_APP_PASSWORD.replace(/\s/g, ""), // important
  },
});

/* ======================================================
   VERIFY SMTP AT STARTUP
====================================================== */
transporter.verify((err) => {
  if (err) {
    console.error("❌ Gmail SMTP verification failed:", err.message);
  } else {
    console.log("✅ Gmail SMTP ready");
  }
});

/* ======================================================
   SEND EMAIL (GENERIC)
====================================================== */
async function sendMail({ to, subject, html }) {
  if (!to) {
    console.warn("⚠️ Email skipped: no recipient");
    return { skipped: true };
  }

  const info = await transporter.sendMail({
    from: `"RealEstate Portal" <${process.env.MAIL_EMAIL}>`,
    to,
    subject,
    html,
  });

  console.log("✅ Email sent:", info.messageId, "→", to);
  return info;
}

module.exports = sendMail ;
