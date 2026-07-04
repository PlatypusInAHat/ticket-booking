const nodemailer = require('nodemailer');
const path = require('path');

const handlebarOptions = {
  viewEngine: {
    extName: '.hbs',
    partialsDir: path.resolve(__dirname, '../templates'),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, '../templates'),
  extName: '.hbs',
};

let transporter;
let handlebarsPlugin;

const getProvider = () => (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

const isTrue = (value) => ['true', '1', 'yes'].includes(String(value).toLowerCase());

const buildTransportConfig = () => {
  const provider = getProvider();

  if (provider === 'gmail') {
    return {
      provider,
      config: {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      },
      configured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)
    };
  }

  if (provider === 'ses' || provider === 'ses-smtp') {
    return {
      provider: 'ses-smtp',
      config: {
        host: process.env.SES_SMTP_HOST || process.env.EMAIL_HOST || 'email-smtp.us-east-1.amazonaws.com',
        port: Number(process.env.SES_SMTP_PORT || process.env.EMAIL_PORT || 587),
        secure: isTrue(process.env.SES_SMTP_SECURE || process.env.EMAIL_SECURE),
        auth: {
          user: process.env.SES_SMTP_USERNAME || process.env.EMAIL_USER,
          pass: process.env.SES_SMTP_PASSWORD || process.env.EMAIL_PASS
        }
      },
      configured: Boolean(
        (process.env.SES_SMTP_USERNAME || process.env.EMAIL_USER) &&
        (process.env.SES_SMTP_PASSWORD || process.env.EMAIL_PASS)
      )
    };
  }

  return {
    provider: 'smtp',
    config: {
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: isTrue(process.env.EMAIL_SECURE),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    },
    configured: Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
  };
};

const getHandlebarsPlugin = async () => {
  if (handlebarsPlugin) {
    return handlebarsPlugin;
  }

  const hbsModule = await import('nodemailer-express-handlebars');
  handlebarsPlugin = hbsModule.default || hbsModule;
  return handlebarsPlugin;
};

const getTransporter = async () => {
  if (transporter) {
    return transporter;
  }

  const { config } = buildTransportConfig();
  transporter = nodemailer.createTransport(config);
  const hbs = await getHandlebarsPlugin();
  transporter.use('compile', hbs(handlebarOptions));
  return transporter;
};

const getFromAddress = () => {
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@ticketstage.local';
  const fromName = process.env.EMAIL_FROM_NAME || 'TicketStage';
  return `"${fromName}" <${fromEmail}>`;
};

const sendEmail = async ({ to, subject, template, context = {}, html, text }) => {
  const { provider, configured } = buildTransportConfig();

  if (!configured) {
    console.warn(`[EmailService] ${provider} is not configured. Email to ${to} was recorded as dry-run.`);
    return {
      accepted: false,
      dryRun: true,
      provider,
      messageId: ''
    };
  }

  const mailOptions = {
    from: getFromAddress(),
    to,
    subject
  };

  if (html || text) {
    mailOptions.html = html;
    mailOptions.text = text;
  } else {
    mailOptions.template = template;
    mailOptions.context = context;
  }

  try {
    const activeTransporter = await getTransporter();
    const info = await activeTransporter.sendMail(mailOptions);
    console.log(`[EmailService] Email sent to ${to} (template: ${template})`);

    return {
      accepted: true,
      dryRun: false,
      provider,
      messageId: info.messageId || ''
    };
  } catch (error) {
    console.error(`[EmailService] Error sending email to ${to}:`, error);
    return {
      accepted: false,
      dryRun: false,
      provider,
      messageId: '',
      error
    };
  }
};

module.exports = {
  buildTransportConfig,
  sendEmail
};
