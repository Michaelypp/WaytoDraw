type Point = { x: number; y: number };
type Tool =
  | {
    id: string;
    kind: "marker";
    name: string;
    color: string;
    width: number;
  }
  | {
    id: string;
    kind: "sticker";
    name: string;
    text: string;
    size: number;
    color?: string;
  };

interface DrawingCommand {
  draw(target: CanvasRenderingContext2D): void;
}

class StrokeCommand implements DrawingCommand {
  constructor(
    readonly points: Point[],
    readonly color: string,
    readonly width: number,
  ) {}

  draw(target: CanvasRenderingContext2D): void {
    const first = this.points[0];
    if (!first) return;

    target.save();
    target.strokeStyle = this.color;
    target.fillStyle = this.color;
    target.lineWidth = this.width;
    target.lineCap = "round";
    target.lineJoin = "round";

    if (this.points.length === 1) {
      target.beginPath();
      target.arc(first.x, first.y, this.width / 2, 0, Math.PI * 2);
      target.fill();
    } else {
      target.beginPath();
      target.moveTo(first.x, first.y);
      for (const point of this.points.slice(1)) {
        target.lineTo(point.x, point.y);
      }
      target.stroke();
    }

    target.restore();
  }
}

class StickerCommand implements DrawingCommand {
  constructor(
    readonly position: Point,
    readonly text: string,
    readonly size: number,
    readonly color: string = "#332b26",
  ) {}

  draw(target: CanvasRenderingContext2D): void {
    target.save();
    target.fillStyle = this.color;
    target.font = `${this.size}px system-ui, sans-serif`;
    target.textAlign = "center";
    target.textBaseline = "middle";
    target.fillText(this.text, this.position.x, this.position.y);
    target.restore();
  }
}

class DrawingHistory {
  private commands: DrawingCommand[] = [];
  private cursor = 0;

  get active(): readonly DrawingCommand[] {
    return this.commands.slice(0, this.cursor);
  }

  get canUndo(): boolean {
    return this.cursor > 0;
  }

  get canRedo(): boolean {
    return this.cursor < this.commands.length;
  }

  commit(command: DrawingCommand): void {
    this.commands.splice(this.cursor);
    this.commands.push(command);
    this.cursor++;
  }

  undo(): void {
    if (this.canUndo) this.cursor--;
  }

  redo(): void {
    if (this.canRedo) this.cursor++;
  }
}

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app element");

document.title = "Way to Draw";

