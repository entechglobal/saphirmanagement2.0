import nodemailer from "nodemailer";

export default sendEmail = (options) => {
  //1)create transporter (service that will send email like 'gmail','Mailgun','mailtrap')
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT, //if secure flase port=587 ,if true port=465
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  //2)Define email options (like from,to ,subject,email content)
  const mailOpts = {
    from: "",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };
  //3) Send email
  transporter.sendMail(mailOpts);
};
