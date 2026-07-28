import { PDFDocument } from 'pdf-lib';

export interface ServicePriceMap {
  bw_single: number;     // paise per page
  bw_double: number;     // paise per sheet
  bw_4up: number;        // paise per sheet
  color_single: number;  // paise per page
  soft_binding: number;  // paise per copy/job
  spiral_binding: number;// paise per copy/job
}

export interface CalculateItemInput {
  printMode: 'BW_SINGLE' | 'BW_DOUBLE' | 'BW_4UP' | 'COLOR_SINGLE';
  pageCount: number;
  copies: number;
  bindingOption: 'NONE' | 'SOFT' | 'SPIRAL';
}

export interface CalculatedItemResult {
  printMode: string;
  pageCount: number;
  physicalSheets: number;
  copies: number;
  bindingOption: string;
  pricePerUnitPaise: number;
  bindingPricePaise: number;
  subtotalPaise: number;
}

export function calculateItemPricing(
  input: CalculateItemInput,
  prices: ServicePriceMap
): CalculatedItemResult {
  const { printMode, pageCount, copies, bindingOption } = input;

  let physicalSheets = pageCount;
  let pricePerUnitPaise = 0;

  switch (printMode) {
    case 'BW_SINGLE':
      physicalSheets = pageCount;
      pricePerUnitPaise = prices.bw_single;
      break;
    case 'BW_DOUBLE':
      physicalSheets = Math.ceil(pageCount / 2);
      pricePerUnitPaise = prices.bw_double;
      break;
    case 'BW_4UP':
      physicalSheets = Math.ceil(pageCount / 4);
      pricePerUnitPaise = prices.bw_4up;
      break;
    case 'COLOR_SINGLE':
      physicalSheets = pageCount;
      pricePerUnitPaise = prices.color_single;
      break;
  }

  // Calculate printing cost based on sheets (for duplex/4up) or pages (for single)
  const printingUnits = printMode === 'BW_SINGLE' || printMode === 'COLOR_SINGLE' ? pageCount : physicalSheets;
  const printingCost = printingUnits * pricePerUnitPaise * copies;

  // Calculate binding cost
  let bindingPricePerCopyPaise = 0;
  if (bindingOption === 'SOFT') {
    bindingPricePerCopyPaise = prices.soft_binding;
  } else if (bindingOption === 'SPIRAL') {
    bindingPricePerCopyPaise = prices.spiral_binding;
  }

  const bindingCostTotal = bindingPricePerCopyPaise * copies;
  const subtotalPaise = printingCost + bindingCostTotal;

  return {
    printMode,
    pageCount,
    physicalSheets,
    copies,
    bindingOption,
    pricePerUnitPaise,
    bindingPricePaise: bindingPricePerCopyPaise,
    subtotalPaise,
  };
}

export async function detectPageCountServer(buffer: Buffer, mimeType: string): Promise<number> {
  if (mimeType === 'application/pdf') {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      return pdfDoc.getPageCount();
    } catch (err) {
      console.error('Failed to parse PDF page count with pdf-lib, defaulting to 1 page:', err);
      return 1;
    }
  }
  // Standard image formats (JPG/PNG) count as 1 page per image
  return 1;
}

export function formatRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}
