import { wireReels, alignHeadshots, toString } from "./components.js";
import page from "./page.js";

const app = document.getElementById("app");
const content = await fetch("content.json").then((r) => r.json());

app.innerHTML = toString(page(content));
wireReels(app);
alignHeadshots(app);
