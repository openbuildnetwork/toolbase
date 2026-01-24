import { PDFDocument, RotationTypes } from 'pdf-lib';

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
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

export async function compressPdfExtreme(file: File, quality: number = 0.3): Promise<Uint8Array> {
    // Load pdf.js dynamically
    const pdfjsLib = await import('pdfjs-dist');

    if (typeof window !== 'undefined' && 'Worker' in window) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    // Load the PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Create a new PDF with compressed images
    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // Render at 2x for quality

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render PDF page to canvas
        await page.render({
            canvasContext: context,
            viewport: viewport,
        } as any).promise;

        // Convert canvas to compressed image
        const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
        });

        const imageBytes = new Uint8Array(await blob.arrayBuffer());

        // Embed image in new PDF
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
    const arrayBuffer = await file.arrayBuffer();
    const srcPdf = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();

    // Create a map of operations for quick lookup
    const opsMap = new Map<number, PageOperation>();
    operations?.forEach(op => opsMap.set(op.pageIndex, op));

    // Copy pages in the new order
    for (const pageIndex of newOrder) {
        const op = opsMap.get(pageIndex);

        // Skip if marked for deletion
        if (op?.delete) continue;

        const [copiedPage] = await newPdf.copyPages(srcPdf, [pageIndex]);

        // Apply rotation if specified
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
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    return pdf.getPageCount();
}

export async function renderPdfPageToImage(file: File, pageIndex: number, scale: number = 1.5): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');

    if (typeof window !== 'undefined' && 'Worker' in window) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdfDoc.getPage(pageIndex + 1); // pdf.js uses 1-based indexing
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: context,
        viewport: viewport,
    } as any).promise;

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

export async function encryptPdf(file: File, options: EncryptionOptions): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Set passwords
    const encryptOptions: any = {
        userPassword: options.userPassword,
        ownerPassword: options.ownerPassword || options.userPassword,
    };

    // Set permissions if provided
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

    // Save with encryption
    const encryptedPdfBytes = await pdfDoc.save(encryptOptions);
    return encryptedPdfBytes;
}
