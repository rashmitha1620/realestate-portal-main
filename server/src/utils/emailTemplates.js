// server/src/utils/emailTemplates.js
const  sendMail  = require('./sendMail');


const enquiryEmailTemplate = ({
  logoUrl,
  title,
  enquiryType,
  name,
  email,
  phone,
  message,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${enquiryType}</title>
</head>
<body style="
  margin:0;
  padding:0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  background:#f4f6f8;
">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" style="
          max-width:600px;
          background:#ffffff;
          border-radius:10px;
          overflow:hidden;
          box-shadow:0 8px 25px rgba(0,0,0,0.08);
        ">

          <tr>
            <td style="
              background:linear-gradient(135deg,#ff512f,#dd2476);
              padding:20px;
              text-align:center;
            ">
               <img
      src="https://img.icons8.com/ios-filled/150/fa314a/home.png"
      alt="RealEstate Portal"
      width="120"
      style="display:block; margin:0 auto;"
    />
            </td>
          </tr>

          <tr>
            <td style="padding:25px;color:#333;">
              <h2>📩 New ${enquiryType}</h2>

              <p style="color:#555;">
                You have received a new enquiry for:
              </p>

              <p style="
                font-size:18px;
                font-weight:600;
                margin-bottom:20px;
              ">
                ${title}
              </p>

              <table width="100%" cellpadding="8" cellspacing="0" style="
                background:#f9fafb;
                border-radius:8px;
              ">
                <tr>
                  <td><b>Name:</b></td>
                  <td>${name}</td>
                </tr>

                ${email ? `
                <tr>
                  <td><b>Email:</b></td>
                  <td>${email}</td>
                </tr>
                ` : ``}

                <tr>
                  <td><b>Phone:</b></td>
                  <td>${phone}</td>
                </tr>
              </table>

              ${message ? `
              <p style="margin-top:18px;">
                <b>Message:</b><br/>
                <span style="color:#555;">${message}</span>
              </p>
              ` : ``}

              <hr style="margin:25px 0;border:none;border-top:1px solid #eee;"/>

              <p style="color:#777;font-size:13px;">
                Please respond to this enquiry as soon as possible.
              </p>
            </td>
          </tr>

          <tr>
            <td style="
              background:#f4f6f8;
              text-align:center;
              padding:15px;
              font-size:12px;
              color:#777;
            ">
              © ${new Date().getFullYear()} RealEstate Portal
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

async function sendWelcomeEmail({ to, name, role }) {
  const subject = `🎉 Welcome to RealEstate24X7, ${name}!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to RealEstate24X7</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        }
        
        .logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .logo-icon {
            background: white;
            color: #4f46e5;
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
       .welcome-title {
    font-size: 32px;
    font-weight: 700;
    margin: 20px 0 10px;
    background: linear-gradient(to right, #4a4a9c, #2563eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
        
        .role-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.5px;
            margin: 10px 0;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #4b5563;
            margin-bottom: 30px;
        }
        
        .highlight-name {
            color: #4f46e5;
            font-weight: 600;
        }
        
        .features {
            background: #f8fafc;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            border-left: 4px solid #4f46e5;
        }
        
        .features h3 {
            color: #4f46e5;
            margin-top: 0;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .features ul {
            margin: 15px 0 0 0;
            padding-left: 20px;
        }
        
        .features li {
            margin-bottom: 10px;
            color: #4b5563;
        }
        
        .features li::marker {
            color: #4f46e5;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3);
            position: relative;
            overflow: hidden;
            border: none;
            cursor: pointer;
        }
        
        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 35px rgba(79, 70, 229, 0.4);
        }
        
        .cta-button:active {
            transform: translateY(-1px);
        }
        
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        
        .login-info {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f0f9ff;
            border-radius: 12px;
            border: 1px solid #e0f2fe;
        }
        
        .login-info h4 {
            color: #0369a1;
            margin-top: 0;
        }
        
        .dashboard-preview {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
            border: 2px dashed #cbd5e1;
        }
        
        .dashboard-preview img {
            max-width: 100%;
            border-radius: 8px;
            margin: 15px 0;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            background: #1e293b;
            color: white;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .footer-links {
            margin: 20px 0;
        }
        
        .footer-links a {
            color: #94a3b8;
            text-decoration: none;
            margin: 0 15px;
            font-size: 14px;
            transition: color 0.3s;
        }
        
        .footer-links a:hover {
            color: #ffffff;
        }
        
        .copyright {
            font-size: 13px;
            color: #64748b;
            margin-top: 20px;
        }
        
        .contact-info {
            background: #fefce8;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
            border: 1px solid #fde047;
        }
        
        .contact-info h4 {
            color: #ca8a04;
            margin-top: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        /* Responsive */
        @media (max-width: 620px) {
            .container {
                margin: 20px;
                border-radius: 16px;
            }
            
            .header, .content {
                padding: 30px 20px;
            }
            
            .welcome-title {
                font-size: 26px;
                color: #ca8a04;
            }
            
            .cta-button {
                padding: 14px 30px;
                font-size: 15px;
                display: block;
                margin: 0 auto;
            }
        }
        
        /* Animation */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .animated {
            animation: fadeIn 0.6s ease-out;
        }
    </style>
</head>
<body>
    <div class="container animated">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <div class="logo-icon">🏠</div>
                RealEstate24X7
            </div>
            <h1 class="welcome-title">Welcome Aboard!</h1>
            <div class="role-badge">
                ${role === 'agent' ? '🏢 Real Estate Property Dealer' : '🔧 Service Provider'}
            </div>
            <p style="opacity: 0.9; margin-top: 15px;">Your journey begins here</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <p class="greeting">
                Hello <span class="highlight-name">${name}</span>,
            </p>
            
            <p style="font-size: 16px; color: #374151;">
                Congratulations! Your <strong>${role}</strong> account has been successfully activated 
                and is now ready to use. We're thrilled to welcome you to our growing community 
                of real estate professionals.
            </p>
            
            <!-- Features Section -->
            <div class="features">
                <h3>✨ What You Can Do Now:</h3>
                <ul>
                    ${role === 'agent' ? `
                    <li>List and manage your properties</li>
                    <li>Connect with verified buyers & sellers</li>
                    <li>Access premium market analytics</li>
                    <li>Get leads directly to your dashboard</li>
                    ` : `
                    <li>Showcase your services to thousands of agents</li>
                    <li>Receive direct service requests</li>
                    <li>Manage your service portfolio</li>
                    <li>Build your reputation with reviews</li>
                    `}
                    <li>24/7 customer support access</li>
                    <li>Mobile app coming soon!</li>
                </ul>
            </div>
            
            <!-- Login Info -->
            <div class="login-info">
                <h4>📱 Ready to Get Started?</h4>
                <p>Your account is fully set up and waiting for you. Click below to access your dashboard:</p>
            </div>
            
            <!-- CTA Button -->
            <div class="button-container">
                <a href="${process.env.SITE_URL || 'https://realestate24x7.com'}/${role === 'agent' ? 'agent-login' : 'service-provider-login'}" 
                   class="cta-button">
                   🚀 Access Your Dashboard
                </a>
            </div>
            
            <!-- Dashboard Preview -->
            <div class="dashboard-preview">
                <h4 style="color: #4b5563; margin-bottom: 15px;">🎯 Your Dashboard Awaits</h4>
                <p style="color: #6b7280; margin-bottom: 20px;">
                    Experience our intuitive interface designed to help you succeed
                </p>
                <!-- Optional: Add dashboard screenshot here -->
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                           height: 150px; border-radius: 10px; 
                           display: flex; align-items: center; justify-content: center;
                           color: white; font-weight: 600;">
                    🏠 Professional Dashboard
                </div>
            </div>
            
            <!-- Contact Info -->
            <div class="contact-info">
                <h4>💬 Need Assistance?</h4>
                <p style="color: #4b5563;">
                    Our support team is here to help you succeed.<br>
                    Email: miithyderabad@gmail.com<br>
                    Phone: +91-83416 02908
                </p>
            </div>
            
            <p style="text-align: center; color: #6b7280; font-style: italic; margin-top: 30px;">
                "Building success, one property at a time."
            </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="logo" style="color: white; font-size: 22px;">
                <div class="logo-icon" style="background: #4f46e5;">🏠</div>
                RealEstate24X7
            </div>
            
            <div class="footer-links">
                <a href="${process.env.SITE_URL || 'https://realestate24x7.com'}/about">About Us</a>
                <a href="${process.env.SITE_URL || 'https://realestate24x7.com'}/services">Services</a>
                <a href="${process.env.SITE_URL || 'https://realestate24x7.com'}/contact">Contact</a>
                <a href="${process.env.SITE_URL || 'https://realestate24x7.com'}/privacy">Privacy</a>
            </div>
            
            <p style="font-size: 14px; opacity: 0.8; max-width: 400px; margin: 20px auto;">
                Empowering real estate professionals with cutting-edge technology
            </p>
            
            <p class="copyright">
                © ${new Date().getFullYear()} RealEstate24X7. All rights reserved.<br>
                You're receiving this email because you registered on RealEstate24X7.
            </p>
        </div>
    </div>
</body>
</html>
  `;

  return sendMail({
    to,
    subject,
    html,
  });
}

async function sendServiceEnquiryEmail({
  to,
  title,
  name,
  email,
  phone,
  message,
  serviceName
}) {
  const enquiryType = 'Service Enquiry';
  const subject = `🔧 New Service Enquiry: ${serviceName || title}`;

  const html = enquiryEmailTemplate({
    logoUrl: 'https://img.icons8.com/ios-filled/150/fa314a/tools.png',
    title: serviceName || title,
    enquiryType,
    name,
    email,
    phone,
    message,
  });

  return sendMail({
    to,
    subject,
    html,
  });
}

async function sendPropertyEnquiryEmail({
  to,
  propertyTitle,
  propertyType,
  propertyPrice,
  propertyLocation,
  propertyId,
  name,
  email,
  phone,
  message,
  preferredTime,
  budget,
  agentName,
  agentPhone
}) {
  const enquiryType = 'Property Enquiry';
  const subject = `🏠 New Property Enquiry: ${propertyTitle || propertyType}`;

  // Enhanced message with property details
  let enhancedMessage = message || 'Interested in this property';
  
  if (propertyPrice) {
    enhancedMessage += `\n\n📊 Property Details:\n`;
    if (propertyType) enhancedMessage += `• Type: ${propertyType}\n`;
    if (propertyPrice) enhancedMessage += `• Price: ${propertyPrice}\n`;
    if (propertyLocation) enhancedMessage += `• Location: ${propertyLocation}\n`;
    if (propertyId) enhancedMessage += `• Property ID: ${propertyId}\n`;
    if (budget) enhancedMessage += `• Buyer Budget: ${budget}\n`;
    if (preferredTime) enhancedMessage += `• Preferred Contact Time: ${preferredTime}\n`;
  }
  
  if (agentName) {
    enhancedMessage += `\n👤 Assigned Agent: ${agentName}`;
    if (agentPhone) enhancedMessage += ` (${agentPhone})`;
  }

  const html = enquiryEmailTemplate({
    logoUrl: 'https://img.icons8.com/ios-filled/150/fa314a/home.png',
    title: propertyTitle || `${propertyType} Property`,
    enquiryType,
    name,
    email,
    phone,
    message: enhancedMessage,
  });

  return sendMail({
    to,
    subject,
    html,
  });
}


/* =========================================================
   🔔 SUBSCRIPTION REMINDER EMAIL
========================================================= */
async function sendSubscriptionReminderEmail({
  to,
  name,
  role,
  daysLeft,
}) {
  const isExpired = daysLeft <= 0;

  const subject = isExpired
    ? "❌ Your RealEstate24X7 subscription has expired"
    : `⏰ Subscription expires in ${daysLeft} day(s)`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Subscription Reminder</title>
</head>
<body style="margin:0;padding:0;font-family:Segoe UI,Arial;background:#f4f6f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background:#fff;border-radius:10px;overflow:hidden;">
          
          <tr>
            <td style="background:#1e293b;color:#fff;padding:20px;text-align:center;">
              <h2 style="margin:0;">RealEstate24X7</h2>
            </td>
          </tr>

          <tr>
            <td style="padding:30px;color:#333;">
              <p>Hello <b>${name || "User"}</b>,</p>

              ${
                isExpired
                  ? `
                <p style="color:#dc2626;font-weight:600;">
                  ❌ Your monthly subscription has expired.
                </p>
                <p>
                  Your login access and listings have been temporarily blocked.
                </p>
                `
                  : `
                <p style="color:#ca8a04;font-weight:600;">
                  ⏰ Your subscription will expire in ${daysLeft} day(s).
                </p>
                <p>
                  Please renew your subscription to avoid service interruption.
                </p>
                `
              }

              <p><b>Plan:</b> ₹1500 / month</p>
              <p><b>Account Type:</b> ${
                role === "agent"
                  ? "Property Dealer"
                  : "Service Provider"
              }</p>

              <div style="text-align:center;margin:30px 0;">
                <a href="${process.env.CLIENT_URL}/subscription-renew?source=email"
                   style="
                     background:#4f46e5;
                     color:#fff;
                     padding:14px 28px;
                     border-radius:8px;
                     text-decoration:none;
                     font-weight:600;
                   ">
                  🔄 Renew Subscription
                </a>
              </div>

              <p style="font-size:13px;color:#666;">
                If you have already renewed, please ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f1f5f9;text-align:center;padding:15px;font-size:12px;color:#666;">
              © ${new Date().getFullYear()} RealEstate24X7
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendMail({
    to,
    subject,
    html,
  });
}

module.exports = {
  sendMail, 
  enquiryEmailTemplate,
  sendWelcomeEmail,
  sendServiceEnquiryEmail,
  sendPropertyEnquiryEmail,
  sendSubscriptionReminderEmail,
};