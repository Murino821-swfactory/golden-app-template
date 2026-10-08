import { writeFileSync } from "node:fs";
import { llmsText } from "../lib/seo";
writeFileSync("public/llms.txt", llmsText());
console.log("llms.txt generated from configured public content");
