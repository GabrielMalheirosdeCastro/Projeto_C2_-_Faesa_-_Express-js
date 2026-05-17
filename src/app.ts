import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middlewares/error.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { professionalsRouter } from './routes/professionals.js';
import { servicesRouter } from './routes/services.js';
import { appointmentsRouter } from './routes/appointments.js';
import { openApiSpec } from './swagger.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', service: 'api-c2-agendamento' });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/professionals', professionalsRouter);
  app.use('/services', servicesRouter);
  app.use('/appointments', appointmentsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  app.use(errorHandler);

  return app;
}
