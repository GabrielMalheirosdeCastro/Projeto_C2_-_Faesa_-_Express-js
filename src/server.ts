import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api-c2] escutando em http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`[api-c2] swagger em http://localhost:${port}/docs`);
});
