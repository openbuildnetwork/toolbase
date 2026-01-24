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
        // Create a new document for this group
        const newPdf = await PDFDocument.create();
        // Copy specific pages (indices) from source
        const copiedPages = await newPdf.copyPages(srcPdf, group);
        copiedPages.forEach((page) => newPdf.addPage(page));
        resultFiles.push(await newPdf.save());
    }

    return resultFiles;
}
