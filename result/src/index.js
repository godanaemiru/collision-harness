import { createApp } from './api/server.js';

const port = Number(process.env.PORT ?? 3000);
const { server } = createApp();
server.listen(port, () => {
  console.log(`ledger api listening on http://localhost:${port}`);
});
