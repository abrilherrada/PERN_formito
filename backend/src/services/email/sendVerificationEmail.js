import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from './sesClient.js';
import { InternalServerError } from '../../utils/errors/httpErrors.js';

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const EMAIL_FROM = process.env.AWS_SES_FROM_EMAIL;

if (!EMAIL_FROM) {
  throw new Error('AWS SES sender email (AWS_SES_FROM_EMAIL) is not configured');
}

export const sendVerificationEmail = async ({ to, token }) => {
  try {
    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
    const command = new SendEmailCommand({
      Source: EMAIL_FROM,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: 'Confirm your email address for Formito',
        },
        Body: {
          Html: {
            Data: `
              <p>Hello!</p>
              <p>Thank you for registering with Formito.</p>
              <p>Click the link below to verify your email address:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p>If you did not request this verification, please ignore this message.</p>
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