const style = document.createElement("style");
style.textContent = `
.color-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

#brush-color {
  width: 48px;
  height: 36px;
  padding: 2px;
  border: 1px solid #d4c5b8;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f4f1e8;
    color: #332b26;
    font-family: system-ui, sans-serif;
  }
  main { max-width: 980px; margin: auto; padding: 32px 20px; }
  h1 {
  margin: 24px 0 16px;
  text-align: center;
  font-size: clamp(36px, 7vw, 64px);
  font-weight: 800;
  letter-spacing: -2px;
  color: #a34f3e;
  transform-origin: center;
  animation: titleFloat 3s ease-in-out infinite;
}

@keyframes titleFloat {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(0.94);
  }
}

h1 + p {
  text-align: center;
  margin-bottom: 28px;
}

@media (prefers-reduced-motion: reduce) {
  h1 {
    animation: none;
  }
}
  p { line-height: 1.6; }
  .panel {
    background: white;
    padding: 16px;
    border: 1px solid #dfd3c7;
    border-radius: 14px;
    margin: 18px 0;
  }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; }
  button {
    padding: 10px 14px;
    border: 1px solid #b9c8bd;
    border-radius: 8px;
    background: #fff;
    color: #332b26;
    font: inherit;
    cursor: pointer;
  }
  button:hover:not(:disabled) { background: #f5e8df; }
  button[aria-pressed="true"] {
    color: white;
    background: #a34f3e;
    border-color: #a34f3e;
  }
  button:disabled { opacity: .4; cursor: default; }
  button:focus-visible { outline: 3px solid #d39938; }
 canvas {
  display: block;
  width: 100%;
  height: auto;
  background: white;
  border: 12px solid #98745b;
  border-radius: 3px;
  box-shadow:
    0 0 0 2px #674b39,
    0 0 0 10px #ede2cf,
    0 0 0 12px #c7b59d,
    0 18px 40px #30211635;
  touch-action: none;
  cursor: crosshair;
  margin: 30px 0;
}
  #status { min-height: 26px; }
  body {
  isolation: isolate;
}

main {
  position: relative;
  z-index: 1;
}

.art-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.4;
}

.art-lane {
  flex: 1;
  min-height: 0;
}

.art-track {
  display: flex;
  width: max-content;
  height: 100%;
  animation: galleryFlow 65s linear infinite;
}

.art-lane:nth-child(even) .art-track {
  animation-direction: reverse;
}

.art-lane:nth-child(2) .art-track {
  animation-duration: 80s;
  animation-delay: -20s;
}

.art-lane:nth-child(3) .art-track {
  animation-duration: 72s;
  animation-delay: -36s;
}

.art-lane:nth-child(4) .art-track {
  animation-duration: 90s;
  animation-delay: -12s;
}

.art-group {
  display: flex;
  flex-shrink: 0;
  justify-content: space-around;
  gap: 20px;
  min-width: 100vw;
  height: 100%;
  padding-right: 20px;
}

.art-card {
  flex-shrink: 0;
  width: clamp(180px, 24vw, 380px);
  height: 100%;
  padding: 7px;
  background: #fffaf0;
  border: 1px solid #ddd3be;
  border-radius: 4px;
  box-shadow: 0 6px 16px #48372020;
}

.art-card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
}

@keyframes galleryFlow {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .art-track {
    animation: none;
  }
}
  .title-card {
  width: fit-content;
  max-width: 100%;
  margin: 0 auto 24px;
  padding: 24px 40px;
  text-align: center;
  background: rgba(255, 252, 244, 0.94);
  border: 1px solid #ded5c1;
  border-radius: 18px;
  box-shadow: 0 12px 32px #30291b18;
  backdrop-filter: blur(12px);
}

.title-card h1 {
  margin: 0 0 12px;
  color: #402d27;
  font-size: clamp(36px, 5vw, 60px);
  letter-spacing: -1.5px;
}

.title-card p {
  margin: 0;
  color: #756257;
  font-size: 15px;
  line-height: 1.6;
}
  .tools-panel {
  padding: 16px 18px;
}

.tool-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #ece2d5;
}

.tool-options .color-control {
  margin: 0;
  font-size: 14px;
}

.tool-options #status {
  flex: 1;
  min-width: 140px;
  min-height: 0;
  margin: 0;
  color: #756257;
  font-size: 13px;
}

.tool-options #custom {
  margin-left: auto;
}

button {
  border-color: #d4c5b8;
}
  .art-background.is-paused .art-track {
  animation-play-state: paused;
}
`;
document.head.append(style);
const bridgeArt = new URL(
  "./assets/water-lily-pond-with-japanese-bridge.jpg",
  import.meta.url,
).href;

const liliesArt = new URL(
  "./assets/water-lilies-harmony-in-blue.jpg",
  import.meta.url,
).href;

const mirrorArt = new URL(
  "./assets/girl-before-a-mirro.jpg",
  import.meta.url,
).href;

const weepingArt = new URL(
  "./assets/Picasso_The_Weeping_Woman_Tate_identifier_T05010_10.jpg",
  import.meta.url,
).href;
const starryNightArt = new URL(
  "./assets/Van_Gogh_-_Starry_Night.jpg",
  import.meta.url,
).href;

const greatWaveArt = new URL(
  "./assets/source.jpg",
  import.meta.url,
).href;

const wheatFieldArt = new URL(
  "./assets/Wheat-Field-with-Cypresses.jpg",
  import.meta.url,
).href;

const gleanersArt = new URL(
  "./assets/Millet_-_Gleaners.jpg",
  import.meta.url,
).href;

const artworkImages = [
  bridgeArt,
  mirrorArt,
  starryNightArt,
  gleanersArt,
  liliesArt,
  weepingArt,
  greatWaveArt,
  wheatFieldArt,
];

