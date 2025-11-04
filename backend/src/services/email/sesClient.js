import { SESClient } from '@aws-sdk/client-ses';

const REGION = process.env.AWS_SES_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  throw new Error('AWS SES credentials are not set.');
}

export const sesClient = new SESClient({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});