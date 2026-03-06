export type ArchiveFormat = "zip" | "tar";

export type ArchiveInputFile = {
  name: string;
  bytes: Uint8Array;
};

export type ArchiveEntry = {
  name: string;
  size: number;
  compressedSize: number;
  isDirectory: boolean;
  format: ArchiveFormat;
};

function toUtf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function fromUtf8(input: Uint8Array): string {
  return new TextDecoder().decode(input);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((acc, part) => acc + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function readU16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function readU32(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0;
}

function writeU16(data: Uint8Array, offset: number, value: number) {
  data[offset] = value & 0xff;
  data[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(data: Uint8Array, offset: number, value: number) {
  data[offset] = value & 0xff;
  data[offset + 1] = (value >>> 8) & 0xff;
  data[offset + 2] = (value >>> 16) & 0xff;
  data[offset + 3] = (value >>> 24) & 0xff;
}

// CRC32 table + checksum for ZIP compatibility.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type ZipDirEntry = {
  name: string;
  method: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  isDirectory: boolean;
};

function findZipEocd(data: Uint8Array): number {
  const sig = 0x06054b50;
  const start = Math.max(0, data.length - 65557);
  for (let i = data.length - 22; i >= start; i--) {
    if (readU32(data, i) === sig) return i;
  }
  return -1;
}

function parseZipDirectory(data: Uint8Array): ZipDirEntry[] {
  const eocdOffset = findZipEocd(data);
  if (eocdOffset < 0) throw new Error("Invalid ZIP: end of central directory not found.");

  const cdSize = readU32(data, eocdOffset + 12);
  const cdOffset = readU32(data, eocdOffset + 16);

  if (cdOffset + cdSize > data.length) {
    throw new Error("Invalid ZIP: central directory out of bounds.");
  }

  const entries: ZipDirEntry[] = [];
  let p = cdOffset;
  const end = cdOffset + cdSize;

  while (p < end) {
    const sig = readU32(data, p);
    if (sig !== 0x02014b50) throw new Error("Invalid ZIP: central directory entry signature mismatch.");

    const method = readU16(data, p + 10);
    const compressedSize = readU32(data, p + 20);
    const uncompressedSize = readU32(data, p + 24);
    const nameLen = readU16(data, p + 28);
    const extraLen = readU16(data, p + 30);
    const commentLen = readU16(data, p + 32);
    const extAttrs = readU32(data, p + 38);
    const localHeaderOffset = readU32(data, p + 42);

    const nameStart = p + 46;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > data.length) throw new Error("Invalid ZIP: entry name out of bounds.");

    const name = fromUtf8(data.slice(nameStart, nameEnd));
    const isDirectory = name.endsWith("/") || (extAttrs & 0x10) !== 0;

    entries.push({
      name,
      method,
      crc: readU32(data, p + 16),
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      isDirectory,
    });

    p = nameEnd + extraLen + commentLen;
  }

  return entries;
}

function getZipDataSlice(data: Uint8Array, entry: ZipDirEntry): Uint8Array {
  const p = entry.localHeaderOffset;
  if (readU32(data, p) !== 0x04034b50) throw new Error(`Invalid ZIP: local header missing for ${entry.name}.`);
  const nameLen = readU16(data, p + 26);
  const extraLen = readU16(data, p + 28);
  const start = p + 30 + nameLen + extraLen;
  const end = start + entry.compressedSize;
  if (end > data.length) throw new Error(`Invalid ZIP: payload out of bounds for ${entry.name}.`);
  return data.slice(start, end);
}

export function createZip(files: ArchiveInputFile[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = file.name.replace(/\\/g, "/");
    const nameBytes = toUtf8(name);
    const body = file.bytes;
    const crc = crc32(body);

    const localHeader = new Uint8Array(30);
    writeU32(localHeader, 0, 0x04034b50);
    writeU16(localHeader, 4, 20);
    writeU16(localHeader, 6, 0);
    writeU16(localHeader, 8, 0); // store (no compression)
    writeU16(localHeader, 10, 0);
    writeU16(localHeader, 12, 0);
    writeU32(localHeader, 14, crc);
    writeU32(localHeader, 18, body.length);
    writeU32(localHeader, 22, body.length);
    writeU16(localHeader, 26, nameBytes.length);
    writeU16(localHeader, 28, 0);

    localParts.push(localHeader, nameBytes, body);

    const centralHeader = new Uint8Array(46);
    writeU32(centralHeader, 0, 0x02014b50);
    writeU16(centralHeader, 4, 20);
    writeU16(centralHeader, 6, 20);
    writeU16(centralHeader, 8, 0);
    writeU16(centralHeader, 10, 0);
    writeU16(centralHeader, 12, 0);
    writeU16(centralHeader, 14, 0);
    writeU32(centralHeader, 16, crc);
    writeU32(centralHeader, 20, body.length);
    writeU32(centralHeader, 24, body.length);
    writeU16(centralHeader, 28, nameBytes.length);
    writeU16(centralHeader, 30, 0);
    writeU16(centralHeader, 32, 0);
    writeU16(centralHeader, 34, 0);
    writeU16(centralHeader, 36, 0);
    writeU32(centralHeader, 38, 0);
    writeU32(centralHeader, 42, offset);
    centralParts.push(centralHeader, nameBytes);

    offset += localHeader.length + nameBytes.length + body.length;
  }

  const central = concatBytes(centralParts);
  const local = concatBytes(localParts);
  const eocd = new Uint8Array(22);
  writeU32(eocd, 0, 0x06054b50);
  writeU16(eocd, 4, 0);
  writeU16(eocd, 6, 0);
  writeU16(eocd, 8, files.length);
  writeU16(eocd, 10, files.length);
  writeU32(eocd, 12, central.length);
  writeU32(eocd, 16, local.length);
  writeU16(eocd, 20, 0);

  return concatBytes([local, central, eocd]);
}

export function listZipEntries(data: Uint8Array): ArchiveEntry[] {
  return parseZipDirectory(data).map((entry) => ({
    name: entry.name,
    size: entry.uncompressedSize,
    compressedSize: entry.compressedSize,
    isDirectory: entry.isDirectory,
    format: "zip",
  }));
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Deflate extraction requires DecompressionStream support in this browser.");
  }
  const stream = new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

export async function extractZipEntries(data: Uint8Array): Promise<ArchiveInputFile[]> {
  const entries = parseZipDirectory(data);
  const out: ArchiveInputFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const payload = getZipDataSlice(data, entry);
    let bytes: Uint8Array;
    if (entry.method === 0) {
      bytes = payload;
    } else if (entry.method === 8) {
      bytes = await inflateRaw(payload);
    } else {
      throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}.`);
    }
    out.push({ name: entry.name, bytes });
  }

  return out;
}

function padTo512(length: number): number {
  const mod = length % 512;
  return mod === 0 ? 0 : 512 - mod;
}

function writeOctal(value: number, width: number): Uint8Array {
  const s = value.toString(8).padStart(width - 1, "0");
  return toUtf8(`${s}\0`);
}

function createTarHeader(name: string, size: number): Uint8Array {
  const h = new Uint8Array(512);
  const nameBytes = toUtf8(name);
  if (nameBytes.length > 100) throw new Error(`TAR filename too long: ${name}`);
  h.set(nameBytes.slice(0, 100), 0);
  h.set(toUtf8("0000644\0"), 100); // mode
  h.set(toUtf8("0000000\0"), 108); // uid
  h.set(toUtf8("0000000\0"), 116); // gid
  h.set(writeOctal(size, 12), 124);
  h.set(writeOctal(Math.floor(Date.now() / 1000), 12), 136);
  h.set(toUtf8("        "), 148); // checksum placeholder
  h[156] = "0".charCodeAt(0); // regular file
  h.set(toUtf8("ustar\0"), 257);
  h.set(toUtf8("00"), 263);

  let sum = 0;
  for (let i = 0; i < 512; i++) sum += h[i];
  h.set(writeOctal(sum, 8), 148);
  return h;
}

export function createTar(files: ArchiveInputFile[]): Uint8Array {
  const parts: Uint8Array[] = [];

  for (const file of files) {
    const normalized = file.name.replace(/\\/g, "/");
    const header = createTarHeader(normalized, file.bytes.length);
    parts.push(header, file.bytes);
    const pad = padTo512(file.bytes.length);
    if (pad > 0) parts.push(new Uint8Array(pad));
  }

  // End-of-archive: two 512-byte blocks.
  parts.push(new Uint8Array(1024));
  return concatBytes(parts);
}

function parseTarName(block: Uint8Array): string {
  const name = fromUtf8(block.slice(0, 100)).replace(/\0.*$/, "");
  const prefix = fromUtf8(block.slice(345, 500)).replace(/\0.*$/, "");
  return prefix ? `${prefix}/${name}` : name;
}

function parseTarSize(block: Uint8Array): number {
  const raw = fromUtf8(block.slice(124, 136)).replace(/\0.*$/, "").trim();
  return raw ? parseInt(raw, 8) : 0;
}

function isZeroBlock(block: Uint8Array): boolean {
  for (let i = 0; i < block.length; i++) if (block[i] !== 0) return false;
  return true;
}

export function listTarEntries(data: Uint8Array): ArchiveEntry[] {
  const out: ArchiveEntry[] = [];
  let p = 0;

  while (p + 512 <= data.length) {
    const header = data.slice(p, p + 512);
    if (isZeroBlock(header)) break;

    const name = parseTarName(header);
    const size = parseTarSize(header);
    const typeFlag = String.fromCharCode(header[156] || 48);
    const isDirectory = typeFlag === "5" || name.endsWith("/");

    out.push({
      name,
      size,
      compressedSize: size,
      isDirectory,
      format: "tar",
    });

    p += 512 + size + padTo512(size);
  }

  return out;
}

export function extractTarEntries(data: Uint8Array): ArchiveInputFile[] {
  const out: ArchiveInputFile[] = [];
  let p = 0;

  while (p + 512 <= data.length) {
    const header = data.slice(p, p + 512);
    if (isZeroBlock(header)) break;

    const name = parseTarName(header);
    const size = parseTarSize(header);
    const typeFlag = String.fromCharCode(header[156] || 48);
    const isDirectory = typeFlag === "5" || name.endsWith("/");
    const contentStart = p + 512;
    const contentEnd = contentStart + size;

    if (contentEnd > data.length) throw new Error(`Invalid TAR: entry out of bounds (${name}).`);
    if (!isDirectory) {
      out.push({ name, bytes: data.slice(contentStart, contentEnd) });
    }

    p = contentEnd + padTo512(size);
  }

  return out;
}

export function listArchiveEntries(format: ArchiveFormat, data: Uint8Array): ArchiveEntry[] {
  return format === "zip" ? listZipEntries(data) : listTarEntries(data);
}

export function createArchive(format: ArchiveFormat, files: ArchiveInputFile[]): Uint8Array {
  return format === "zip" ? createZip(files) : createTar(files);
}

export async function extractArchive(format: ArchiveFormat, data: Uint8Array): Promise<ArchiveInputFile[]> {
  return format === "zip" ? extractZipEntries(data) : extractTarEntries(data);
}
