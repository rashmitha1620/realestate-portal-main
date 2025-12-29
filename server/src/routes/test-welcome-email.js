// test-welcome-email.js
require('dotenv').config();
const { sendWelcomeEmail } = require('./server/src/utils/emailTemplates');

async function test() {
  console.log('🧪 Testing welcome email with Gmail SMTP...');
  console.log('Using email:', process.env.MAIL_EMAIL);
  
  try {
    const result = await sendWelcomeEmail({
      to: 'siddhrantechnology.hr@gmail.com', // Change to your test email
      name: 'Test User',
      role: 'service-provider'
    });
    
    console.log('🎉 TEST SUCCESSFUL!');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result.response);
  } catch (error) {
    console.error('💥 TEST FAILED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();