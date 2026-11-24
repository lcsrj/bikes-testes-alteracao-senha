import { copyFile, mkdir, readFile } from 'node:fs/promises';

const destination = 'src/main/resources/static/assets/vendor';
await mkdir(destination, { recursive: true });
for (const [name, version, distribution, license, output] of [
  ['jspdf', '4.2.1', 'dist/jspdf.umd.min.js', 'LICENSE', 'jspdf'],
  ['jspdf-autotable', '5.0.9', 'dist/jspdf.plugin.autotable.min.js', 'LICENSE.txt', 'jspdf-autotable']
]) {
  const source = `node_modules/${name}`;
  const metadata = JSON.parse(await readFile(`${source}/package.json`, 'utf8'));
  if (metadata.version !== version) throw new Error(`Versão inesperada de ${name}`);
  await copyFile(`${source}/${distribution}`, `${destination}/${output}.min.js`);
  await copyFile(`${source}/${license}`, `${destination}/${output}.LICENSE.txt`);
}
