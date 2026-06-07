// Cache de sprites de segmento da cobra.
//
// Cada sprite e um disco com gradiente radial (centro claro -> cor base -> rim
// escuro) que da sensacao de volume, no estilo Slither.io mobile. Os sprites
// sao gerados uma unica vez por (cor + raio) e reaproveitados a cada frame,
// evitando recriar gradientes dentro do loop de render e mantendo o custo baixo
// mesmo para cobras grandes.

type Sprite = HTMLCanvasElement;

const cache = new Map<string, Sprite>();
let colorParserContext: CanvasRenderingContext2D | null = null;

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const parseHex = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = Number.parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const getColorParserContext = (): CanvasRenderingContext2D | null => {
  if (colorParserContext) {
    return colorParserContext;
  }

  const canvas = document.createElement('canvas');
  colorParserContext = canvas.getContext('2d');
  return colorParserContext;
};

const parseCssColor = (color: string): [number, number, number] => {
  if (color.startsWith('#')) {
    return parseHex(color);
  }

  const ctx = getColorParserContext();
  if (!ctx) {
    return [255, 255, 255];
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillStyle = color;
  return parseHex(ctx.fillStyle);
};

const toRgb = (rgb: [number, number, number]): string => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

// amount > 0 clareia em direcao ao branco; amount < 0 escurece em direcao ao preto.
const shade = (rgb: [number, number, number], amount: number): [number, number, number] => {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return [
    clampByte(rgb[0] + (target - rgb[0]) * t),
    clampByte(rgb[1] + (target - rgb[1]) * t),
    clampByte(rgb[2] + (target - rgb[2]) * t),
  ];
};

// Quantiza o raio para reaproveitar sprites entre tamanhos proximos e limitar o
// numero de entradas no cache (o taper gera muitos raios diferentes).
const bucketRadius = (radius: number): number => Math.max(2, Math.round(radius / 1.5) * 1.5);

export const getSegmentSprite = (color: string, radius: number): Sprite => {
  const r = bucketRadius(radius);
  const key = `${color}:${r}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const pad = Math.ceil(r * 0.3) + 2; // espaco para o rim escuro nao ser cortado
  const size = Math.ceil((r + pad) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cache.set(key, canvas);
    return canvas;
  }

  const cx = size / 2;
  const cy = size / 2;
  const base = parseCssColor(color);
  const light = shade(base, 0.34);
  const dark = shade(base, -0.36);

  // Highlight deslocado para cima/esquerda imita luz vindo de cima.
  const gradient = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, r * 0.08, cx, cy, r);
  gradient.addColorStop(0, toRgb(light));
  gradient.addColorStop(0.55, toRgb(base));
  gradient.addColorStop(1, toRgb(dark));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  cache.set(key, canvas);
  return canvas;
};
