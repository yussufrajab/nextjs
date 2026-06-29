const nodemailer = require("nodemailer");

async function sendMail() {
  const transporter = nodemailer.createTransport({
    host: "mx.egaz.go.tz",
    port: 25,
    secure: false,
    requireTLS: false,

    auth: {
      user: "tume.serikalini@zanajira.go.tz",
      pass: "Csms@2026",
    },

    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("Testing SMTP connection...");

    await transporter.verify();

    console.log("SMTP connection successful");

    const info = await transporter.sendMail({
      from: '"CSMS TEST" <tume.serikalini@zanajira.go.tz>',
      to: "yussuf.rajab@zanajira.go.tz",
      subject: "CSMS SMTP Test",
      text: "This is a successful SMTP test email from CSMS.",
      html: `
        <h2>CSMS SMTP Test</h2>
        <p>This is a successful SMTP test email from CSMS.</p>
      `,
    });

    console.log("EMAIL SENT SUCCESSFULLY");
    console.log(info);

  } catch (error) {
    console.error("SMTP ERROR:");
    console.error(error);
  }
}

sendMail();
