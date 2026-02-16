import axios from "axios";
import * as nodemailer from "nodemailer";

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string
) => {
  if (process.env.NODE_ENV === "production") {
    try {
      const response = await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: {
            name: "PLEINGAZ-INFOTECH",
            email: "smookeymykomhr@gmail.com",
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        },
        {
          headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `Email sent to ${to} successfully. ID: ${response.data.messageId}`
      );
      return response.data;
    } catch (err: any) {
      console.error("Brevo error:", err.response?.data || err);
      throw err;
    }
  } else {
    try {
      const transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: process.env.MAILTRAP_USERNAME,
          pass: process.env.MAILTRAP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },

        secure: false,
      });

      const info = await transporter.sendMail({
        from: '"PLEINGAZ-INFOTECH" <no-reply@pleingaz.com>',
        to,
        subject,
        text,
        html,
      });

      console.log("Dev email sent: %s", info.messageId);
      return info;
    } catch (err) {
      console.error("Mailtrap error:", err);
      throw err;
    }
  }
};
