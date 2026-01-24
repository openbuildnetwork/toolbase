import { PDFDocument } from 'pdf-lib';

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
