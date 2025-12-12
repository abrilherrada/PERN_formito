import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.js';
import userEmailsRouter from './routes/userEmails.js';
import formsRouter from './routes/forms.js';
import usersRouter from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: false,
    hsts: false,
    referrerPolicy: { policy: 'no-referrer' },
    permissionsPolicy: {
      features: {
        camera: [],
        microphone: [],
        geolocation: []
      }
    }
  })
);
app.disable('x-powered-by');

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Formito API' });
});

app.use('/api/auth', authRouter);
app.use('/api/user/emails', userEmailsRouter);
app.use('/api/forms', formsRouter);
app.use('/api/users', usersRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});