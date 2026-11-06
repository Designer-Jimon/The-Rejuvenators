const decoder = new TextDecoder("utf-8");

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, number: string) =>
      String.fromCodePoint(Number.parseInt(number, 10)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

async function inflate(
  bytes: Uint8Array,
  format: "deflate" | "deflate-raw",
) {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractDocx(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 < bytes.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.length) break;
    const name = decoder.decode(bytes.slice(nameStart, nameEnd));
    const dataStart = nameEnd + extraLength;
    if (compressedSize === 0 || dataStart + compressedSize > bytes.length) {
      break;
    }
    if (name === "word/document.xml") {
      const raw = bytes.slice(dataStart, dataStart + compressedSize);
      const xmlBytes = method === 0 ? raw : await inflate(raw, "deflate-raw");
      const xml = decoder.decode(xmlBytes);
      const text = decodeEntities(
        xml
          .replace(/<w:tab[^>]*\/>/gi, "\t")
          .replace(/<w:br[^>]*\/>/gi, "\n")
          .replace(/<\/w:p>/gi, "\n")
          .replace(/<[^>]+>/g, ""),
      )
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      if (text.length < 20) {
        throw new Error("The Word document does not contain readable text.");
      }
      return text;
    }
    offset = dataStart + compressedSize;
  }
  throw new Error("Could not read the Word document. Paste the text instead.");
}

function decodePdfString(value: string) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, char: string) => {
      const map: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        "(": "(",
        ")": ")",
        "\\": "\\",
      };
      return map[char] ?? char;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    )
    .replace(/\\\r?\n/g, "");
}

function pdfText(content: string) {
  const parts: string[] = [];
  const block = /BT([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  while ((match = block.exec(content))) {
    const body = match[1];
    const literal = /\((?:\\.|[^\\()])*\)/g;
    let item: RegExpExecArray | null;
    while ((item = literal.exec(body))) {
      parts.push(decodePdfString(item[0].slice(1, -1)));
    }
    const hex = /<([0-9a-fA-F\s]+)>/g;
    while ((item = hex.exec(body))) {
      const clean = item[1].replace(/\s+/g, "");
      if (clean.length % 2) continue;
      const bytes = new Uint8Array(clean.length / 2);
      for (let index = 0; index < clean.length; index += 2) {
        bytes[index / 2] = Number.parseInt(clean.slice(index, index + 2), 16);
      }
      parts.push(new TextDecoder("utf-16be").decode(bytes));
    }
  }
  return parts
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

async function extractPdf(bytes: Uint8Array) {
  const latin = new TextDecoder("windows-1252").decode(bytes);
  const chunks: string[] = [latin];
  let cursor = 0;
  while (cursor < latin.length) {
    const start = latin.indexOf("stream", cursor);
    if (start === -1) break;
    const dataStart = start + 6 + (latin[start + 6] === "\r" ? 1 : 0);
    const normalizedStart =
      latin[dataStart] === "\n" ? dataStart + 1 : dataStart;
    const end = latin.indexOf("endstream", normalizedStart);
    if (end === -1) break;
    let text = latin.slice(normalizedStart, end).replace(/\r?\n$/, "");
    const raw = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
    if (raw[0] === 0x78) {
      try {
        const inflated = await inflate(raw, "deflate");
        text = new TextDecoder("windows-1252").decode(inflated);
      } catch {
        // Some PDF streams are not text or use unsupported filters.
      }
    }
    chunks.push(text);
    cursor = end + 9;
  }

  const text = chunks
    .map((chunk) => pdfText(chunk))
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length < 40) {
    throw new Error(
      "Could not extract enough text from this PDF. Paste the sermon text manually.",
    );
  }
  return text;
}

export async function extractSermonText(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (
    type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  ) {
    const text = decoder.decode(bytes).trim();
    if (!text) throw new Error("The text file is empty.");
    return text;
  }
  if (name.endsWith(".docx") || type.includes("wordprocessingml")) {
    return extractDocx(bytes);
  }
  if (name.endsWith(".pdf") || type === "application/pdf") {
    return extractPdf(bytes);
  }
  if (name.endsWith(".doc")) {
    throw new Error(
      "Legacy .doc files cannot be read here. Save as .docx, PDF or paste the text.",
    );
  }
  throw new Error("Upload a TXT, DOCX or PDF file, or paste the sermon text.");
}

export function sermonFileExtension(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".md")) return "md";
  if (name.endsWith(".txt")) return "txt";
  return "bin";
}
