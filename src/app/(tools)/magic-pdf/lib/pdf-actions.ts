/**
 * PDF Actions Library
 * 
 * All heavy dependencies (pdf-lib, pdfjs-dist) are dynamic-imported 
 * within the functions to ensure they don't bloat the initial 
 * server bundle.
 */

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfFile = await mergedPdf.save();
    return mergedPdfFile;
}

export async function splitPdf(file: File, pageGroups: number[][]): Promise<Uint8Array[]> {
    const { PDFDocument } = await import('pdf-lib');
    const arrayBuffer = await file.arrayBuffer();
    const srcPdf = await PDFDocument.load(arrayBuffer);
    const resultFiles: Uint8Array[] = [];

    for (const group of pageGroups) {
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(srcPdf, group);
        copiedPages.forEach((page) => newPdf.addPage(page));
        resultFiles.push(await newPdf.save());
    }

    return resultFiles;
}

/**
 * Converts a data URL string into a Uint8Array without any network requests.
 * Handles both `data:image/png;base64,...` and plain base64 strings.
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binary = atob(base64);
    return Uint8Array.from({ length: binary.length }, (_, i) => binary.charCodeAt(i));
}

export async function compressPdfExtreme(file: File, quality: number = 0.3): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const pdfjsLib = await import('pdfjs-dist');

    if (typeof window !== 'undefined' && 'Worker' in window) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
        ).toString();
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvas,
            canvasContext: context,
            viewport: viewport,
        }).promise;

        const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
        });

        const imageBytes = new Uint8Array(await blob.arrayBuffer());
        const image = await newPdf.embedJpg(imageBytes);
        const pdfPage = newPdf.addPage([viewport.width, viewport.height]);
        pdfPage.drawImage(image, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
        });
    }

    return await newPdf.save();
}

export interface PageOperation {
    pageIndex: number;
    rotation?: number; // 0, 90, 180, 270
    delete?: boolean;
}

export async function rearrangePdf(
    file: File,
    newOrder: number[],
    operations?: PageOperation[]
): Promise<Uint8Array> {
    const { PDFDocument, RotationTypes } = await import('pdf-lib');
    const arrayBuffer = await file.arrayBuffer();
    const srcPdf = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();

    const opsMap = new Map<number, PageOperation>();
    operations?.forEach(op => opsMap.set(op.pageIndex, op));

    for (const pageIndex of newOrder) {
        const op = opsMap.get(pageIndex);
        if (op?.delete) continue;

        const [copiedPage] = await newPdf.copyPages(srcPdf, [pageIndex]);

        if (op?.rotation) {
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation({
                angle: (currentRotation + op.rotation) % 360,
                type: RotationTypes.Degrees
            });
        }

        newPdf.addPage(copiedPage);
    }

    return await newPdf.save();
}

export async function getPdfPageCount(file: File): Promise<number> {
    const { PDFDocument } = await import('pdf-lib');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    return pdf.getPageCount();
}

export async function renderPdfPageToImage(file: File, pageIndex: number, scale: number = 1.5): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');

    if (typeof window !== 'undefined' && 'Worker' in window) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
        ).toString();
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdfDoc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvas,
        canvasContext: context,
        viewport: viewport,
    }).promise;

    return canvas.toDataURL('image/png');
}

export interface EncryptionOptions {
    userPassword: string;
    ownerPassword?: string;
    permissions?: {
        printing?: 'highResolution' | 'lowResolution' | false;
        modifying?: boolean;
        copying?: boolean;
        annotating?: boolean;
        fillingForms?: boolean;
        contentAccessibility?: boolean;
        documentAssembly?: boolean;
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EncryptSaveOptions = Record<string, any>;

export async function encryptPdf(file: File, options: EncryptionOptions): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const encryptOptions: EncryptSaveOptions = {
        userPassword: options.userPassword,
        ownerPassword: options.ownerPassword || options.userPassword,
    };

    if (options.permissions) {
        const perms = options.permissions;
        encryptOptions.permissions = {
            printing: perms.printing || 'highResolution',
            modifying: perms.modifying !== false,
            copying: perms.copying !== false,
            annotating: perms.annotating !== false,
            fillingForms: perms.fillingForms !== false,
            contentAccessibility: perms.contentAccessibility !== false,
            documentAssembly: perms.documentAssembly !== false,
        };
    }

    const encryptedPdfBytes = await pdfDoc.save(encryptOptions);
    return encryptedPdfBytes;
}

export async function signPdf(
    file: File,
    signatureDataUrl: string,
    pageIndex: number,
    x: number,
    y: number,
    width: number,
    height: number
): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const signatureImageBytes = dataUrlToBytes(signatureDataUrl);

    let signatureImage;
    if (signatureDataUrl.includes('image/png')) {
        signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    } else {
        signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
    }

    const pages = pdfDoc.getPages();
    const currPage = pages[pageIndex];
    const { height: pageHeight } = currPage.getSize();
    const pdfY = pageHeight - y - height;

    currPage.drawImage(signatureImage, {
        x,
        y: pdfY,
        width,
        height,
    });

    return await pdfDoc.save();
}
