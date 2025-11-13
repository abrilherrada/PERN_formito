import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from './sesClient.js';
import { InternalServerError } from '../../utils/errors/httpErrors.js';

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const EMAIL_FROM = process.env.AWS_SES_FROM_EMAIL;

if (!EMAIL_FROM) {
  throw new Error('AWS SES sender email (AWS_SES_FROM_EMAIL) is not configured');
}

export const sendSubmissionEmail = async ({ to, formName, formId, data }) => {
  try {
    const escapeHtml = (unsafe) =>
      String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const dataHtml = Object.entries(data)
      .map(([key, value]) => `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</p>`)
      .join('');

    const formUrl = `${APP_URL}/forms/${formId}`;

    const command = new SendEmailCommand({
      Source: EMAIL_FROM,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: `New submission for ${formName}`,
        },
        Body: {
          Html: {
            Data: `
              <p>Hello!</p>
              <p>There is a new submission for the form ${formName}:</p>
              <p>${dataHtml}</p>
              <p>View the form <a href="${formUrl}">here</a></p>
            `,
          },
        },
      },
    });

    await sesClient.send(command);
  } catch (error) {
    console.error('SES error', error);
    throw new InternalServerError('The submission email could not be sent');
  }
};