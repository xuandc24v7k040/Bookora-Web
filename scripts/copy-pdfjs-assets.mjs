import { cp, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Keep the viewer's optional fonts/decoders local and matched to the pinned worker.
const source = new URL("../node_modules/pdfjs-dist/", import.meta.url);
const { version } = JSON.parse(
  await readFile(new URL("package.json", source), "utf8"),
);
const destination = new URL(`../public/pdfjs/${version}/`, import.meta.url);
await mkdir(destination, { recursive: true });
for (const directory of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  await cp(new URL(directory, source), new URL(directory, destination), {
    recursive: true,
  });
}
await cp(new URL("LICENSE", source), new URL("LICENSE", destination));
console.log(
  `Prepared local PDF.js ${version} assets: ${fileURLToPath(destination)}`,
);
