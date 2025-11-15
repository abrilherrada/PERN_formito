import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from './sesClient.js';
import { InternalServerError } from '../../utils/errors/httpErrors.js';

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const EMAIL_FROM = process.env.AWS_SES_FROM_EMAIL;

if (!EMAIL_FROM) {
  throw new Error('AWS SES sender email (AWS_SES_FROM_EMAIL) is not configured');
}

const escapeHtml = (unsafe) =>
  String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderDataHtml = (value) => {
  if (value === null) {
    return '<em>null</em>';
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '<em>[]</em>';
      }
      return `<ul>${value.map((item) => `<li>${renderDataHtml(item)}</li>`).join('')}</ul>`;
    }

    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '<em>{}</em>';
    }

    return `<ul>${entries
      .map(
        ([key, val]) =>
          `<li><strong>${escapeHtml(key)}:</strong> ${renderDataHtml(val)}</li>`
      )
      .join('')}</ul>`;
  }

  return escapeHtml(value);
};

const renderDataText = (value, indent = 0) => {
  const prefix = '  '.repeat(indent);

  if (value === null) return `${prefix}null`;

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length === 0) return `${prefix}[]`;
      return value.map((item, index) =>
        `${prefix}- ${renderDataText(item, indent + 1)}`
      ).join('\n');
    }

    const entries = Object.entries(value);
    if (entries.length === 0) return `${prefix}{}`;

    return entries.map(
      ([key, val]) => `${prefix}${key}:\n${renderDataText(val, indent + 1)}`
    ).join('\n');
  }

  return `${prefix}${String(value)}`;
};

export const sendSubmissionEmail = async ({ to, formName, formId, data }) => {
  try {
    const formUrl = `${APP_URL}/forms/${formId}`;
    const dataHtml = renderDataHtml(data);
    const dataText = renderDataText(data);

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
              <p>There is a new submission for the form ${escapeHtml(formName)}:</p>
              ${dataHtml}
              <p>View the form <a href="${escapeHtml(formUrl)}">here</a>.</p>
            `,
          },
          Text: {
            Data: [
              `Hello!`,
              ``,
              `There is a new submission for the form ${formName}:`,
              dataText,
              ``,
              `View the form here: ${formUrl}.`,
            ].join('\n'),
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