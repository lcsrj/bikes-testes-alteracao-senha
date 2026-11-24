import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('src/main/resources/static');
const output = resolve('dist');
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
const runtime = await readFile(`${source}/assets/runtime.js`, 'utf8');
await writeFile(`${output}/assets/runtime.js`, runtime.replace('DEMO = false', 'DEMO = true'));
const html = (await readFile(`${output}/index.html`, 'utf8'))
  .replace('Bikes · Locadora de bicicletas', 'Bikes · Demonstração interativa')
  .replace('href="/docs-bikes.html">Swagger', 'href="https://github.com/lcsrj/bikes-testes-alteracao-senha">GitHub');
await writeFile(`${output}/index.html`, html);
await writeFile(`${output}/.nojekyll`, '');
console.log(`Demonstração pronta em ${output}`);
