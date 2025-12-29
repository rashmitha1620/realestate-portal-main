const nodemailer = require("nodemailer");

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "1";

let transporter = null;

/* =========================
   CREATE & VERIFY TRANSPORT
========================= */
if (EMAIL_ENABLED) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,          // smtp-relay.brevo.com
    port: Number(process.env.EMAIL_PORT),  // 587
    secure: false,                          // MUST be false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.verify((err) => {
    if (err) {
      console.error("❌ SMTP VERIFY FAILED:", err.message);
    } else {
      console.log("✅ Brevo SMTP Connected");
    }
  });
}

/* =========================
   SEND EMAIL (GENERIC)
========================= */
async function sendMail(to, subject, html) {
  if (!EMAIL_ENABLED) {
    console.log("📨 Email disabled → skipped");
    return { skipped: true };
  }

  if (!to) {
    console.warn("⚠️ Email skipped: receiver address missing");
    return { skipped: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"RealEstate Portal" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent to:", to, "| ID:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    throw err;
  }
}

/* =========================
   ENQUIRY NOTIFICATION
========================= */
async function sendEnquiryNotification(agent, property, enquiry) {
  const receiverEmail = agent?.email;

  if (!receiverEmail) {
    console.warn("⚠️ Enquiry email skipped: agent email missing", {
      agentId: agent?._id,
    });
    return { skipped: true };
  }

  const html = `
    <p>Dear ${agent.name || agent.email},</p>

    <p>You have a <b>new enquiry</b> for your property:</p>
    <p><b>${property.title}</b></p>

    <hr/>

    <p><b>Customer Details</b></p>
    <ul>
      <li>Name: ${enquiry.name}</li>
      <li>Email: ${enquiry.email}</li>
      <li>Phone: ${enquiry.phone}</li>
    </ul>

    ${enquiry.message ? `<p><b>Message:</b><br/>${enquiry.message}</p>` : ""}

    <hr/>
    <p>Regards,<br/>RealEstate Portal</p>
  `;

  return sendMail(receiverEmail, "New Property Enquiry", html);
}





module.exports = {
  sendMail,
  sendEnquiryNotification,

};
