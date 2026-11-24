import { startDemoServer } from '../tests/static-server.mjs';

const { url } = await startDemoServer({ port: 4173 });
console.log(`Demonstração local: ${url}`);
console.log('Pressione Ctrl+C para encerrar.');
