const nodemailer = require('nodemailer');
const hbsModule = require('nodemailer-express-handlebars');
const hbs = hbsModule.default || hbsModule;
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const handlebarOptions = {
  viewEngine: {
    extName: '.hbs',
    partialsDir: path.resolve(__dirname, '../templates'),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, '../templates'),
  extName: '.hbs',
};

transporter.use('compile', hbs(handlebarOptions));

const sendEmail = async ({ to, subject, template, context }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[EmailService] EMAIL_USER or EMAIL_PASS is not configured. Email will not be sent.');
    return false;
  }

  const mailOptions = {
    from: `"TicketStage" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    template,
    context
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Email sent to ${to} (template: ${template})`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Error sending email to ${to}:`, error);
    return false;
  }
};

module.exports = {
  sendEmail
};