const backgroundMarkup = `
  <div class="art-background" aria-hidden="true">
    ${
  Array.from({ length: 4 }, (_, row) => {
    const images = [
      ...artworkImages.slice(row),
      ...artworkImages.slice(0, row),
    ];

    const group = `
      <div class="art-group">
        ${
      images.map((src) =>
        `<div class="art-card"><img src="${src}" alt=""></div>`
      ).join("")
    }
      </div>
    `;

    return `
      <div class="art-lane">
        <div class="art-track">${group}${group}</div>
      </div>
    `;
  }).join("")
}
  </div>
`;
app.innerHTML = `
  ${backgroundMarkup}
  <main>
  <header class="title-card">
    <h1>Way to Draw</h1>
    <p>Its time to have some creativity folks!!!!!!!</p>
  </header>
    <section class="panel tools-panel" aria-label="Drawing tools">
  <div id="tools" class="toolbar"></div>

  <div class="tool-options">
    <label class="color-control">
      Brush color
      <input id="brush-color" type="color" value="#a34f3e">
    </label>

    <p id="status" role="status"></p>

    <button id="custom" type="button">+ Create sticker</button>
    <button id="toggle-background" type="button" aria-pressed="false">
  Pause background
</button>
  </div>
</section>
    <canvas
      id="drawing"
      width="800"
      height="500"
      aria-label="Drawing area. Drag to draw or click to place a sticker."
    ></canvas>
    <section class="panel">
      <div class="toolbar">
        <button id="undo" type="button">Undo</button>
        <button id="redo" type="button">Redo</button>
        <button id="redraw" type="button">Redraw</button>
        <button id="export" type="button">Export PNG</button>
      </div>
    </section>
    <p>Little Tip for you: Use the Undo and Redo buttons to step through your drawing history.</p>
  </main>
`;

function element<T extends HTMLElement>(selector: string): T {
  const result = app!.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}

const canvas = element<HTMLCanvasElement>("#drawing");
const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas 2D is unavailable");

const palette = element<HTMLDivElement>("#tools");
const status = element<HTMLParagraphElement>("#status");
const undoButton = element<HTMLButtonElement>("#undo");
const redoButton = element<HTMLButtonElement>("#redo");
const exportButton = element<HTMLButtonElement>("#export");

const tools: Tool[] = [
  {
    id: "thin",
    kind: "marker",
    name: "Thin marker",
    color: "#a34f3e",
    width: 3,
  },
  {
    id: "thick",
    kind: "marker",
    name: "Thick marker",
    color: "#a34f3e",
    width: 12,
  },
  {
    id: "star",
    kind: "sticker",
    name: "Star",
    text: "✦",
    size: 44,
    color: "#ecfd00",
  },
  {
    id: "diamond",
    kind: "sticker",
    name: "Diamond",
    text: "💎",
    size: 40,
    color: "#179bf3",
  },
  {
    id: "circle",
    kind: "sticker",
    name: "Circle",
    text: "●",
    size: 36,
  },
];

const history = new DrawingHistory();
let selectedTool: Tool = tools[0]!;
let customCount = 0;
const colorPicker = element<HTMLInputElement>("#brush-color");

type Gesture = {
  pointerId: number;
  tool: Tool;
  points: Point[];
};

let gesture: Gesture | null = null;

function renderDocument(
  target: CanvasRenderingContext2D,
  commands: readonly DrawingCommand[],
): void {
  target.save();
  target.fillStyle = "#ffffff";
  target.fillRect(0, 0, canvas.width, canvas.height);
  for (const command of commands) {
    command.draw(target);
  }
  target.restore();
}

function commandForGesture(current: Gesture): DrawingCommand {
  if (current.tool.kind === "marker") {
    return new StrokeCommand(
      current.points.map((point) => ({ ...point })),
      current.tool.color,
      current.tool.width,
    );
  }

  return new StickerCommand(
    { ...current.points[0]! },
    current.tool.text,
    current.tool.size,
    current.tool.color,
  );
}
function redraw(): void {
  context!.clearRect(0, 0, canvas.width, canvas.height);
  renderDocument(context!, history.active);

  if (gesture) {
    commandForGesture(gesture).draw(context!);
  }

  undoButton.disabled = !history.canUndo;
  redoButton.disabled = !history.canRedo;
}

function releaseGesture(): void {
  const current = gesture;
  gesture = null;

  if (current && canvas.hasPointerCapture(current.pointerId)) {
    canvas.releasePointerCapture(current.pointerId);
  }
}

function cancelGesture(): void {
  releaseGesture();
  redraw();
}

function renderPalette(): void {
  palette.replaceChildren();

  for (const tool of tools) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = tool.kind === "sticker"
      ? `${tool.text} ${tool.name}`
      : tool.name;
    button.setAttribute("aria-pressed", String(tool.id === selectedTool.id));
    button.addEventListener("click", () => {
      cancelGesture();
      selectedTool = tool;
      renderPalette();
    });
    palette.append(button);
  }

  status.textContent = `Selected: ${selectedTool.name}`;
}

