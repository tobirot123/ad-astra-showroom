import fs from "fs";
import path from "path";
import sharp from "sharp";
import { execSync } from "child_process";

const dir = path.join(process.cwd(), "public", "demo");
fs.mkdirSync(dir, { recursive: true });

function write(name: string, svg: string) {
  fs.writeFileSync(path.join(dir, name), svg);
  console.log(name);
}

write(
  "portada.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a2430"/>
      <stop offset="0.45" stop-color="#8d5a3c"/>
      <stop offset="1" stop-color="#e7c7a4"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <circle cx="1180" cy="210" r="70" fill="#f3d7b0" opacity="0.85"/>
  <rect y="620" width="1600" height="280" fill="#2c3330"/>
  <rect y="700" width="1600" height="40" fill="#3d4a40"/>
  <g fill="#241c17">
    <rect x="430" y="280" width="150" height="420"/>
    <rect x="610" y="220" width="170" height="480"/>
    <rect x="820" y="300" width="140" height="400"/>
  </g>
  <g fill="#c5d5df" opacity="0.55">
    <rect x="455" y="310" width="28" height="40"/>
    <rect x="500" y="310" width="28" height="40"/>
    <rect x="545" y="310" width="18" height="40"/>
    <rect x="640" y="250" width="30" height="36"/>
    <rect x="690" y="250" width="30" height="36"/>
    <rect x="740" y="250" width="22" height="36"/>
  </g>
</svg>`,
);

write(
  "aereo.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#d5ddd4"/>
  <rect x="40" y="40" width="1520" height="820" fill="#c5d0c4"/>
  <path d="M0 430 H1600" stroke="#efe8dc" stroke-width="46"/>
  <path d="M520 0 V900" stroke="#efe8dc" stroke-width="36"/>
  <rect x="80" y="80" width="400" height="280" fill="#8eaa86"/>
  <ellipse cx="250" cy="200" rx="70" ry="40" fill="#6d8f66"/>
  <rect x="280" y="200" width="150" height="260" fill="#e7dfd2" stroke="#b7aa98"/>
  <rect x="820" y="170" width="150" height="250" fill="#e7dfd2" stroke="#b7aa98"/>
  <g fill="#c4b79a" stroke="#8d7b62">
    <rect x="300" y="560" width="200" height="120"/>
    <rect x="540" y="560" width="200" height="120"/>
    <rect x="780" y="560" width="200" height="120"/>
    <rect x="300" y="710" width="200" height="120"/>
    <rect x="540" y="710" width="200" height="120"/>
    <rect x="780" y="710" width="200" height="120"/>
  </g>
</svg>`,
);

write(
  "barrio.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#d7e3ea"/>
  <rect y="520" width="1600" height="380" fill="#cfc6b6"/>
  <g fill="#ebe4d8" stroke="#c3b6a4">
    <rect x="80" y="560" width="220" height="140"/>
    <rect x="340" y="540" width="180" height="180"/>
    <rect x="560" y="580" width="260" height="120"/>
    <rect x="880" y="520" width="200" height="200"/>
    <rect x="1140" y="560" width="280" height="150"/>
  </g>
  <rect x="700" y="300" width="90" height="280" fill="#2a241f"/>
  <rect x="820" y="250" width="110" height="330" fill="#3a312a"/>
  <text x="80" y="80" fill="#1c1915" font-family="Georgia, serif" font-size="42">Parque</text>
</svg>`,
);

write(
  "fachada-b.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d5e2ea"/>
      <stop offset="1" stop-color="#f4efe6"/>
    </linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f1e7"/>
      <stop offset="1" stop-color="#e4d8c8"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1100" fill="url(#sky)"/>
  <rect y="980" width="800" height="120" fill="#d7cfc3"/>
  <rect x="120" y="140" width="560" height="820" fill="url(#stone)" stroke="#c3b29a"/>
  <rect x="200" y="70" width="400" height="80" fill="#1f1a17"/>
  <text x="400" y="122" text-anchor="middle" fill="#f4efe6" font-family="Georgia, serif" font-size="28" letter-spacing="6">TORRE B</text>
  <g fill="#9eb6c6" stroke="#8d7358" stroke-width="3">
    <rect x="176" y="198" width="176" height="132"/>
    <rect x="448" y="198" width="176" height="132"/>
    <rect x="176" y="462" width="176" height="132"/>
    <rect x="448" y="462" width="176" height="132"/>
    <rect x="176" y="726" width="176" height="132"/>
    <rect x="448" y="726" width="176" height="132"/>
  </g>
</svg>`,
);

