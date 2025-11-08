import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import userEmailsRouter from './routes/userEmails.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Formito API' });
});

app.use('/api/auth', authRouter);
app.use('/api/user/emails', userEmailsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});