function documentPoint(event: PointerEvent): Point {
  const bounds = canvas.getBoundingClientRect();

  // Remove the CSS border before scaling into document coordinates.
  const x = event.clientX - bounds.left - canvas.clientLeft;
  const y = event.clientY - bounds.top - canvas.clientTop;

  return {
    x: Math.max(
      0,
      Math.min(canvas.width, x * canvas.width / canvas.clientWidth),
    ),
    y: Math.max(
      0,
      Math.min(canvas.height, y * canvas.height / canvas.clientHeight),
    ),
  };
}

canvas.addEventListener("pointerdown", (event) => {
  if (gesture || !event.isPrimary || event.button !== 0) return;

  event.preventDefault();
  gesture = {
    pointerId: event.pointerId,
    tool: selectedTool.kind === "marker"
      ? { ...selectedTool, color: colorPicker.value }
      : { ...selectedTool },
    points: [documentPoint(event)],
  };
  canvas.setPointerCapture(event.pointerId);
  redraw();
});

canvas.addEventListener("pointermove", (event) => {
  if (!gesture || gesture.pointerId !== event.pointerId) return;

  if (gesture.tool.kind === "marker") {
    gesture.points.push(documentPoint(event));
    redraw();
  }
});

canvas.addEventListener("pointerup", (event) => {
  if (!gesture || gesture.pointerId !== event.pointerId) return;

  if (gesture.tool.kind === "marker") {
    gesture.points.push(documentPoint(event));
  }

  const command = commandForGesture(gesture);
  releaseGesture();
  history.commit(command);
  redraw();
});

canvas.addEventListener("pointercancel", (event) => {
  if (gesture?.pointerId === event.pointerId) cancelGesture();
});

canvas.addEventListener("lostpointercapture", (event) => {
  if (gesture?.pointerId === event.pointerId) cancelGesture();
});

globalThis.addEventListener("keydown", (event) => {
  if (event.key === "Escape") cancelGesture();
});

globalThis.addEventListener("blur", cancelGesture);

undoButton.addEventListener("click", () => {
  releaseGesture();
  history.undo();
  redraw();
});

redoButton.addEventListener("click", () => {
  releaseGesture();
  history.redo();
  redraw();
});

element<HTMLButtonElement>("#redraw").addEventListener("click", redraw);

element<HTMLButtonElement>("#custom").addEventListener("click", () => {
  const name = globalThis.prompt("Name your sticker:");
  if (!name?.trim()) return;

  const text = globalThis.prompt(
    "Enter an emoji or short text (up to 12 characters):",
  );
  if (!text?.trim()) return;

  const content = text.trim();
  if (Array.from(content).length > 12) {
    status.textContent = "Please use an emoji or text of up to 12 characters.";
    return;
  }

  customCount++;
  tools.push({
    id: `custom-${customCount}`,
    kind: "sticker",
    name: name.trim(),
    text: content,
    size: 44,
  });
  renderPalette();
  status.textContent =
    `Created ${name.trim()}. Select it from the tools above.`;
});

exportButton.addEventListener("click", () => {
  const output = document.createElement("canvas");
  output.width = canvas.width * 2;
  output.height = canvas.height * 2;

  const exportContext = output.getContext("2d");
  if (!exportContext) {
    status.textContent = "PNG export is unavailable.";
    return;
  }

  exportContext.scale(2, 2);
  renderDocument(exportContext, history.active);

  output.toBlob((blob) => {
    if (!blob) {
      status.textContent = "PNG export failed. Please try again.";
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "way-to-draw.png";
    document.body.append(link);
    link.click();
    link.remove();

    globalThis.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    status.textContent = "Exported PNG at 1600 × 1000.";
  }, "image/png");
});

renderPalette();
redraw();
const background = element<HTMLDivElement>(".art-background");
const backgroundButton = element<HTMLButtonElement>("#toggle-background");

backgroundButton.addEventListener("click", () => {
  const paused = background.classList.toggle("is-paused");
  backgroundButton.setAttribute("aria-pressed", String(paused));
  backgroundButton.textContent = paused
    ? "Resume background"
    : "Pause background";
});