write(
  "plano-piso.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="#f7f3ec"/>
  <rect x="40" y="80" width="1120" height="640" fill="none" stroke="#1c1915" stroke-width="8"/>
  <path d="M330 80 V720 M600 80 V720 M870 80 V720" stroke="#1c1915" stroke-width="6"/>
  <path d="M70 400 H310 M360 400 H570 M630 400 H840 M900 400 H1130" stroke="#c4b7a4" stroke-width="3"/>
  <text x="180" y="160" font-family="Georgia, serif" font-size="28" fill="#6b6258">A</text>
  <text x="450" y="160" font-family="Georgia, serif" font-size="28" fill="#6b6258">B</text>
  <text x="720" y="160" font-family="Georgia, serif" font-size="28" fill="#6b6258">C</text>
  <text x="990" y="160" font-family="Georgia, serif" font-size="28" fill="#6b6258">D</text>
</svg>`,
);

write(
  "plano-piso-b.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="#f7f3ec"/>
  <rect x="70" y="90" width="1060" height="620" fill="none" stroke="#1c1915" stroke-width="8"/>
  <path d="M600 90 V710" stroke="#1c1915" stroke-width="6"/>
  <text x="300" y="180" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="#6b6258">A</text>
  <text x="900" y="180" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="#6b6258">B</text>
</svg>`,
);

write(
  "masterplan.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="#e4efe2"/>
  <rect x="40" y="40" width="1120" height="720" fill="#d5e4d2" stroke="#8eaa86"/>
  <g fill="#f4efe6" stroke="#8d7b62" stroke-width="4">
    <rect x="100" y="130" width="280" height="220"/>
    <rect x="460" y="130" width="280" height="220"/>
    <rect x="820" y="130" width="280" height="220"/>
    <rect x="100" y="450" width="280" height="220"/>
    <rect x="460" y="450" width="280" height="220"/>
    <rect x="820" y="450" width="280" height="220"/>
  </g>
  <text x="600" y="80" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#1c1915">Loteo del parque</text>
</svg>`,
);

write(
  "panorama.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 600">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9ec0d4"/>
      <stop offset="1" stop-color="#f6efe4"/>
    </linearGradient>
  </defs>
  <rect width="2000" height="600" fill="url(#sky)"/>
  <rect y="380" width="2000" height="220" fill="#c5d2b8"/>
  <g fill="#2a241f">
    <rect x="80" y="220" width="70" height="180"/>
    <rect x="180" y="180" width="90" height="220"/>
    <rect x="400" y="250" width="60" height="150"/>
    <rect x="900" y="160" width="120" height="240"/>
    <rect x="1400" y="210" width="80" height="190"/>
    <rect x="1700" y="240" width="140" height="160"/>
  </g>
</svg>`,
);

write(
  "vista-altura.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b7d0de"/>
      <stop offset="1" stop-color="#f3ece2"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sky)"/>
  <rect y="520" width="1200" height="280" fill="#9aab8d"/>
  <rect x="80" y="300" width="40" height="240" fill="#2a241f"/>
  <rect x="200" y="260" width="70" height="280" fill="#3a312a"/>
  <rect x="700" y="220" width="90" height="320" fill="#241c17"/>
  <rect x="40" y="40" width="1120" height="720" fill="none" stroke="#1c1915" stroke-width="18"/>
</svg>`,
);

async function video() {
  const portada = await sharp(path.join(dir, "portada.svg")).resize(1280, 720).png().toBuffer();
  const aereo = await sharp(path.join(dir, "aereo.svg")).resize(1280, 720).png().toBuffer();
  const tmp = fs.mkdtempSync(path.join("/tmp", "alba-"));
  fs.writeFileSync(path.join(tmp, "a.png"), portada);
  fs.writeFileSync(path.join(tmp, "b.png"), aereo);
  const out = path.join(dir, "vuelo-intro.mp4");
  execSync(
    `ffmpeg -y -loop 1 -t 1.4 -i ${tmp}/a.png -loop 1 -t 1.4 -i ${tmp}/b.png -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.8:offset=0.6,format=yuv420p" -movflags +faststart -an ${out}`,
    { stdio: "inherit" },
  );
  console.log("vuelo-intro.mp4", fs.statSync(out).size);
}

video().catch((error) => {
  console.error(error);
  process.exit(1);
});
