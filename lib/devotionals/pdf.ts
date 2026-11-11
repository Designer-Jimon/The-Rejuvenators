export type DailyMealPdfInput = {
  churchName: string;
  tagline: string;
  dateLabel: string;
  title: string;
  scripture: string | null;
  bibleVerses: string | null;
  body: string;
  declaration: string | null;
  prayerPoints: string | null;
  logo?: { bytes: Uint8Array; type: string } | null;
};

type PreparedImage = {
  width: number;
  height: number;
  colorSpace: "DeviceGray" | "DeviceRGB";
  filter: "DCTDecode" | "FlateDecode";
  data: Uint8Array;
  alpha?: Uint8Array;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = 74;

const BRAND = "0.55 0.12 0.12";
const BRAND_DARK = "0.27 0.06 0.06";
const CHARCOAL = "0.18 0.16 0.15";
const MUTED = "0.42 0.39 0.37";
const CREAM = "1 0.97 0.93";
const GOLD = "0.86 0.67 0.28";
const WHITE = "1 1 1";

function ascii(value: string) {
  return value
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\n]/g, " ");
}

function pdfString(value: string) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function textCommand(
  value: string,
  x: number,
  y: number,
  size: number,
  font: "F1" | "F2",
  color: string,
) {
  return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(
    2,
  )} ${y.toFixed(2)} Tm (${pdfString(value)}) Tj ET`;
}

function estimatedWidth(value: string, size: number, bold = false) {
  return ascii(value).length * size * (bold ? 0.56 : 0.52);
}

function rightCommand(
  value: string,
  rightX: number,
  y: number,
  size: number,
  font: "F1" | "F2",
  color: string,
) {
  return textCommand(
    value,
    rightX - estimatedWidth(value, size, font === "F2"),
    y,
    size,
    font,
    color,
  );
}

function centerCommand(
  value: string,
  y: number,
  size: number,
  font: "F1" | "F2",
  color: string,
) {
  return textCommand(
    value,
    (PAGE_WIDTH - estimatedWidth(value, size, font === "F2")) / 2,
    y,
    size,
    font,
    color,
  );
}

function rectCommand(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  return `${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(
    2,
  )} ${height.toFixed(2)} re f`;
}

function wrapText(
  value: string,
  maxWidth: number,
  size: number,
  bold = false,
) {
  const maxChars = Math.max(
    8,
    Math.floor(maxWidth / (size * (bold ? 0.56 : 0.52))),
  );
  const words = ascii(value).replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!word) continue;
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

const encoder = new TextEncoder();

function bytes(value: string) {
  return encoder.encode(value);
}

function blobPart(value: Uint8Array) {
  return value.buffer.slice(
    value.byteOffset,
    value.byteOffset + value.byteLength,
  ) as ArrayBuffer;
}

async function deflate(value: Uint8Array) {
  const stream = new Blob([blobPart(value)])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(value: Uint8Array) {
  const stream = new Blob([blobPart(value)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function readU32(value: Uint8Array, offset: number) {
  return (
    ((value[offset] << 24) |
      (value[offset + 1] << 16) |
      (value[offset + 2] << 8) |
      value[offset + 3]) >>>
    0
  );
}

function jpegInfo(value: Uint8Array): {
  width: number;
  height: number;
  components: number;
} | null {
  if (value[0] !== 0xff || value[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < value.length) {
    if (value[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = value[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      offset += 2;
      continue;
    }
    const length = (value[offset + 2] << 8) | value[offset + 3];
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      const height = (value[offset + 5] << 8) | value[offset + 6];
      const width = (value[offset + 7] << 8) | value[offset + 8];
      const components = value[offset + 9];
      if (!width || !height) return null;
      return { width, height, components };
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

async function pngInfo(value: Uint8Array): Promise<PreparedImage | null> {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => value[index] === byte)) return null;

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Uint8Array[] = [];

  while (offset + 12 <= value.length) {
    const length = readU32(value, offset);
    const type = String.fromCharCode(
      value[offset + 4],
      value[offset + 5],
      value[offset + 6],
      value[offset + 7],
    );
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > value.length) return null;
    if (type === "IHDR") {
      width = readU32(value, dataStart);
      height = readU32(value, dataStart + 4);
      bitDepth = value[dataStart + 8];
      colorType = value[dataStart + 9];
      interlace = value[dataStart + 12];
    } else if (type === "IDAT") {
      idat.push(value.slice(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  const bpp =
    colorType === 6 ? 4 : colorType === 4 ? 2 : colorType === 2 ? 3 : 1;
  const supported =
    bitDepth === 8 &&
    interlace === 0 &&
    (colorType === 0 || colorType === 2 || colorType === 4 || colorType === 6);
  if (!supported || !width || !height || !idat.length) return null;

  const raw = await inflate(concatBytes(idat));
  const rowBytes = width * bpp;
  if (raw.length < (rowBytes + 1) * height) return null;
  const pixels = new Uint8Array(rowBytes * height);

  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (rowBytes + 1)];
    const source = row * (rowBytes + 1) + 1;
    const target = row * rowBytes;
    for (let column = 0; column < rowBytes; column += 1) {
      const valueByte = raw[source + column];
      const left =
        column >= bpp ? pixels[target + column - bpp] : 0;
      const up = row > 0 ? pixels[target - rowBytes + column] : 0;
      const upLeft =
        row > 0 && column >= bpp
          ? pixels[target - rowBytes + column - bpp]
          : 0;
      let result = valueByte;
      if (filter === 1) result = valueByte + left;
      else if (filter === 2) result = valueByte + up;
      else if (filter === 3) result = valueByte + Math.floor((left + up) / 2);
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const leftDistance = Math.abs(estimate - left);
        const upDistance = Math.abs(estimate - up);
        const upLeftDistance = Math.abs(estimate - upLeft);
        const predictor =
          leftDistance <= upDistance && leftDistance <= upLeftDistance
            ? left
            : upDistance <= upLeftDistance
              ? up
              : upLeft;
        result = valueByte + predictor;
      }
      pixels[target + column] = result & 0xff;
    }
  }

  const hasAlpha = colorType === 4 || colorType === 6;
  const channels = colorType === 0 || colorType === 4 ? 1 : 3;
  const color = new Uint8Array(width * height * channels);
  const alpha = hasAlpha ? new Uint8Array(width * height) : undefined;
  for (let index = 0; index < width * height; index += 1) {
    const source = index * bpp;
    for (let channel = 0; channel < channels; channel += 1) {
      color[index * channels + channel] = pixels[source + channel];
    }
    if (alpha) alpha[index] = pixels[source + channels];
  }

  return {
    width,
    height,
    colorSpace: channels === 1 ? "DeviceGray" : "DeviceRGB",
    filter: "FlateDecode",
    data: await deflate(color),
    alpha: alpha ? await deflate(alpha) : undefined,
  };
}

async function prepareImage(
  logo: DailyMealPdfInput["logo"],
): Promise<PreparedImage | null> {
  if (!logo?.bytes.length) return null;
  const type = logo.type.toLowerCase();
  const jpeg = jpegInfo(logo.bytes);
  if (jpeg && (type.includes("jpeg") || type.includes("jpg") || jpeg)) {
    if (jpeg.components === 1) {
      return {
        width: jpeg.width,
        height: jpeg.height,
        colorSpace: "DeviceGray",
        filter: "DCTDecode",
        data: logo.bytes,
      };
    }
    if (jpeg.components === 3) {
      return {
        width: jpeg.width,
        height: jpeg.height,
        colorSpace: "DeviceRGB",
        filter: "DCTDecode",
        data: logo.bytes,
      };
    }
    return null;
  }
  if (type.includes("png") || logo.bytes[0] === 0x89) {
    try {
      return await pngInfo(logo.bytes);
    } catch {
      return null;
    }
  }
  return null;
}

export async function buildDailyMealPdf(
  input: DailyMealPdfInput,
): Promise<Uint8Array> {
  const image = await prepareImage(input.logo);
  const pages: string[] = [];
  let current: string[] = [];
  let y = PAGE_HEIGHT - 200;

  const add = (command: string) => {
    current.push(command);
  };

  const newPage = (first: boolean) => {
    if (current.length) pages.push(current.join("\n"));
    current = [];
    if (first) {
      add(rectCommand(0, PAGE_HEIGHT - 164, PAGE_WIDTH, 164, BRAND));
      add(rectCommand(0, PAGE_HEIGHT - 168, PAGE_WIDTH, 4, GOLD));
      if (image) {
        const max = 62;
        const ratio = Math.min(max / image.width, max / image.height);
        const width = image.width * ratio;
        const height = image.height * ratio;
        add(
          `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${MARGIN.toFixed(
            2,
          )} ${(PAGE_HEIGHT - 108 - height / 2).toFixed(2)} cm /Logo Do Q`,
        );
      } else {
        add(
          rectCommand(
            MARGIN + 8,
            PAGE_HEIGHT - 94,
            46,
            46,
            "0.95 0.86 0.77",
          ),
        );
        add(
          textCommand(
            "IF",
            MARGIN + 24,
            PAGE_HEIGHT - 77,
            13,
            "F2",
            BRAND,
          ),
        );
      }
      add(
        textCommand(
          input.churchName,
          MARGIN + 78,
          PAGE_HEIGHT - 76,
          12,
          "F2",
          WHITE,
        ),
      );
      add(
        textCommand(
          input.tagline.toUpperCase(),
          MARGIN + 78,
          PAGE_HEIGHT - 93,
          8,
          "F1",
          "0.95 0.86 0.77",
        ),
      );
      add(
        textCommand(
          "DAILY MEAL",
          MARGIN + 78,
          PAGE_HEIGHT - 114,
          9,
          "F2",
          GOLD,
        ),
      );
      y = PAGE_HEIGHT - 198;
    } else {
      add(rectCommand(0, PAGE_HEIGHT - 46, PAGE_WIDTH, 46, BRAND));
      add(rectCommand(0, PAGE_HEIGHT - 50, PAGE_WIDTH, 4, GOLD));
      add(
        textCommand(
          input.churchName,
          MARGIN,
          PAGE_HEIGHT - 28,
          8,
          "F2",
          WHITE,
        ),
      );
      add(
        rightCommand(
          `DAILY MEAL  |  ${input.dateLabel}`,
          PAGE_WIDTH - MARGIN,
          PAGE_HEIGHT - 28,
          8,
          "F1",
          "0.95 0.86 0.77",
        ),
      );
      y = PAGE_HEIGHT - 72;
    }
  };

  const ensure = (height: number) => {
    if (y - height < BOTTOM) newPage(false);
  };

  const label = (value: string) => {
    ensure(30);
    y -= 6;
    add(textCommand(value, MARGIN, y, 8, "F2", BRAND));
    y -= 14;
  };

  const paragraph = (
    value: string,
    options?: { size?: number; lineHeight?: number; color?: string; bold?: boolean },
  ) => {
    const size = options?.size ?? 10.5;
    const lineHeight = options?.lineHeight ?? 16;
    const color = options?.color ?? CHARCOAL;
    const blocks = ascii(value).split(/\r?\n/);
    for (const block of blocks) {
      if (!block.trim()) {
        y -= lineHeight * 0.45;
        continue;
      }
      for (const line of wrapText(block, CONTENT_WIDTH, size, options?.bold)) {
        ensure(lineHeight);
        add(textCommand(line, MARGIN, y, size, options?.bold ? "F2" : "F1", color));
        y -= lineHeight;
      }
    }
  };

  newPage(true);

  label("TOPIC");
  for (const line of wrapText(input.title, CONTENT_WIDTH, 21, true)) {
    ensure(26);
    add(textCommand(line, MARGIN, y, 21, "F2", BRAND_DARK));
    y -= 26;
  }
  y -= 6;
  add(textCommand("DATE", MARGIN, y, 8, "F2", BRAND));
  add(textCommand(input.dateLabel, MARGIN + 44, y, 10, "F1", CHARCOAL));
  y -= 24;

  label("ANCHOR SCRIPTURE");
  if (input.scripture) {
    paragraph(input.scripture, { size: 12, lineHeight: 18, bold: true });
    y -= 2;
  }
  if (input.bibleVerses) {
    paragraph(input.bibleVerses, { size: 11, lineHeight: 18, color: MUTED });
  }
  y -= 8;

  label("DEVOTIONAL");
  paragraph(input.body);
  y -= 8;

  if (input.declaration) {
    ensure(54);
    add(rectCommand(MARGIN, y - 40, CONTENT_WIDTH, 40, "0.98 0.93 0.88"));
    add(textCommand("DECLARATION", MARGIN + 12, y - 15, 7.5, "F2", BRAND));
    for (const line of wrapText(
      input.declaration,
      CONTENT_WIDTH - 24,
      11,
      true,
    ).slice(0, 2)) {
      add(textCommand(line, MARGIN + 12, y - 29, 11, "F2", BRAND_DARK));
      break;
    }
    y -= 54;
    y -= 6;
  }

  if (input.prayerPoints) {
    label("PRAYER POINTS");
    paragraph(input.prayerPoints, { size: 10.5, lineHeight: 17 });
    y -= 10;
  }

  ensure(52);
  y -= 12;
  add(rectCommand(MARGIN, y - 34, CONTENT_WIDTH, 34, BRAND));
  add(centerCommand("PROVOKING REVIVAL!", y - 21, 13, "F2", WHITE));
  y -= 50;

  pages.push(current.join("\n"));

  const total = pages.length;
  const footer = (pageNumber: number) =>
    [
      `0.82 0.76 0.72 RG 0.6 w ${MARGIN} 46 m ${PAGE_WIDTH - MARGIN} 46 l S`,
      centerCommand(
        `Page ${pageNumber} of ${total}`,
        30,
        8,
        "F1",
        MUTED,
      ),
      centerCommand(input.churchName, 19, 6.5, "F1", "0.6 0.56 0.53"),
    ].join("\n");
  const finished = pages.map(
    (content, index) => `${content}\n${footer(index + 1)}`,
  );

  const objects: Array<Uint8Array> = [];
  const addObject = (value: string | Uint8Array) => {
    objects.push(typeof value === "string" ? bytes(value) : value);
    return objects.length;
  };
  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("<< >>");
  const fontRegular = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const fontBold = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );

  let imageId: number | null = null;
  if (image) {
    let smaskId: number | null = null;
    if (image.alpha) {
      smaskId = addObject(
        streamObject(
          `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`,
          image.alpha,
        ),
      );
    }
    imageId = addObject(
      streamObject(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${image.colorSpace} /BitsPerComponent 8 /Filter /${image.filter}${
          smaskId ? ` /SMask ${smaskId} 0 R` : ""
        }`,
        image.data,
      ),
    );
  }

  const resources = `<< /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >>${
    imageId ? ` /XObject << /Logo ${imageId} 0 R >>` : ""
  } >>`;
  const pageIds = finished.map((content) => {
    const contentId = addObject(streamObject("<<", bytes(content)));
    return addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources ${resources} /Contents ${contentId} 0 R >>`,
    );
  });
  objects[1] = bytes(
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>`,
  );

  const chunks: Uint8Array[] = [];
  let length = 0;
  const push = (value: Uint8Array) => {
    chunks.push(value);
    length += value.length;
  };
  push(bytes("%PDF-1.4\n"));
  const offsets: number[] = [];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(length);
    push(bytes(`${index + 1} 0 obj\n`));
    push(objects[index]);
    push(bytes("\nendobj\n"));
  }
  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  push(bytes(xref));
  return concatBytes(chunks);
}

function streamObject(dictionary: string, data: Uint8Array) {
  return concatBytes([
    bytes(`${dictionary} /Length ${data.length} >>\nstream\n`),
    data,
    bytes("\nendstream"),
  ]);
}
