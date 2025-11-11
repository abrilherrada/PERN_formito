import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from './sesClient.js';
import { InternalServerError } from '../../utils/errors/httpErrors.js';
import { VerificationTokenType } from '@prisma/client';

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const EMAIL_FROM = process.env.AWS_SES_FROM_EMAIL;

const emailContent = {
  [VerificationTokenType.ACCOUNT_EMAIL]: {
    subject: 'Confirm your email address',
    body: {
      message: [
        'Thank you for registering with Formito.',
        'Click the link below to verify your email address:'
      ],
      linkPath: 'verify-email',
      ignore: 'If you did not request this verification, please ignore this message.'
    }
  },
  [VerificationTokenType.SECONDARY_EMAIL]: {
    subject: 'Confirm your new email address',
    body: {
      message: [
        'You\'ve added a new email address to your Formito account.',
        'Click the link below to verify your new email address:'
      ],
      linkPath: 'verify-email',
      ignore: 'If you did not request this verification, please ignore this message.'
    }
  },
  [VerificationTokenType.PASSWORD_RESET]: {
    subject: 'Reset your password',
    body: {
      message: [
        'You\'ve requested a password reset for your Formito account.',
        'Click the link below to reset your password:'
      ],
      linkPath: 'reset-password/confirm',
      ignore: 'If you did not request this change, please ignore this message.'
    }
  }
};

if (!EMAIL_FROM) {
  throw new Error('AWS SES sender email (AWS_SES_FROM_EMAIL) is not configured');
}

export const sendVerificationEmail = async ({
  to,
  selector,
  token,
  type = VerificationTokenType.ACCOUNT_EMAIL
}) => {
  try {
    const message = emailContent[type];

    if (!message) {
      throw new InternalServerError(`Unsupported verification token type: ${type}`);
    }

    const bodyHtml = message.body.message
      .map((line) => `<p>${line}</p>`)
      .join('');

    const verificationUrl = `${APP_URL}/${message.body.linkPath}?selector=${selector}&token=${token}`;

    const command = new SendEmailCommand({
      Source: EMAIL_FROM,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: message.subject,
        },
        Body: {
          Html: {
            Data: `
              <p>Hello!</p>
              ${bodyHtml}
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p>${message.body.ignore}</p>
            `,
          },
        },
      },
    });

    await sesClient.send(command);
  } catch (error) {
    console.error('SES error', error);
    throw new InternalServerError('The verification email could not be sent');
  }
};