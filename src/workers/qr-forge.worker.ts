import qrcode from 'qrcode';
import jsQR from 'jsqr';

interface GenerateRequest {
  data?: Uint8Array;
  text?: string;
}

interface DecodeRequest {
  data: Uint8Array;
}

interface WorkerResult {
  success: boolean;
  result?: number[] | string;
  error?: string;
}

async function process_generate(request: GenerateRequest): Promise<WorkerResult> {
  const { text } = request;

  const payloadText = text || 'https://toolbase.in';

  if (!payloadText) {
    throw new Error('No text provided to encode');
  }

  // Create raw QR matrix
  const qr = qrcode.create(payloadText, { errorCorrectionLevel: 'Q' });
  const modules = qr.modules;
  const modSize = modules.size;

  // Fixed size high-quality output
  const size = 600;
  const margin = 4;
  const totalModSize = modSize + margin * 2;
  const scale = Math.max(1, Math.floor(size / totalModSize));
  const finalSize = totalModSize * scale;

  const canvas = new OffscreenCanvas(finalSize, finalSize);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get OffscreenCanvas 2D context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalSize, finalSize);

  ctx.fillStyle = '#000000';
  for (let row = 0; row < modSize; row++) {
    for (let col = 0; col < modSize; col++) {
      if (modules.data[row * modSize + col]) {
        const x = (col + margin) * scale;
        const y = (row + margin) * scale;
        ctx.fillRect(x, y, scale, scale);
      }
    }
  }

  const outBlob = await canvas.convertToBlob({ type: 'image/png' });
  const outBuffer = await outBlob.arrayBuffer();

  return {
    success: true,
    result: Array.from(new Uint8Array(outBuffer))
  };
}

async function process_decode(request: DecodeRequest): Promise<WorkerResult> {
  const { data } = request;
  if (!data || data.length === 0) throw new Error('No image data provided for decoding');

  const blob = new Blob([data as unknown as BlobPart]);
  const bitmap = await createImageBitmap(blob);

  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;

  if (typeof targetWidth !== 'number' || typeof targetHeight !== 'number' || targetWidth === 0 || targetHeight === 0) {
    throw new Error('Could not read image dimensions from the uploaded file.');
  }

  const MAX_DIM = 1000;
  if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
    const scale = Math.min(MAX_DIM / targetWidth, MAX_DIM / targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D context');

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);

  let code;
  try {
    code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
    if (!code) {
      code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'onlyInvert' });
    }
  } catch (err) {
    // jsQR occasionally throws internal TypeErrors (e.g. reading 'height' of undefined matrix) on heavily corrupted/noisy images
    console.warn("jsQR internal crash:", err);
    throw new Error('No QR code detected in image');
  }

  if (!code) {
    throw new Error('No QR code detected in image');
  }

  return {
    success: true,
    result: code.data
  };
}

self.onmessage = async (event: MessageEvent) => {
  const { type, action, data, id } = event.data;
  if (type !== "EXECUTE") return;

  try {
    let result: WorkerResult;
    if (action === "generate") {
      result = await process_generate(data);
    } else if (action === "decode") {
      result = await process_decode(data);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
    self.postMessage({ type: "RESULT", data: result, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: "ERROR", error: message, id });
  }
};

console.log("Worker: QR Forge TS Worker Ready");
self.postMessage({ type: "READY" });
