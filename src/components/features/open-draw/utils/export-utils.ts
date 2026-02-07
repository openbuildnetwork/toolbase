
import { toPng, toSvg, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';

// Utility to download a blob as a file
const downloadFile = (href: string, name: string) => {
    const link = document.createElement('a');
    link.download = name;
    link.href = href;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportAsPng = async (element: HTMLElement, fileName: string = 'diagram') => {
    try {
        const dataUrl = await toPng(element, {
            cacheBust: true,
            filter: (node) => {
                // Exclude controls and minimap from export if they are inside the element
                const classList = (node as HTMLElement).classList;
                return !classList?.contains('react-flow__controls') && !classList?.contains('react-flow__minimap');
            },
            backgroundColor: '#ffffff', // Ensure white background for transparent implementations
        });
        downloadFile(dataUrl, `${fileName}.png`);
    } catch (err) {
        console.error('Export PNG failed', err);
    }
};

export const exportAsSvg = async (element: HTMLElement, fileName: string = 'diagram') => {
    try {
        const dataUrl = await toSvg(element, {
            cacheBust: true,
            filter: (node) => {
                const classList = (node as HTMLElement).classList;
                return !classList?.contains('react-flow__controls') && !classList?.contains('react-flow__minimap');
            },
            backgroundColor: '#ffffff',
        });
        downloadFile(dataUrl, `${fileName}.svg`);
    } catch (err) {
        console.error('Export SVG failed', err);
    }
};

export const exportAsPdf = async (element: HTMLElement, fileName: string = 'diagram') => {
    try {
        // High quality PNG capture first
        const dataUrl = await toPng(element, {
            cacheBust: true,
            filter: (node) => {
                const classList = (node as HTMLElement).classList;
                return !classList?.contains('react-flow__controls') && !classList?.contains('react-flow__minimap');
            },
            pixelRatio: 2, // 2x resolution for better PDF quality
            backgroundColor: '#ffffff'
        });

        const pdf = new jsPDF({
            orientation: 'landscape',
        });

        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);
    } catch (err) {
        console.error('Export PDF failed', err);
    }
};

export const copyAsImage = async (element: HTMLElement) => {
    try {
        const blob = await toBlob(element, {
            filter: (node) => {
                const classList = (node as HTMLElement).classList;
                return !classList?.contains('react-flow__controls') && !classList?.contains('react-flow__minimap');
            },
            backgroundColor: '#ffffff'
        });
        if (blob) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            alert("Copied to clipboard!");
        }
    } catch (err) {
        console.error('Copy Image failed', err);
        alert("Failed to copy image to clipboard.");
    }
};
