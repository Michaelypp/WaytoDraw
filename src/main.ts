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
  ) {}

  draw(target: CanvasRenderingContext2D): void {
    target.save();
    target.fillStyle = "#183b32";
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
  border: 1px solid #b9c8bd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f4f1e8;
    color: #183b32;
    font-family: system-ui, sans-serif;
  }
  main { max-width: 980px; margin: auto; padding: 32px 20px; }
  h1 {
  margin: 24px 0 16px;
  text-align: center;
  font-size: clamp(36px, 7vw, 64px);
  font-weight: 800;
  letter-spacing: -2px;
  color: #24664f;
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
    border: 1px solid #d7ded4;
    border-radius: 14px;
    margin: 18px 0;
  }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; }
  button {
    padding: 10px 14px;
    border: 1px solid #b9c8bd;
    border-radius: 8px;
    background: #fff;
    color: #183b32;
    font: inherit;
    cursor: pointer;
  }
  button:hover:not(:disabled) { background: #edf4ed; }
  button[aria-pressed="true"] {
    color: white;
    background: #24664f;
    border-color: #24664f;
  }
  button:disabled { opacity: .4; cursor: default; }
  button:focus-visible { outline: 3px solid #d39938; }
  canvas {
    display: block;
    width: 100%;
    height: auto;
    background: white;
    border: 2px solid #718d7a;
    border-radius: 8px;
    touch-action: none;
    cursor: crosshair;
  }
  #status { min-height: 26px; }
`;
document.head.append(style);

app.innerHTML = `
  <main>
    <h1>Way to Draw</h1>
    <p>Its time to have some creativity folks!!!!!!!</p>
    <section class="panel" aria-label="Drawing tools">
      <div id="tools" class="toolbar"></div>
      <label class="color-control">
  Brush color
  <input id="brush-color" type="color" value="#24664f">
</label>
      <p id="status" role="status"></p>
      <button id="custom" type="button">+ Create sticker</button>
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
    <p>>Tip: Use the Undo and Redo buttons to step through your drawing history.</p>
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
    color: "#24664f",
    width: 3,
  },
  {
    id: "thick",
    kind: "marker",
    name: "Thick marker",
    color: "#24664f",
    width: 12,
  },
  {
    id: "flower",
    kind: "sticker",
    name: "Flower",
    text: "🌼",
    size: 44,
  },
  {
    id: "leaf",
    kind: "sticker",
    name: "Leaf",
    text: "🌿",
    size: 44,
  },
  {
    id: "butterfly",
    kind: "sticker",
    name: "Butterfly",
    text: "🦋",
    size: 44,
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
