import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/Interfaces';
import signale from 'signale';
const mailgun = new Mailgun(formData);

let mg: IMailgunClient;

export const initEmailClient = () => {
  mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY || '',
    url: 'https://api.eu.mailgun.net/',
  });
};

export const sendEmail = async ({
  emails,
  from,
  html,
  subject,
  text,
}: {
  subject: string;
  text?: string;
  html: string;
  emails: Array<string>;
  from?: string;
}) => {
  const res = await mg.messages.create('mail.keletrontennisacademy.com', {
    from: from || 'Keletron Support <support@mail.keletrontennisacademy.com>',
    to: emails,
    subject: subject,
    text: text,
    html: html,
  });

  signale.debug(
    `email sent to "${emails.join(',')}". data: \n`,
    {
      from: from || 'Keletron Support <support@mail.keletrontennisacademy.com>',
      to: emails,
      subject: subject,
      text: text,
      html: html,
    },
    '\nresponse:\n',
    res,
  );
};

export const sendLoginCodeEmail = async (email: string, code: string) => {
  sendEmail({
    emails: [email],
    subject: 'login code',
    html: `<h1>the login code is ${code}</h1>`,
  });
};
