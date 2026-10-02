import fs from "fs";
import path from "path";
import { facadeSvg } from "../src/lib/demo/geometry";

const target = path.join(process.cwd(), "public", "demo", "fachada.svg");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, facadeSvg());
console.log(target);
