import * as XLSX from 'xlsx';
import { DieselPriceRecord, StandardTruckType, RateCardTable } from '../types';

/**
 * Parsed Rate Card Entry from user Excel/CSV
 */
export interface ParsedRateCardEntry {
  branch?: string;
  zone: string;
  province?: string;
  truckType: StandardTruckType | 'OD' | string;
  weightMin?: number;
  weightMax?: number;
  price: number;
  effectiveDate?: string;
  expiryDate?: string;
  rawJson?: Record<string, any>;
}

/**
 * Parsed Fuel Price Entry from user Excel/CSV
 */
export interface ParsedFuelEntry {
  date: string;
  price: number;
  source: string;
  isFixed?: boolean;
  company?: string;
}

/**
 * Parse uploaded Rate Card Excel/CSV
 * Supports both:
 * 1) Normalized Flat rows (Branch, Zone, Truck Type, Weight Min/Max, Price, etc.)
 * 2) Matrix/Grid format (Location, Province, and Bracket columns like 30.01-32.00, 32.01-34.00, etc.)
 */
export function parseUploadedRateCardFile(
  fileBuffer: ArrayBuffer,
  defaultBranch = 'NLC',
  defaultTruckType: StandardTruckType | 'ALL' = 'ALL'
): {
  flatRows: ParsedRateCardEntry[];
  matrixUpdates?: Partial<Record<StandardTruckType, RateCardTable>>;
} {
  const wb = XLSX.read(fileBuffer, { type: 'array' });
  const flatRows: ParsedRateCardEntry[] = [];

  // Check each sheet
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rawData || rawData.length < 2) continue;

    // Detect sheet truck type hint if named e.g. "RateCard_4W", "4W", "6W", "10W", "OD4", "OD6"
    let sheetTruckHint: StandardTruckType | null = null;
    const lowerSheet = sheetName.toLowerCase();
    if (lowerSheet.includes('od6') || lowerSheet.includes('od 6')) sheetTruckHint = 'OD6';
    else if (lowerSheet.includes('od4') || lowerSheet.includes('od 4')) sheetTruckHint = 'OD4';
    else if (lowerSheet.includes('10w') || lowerSheet.includes('10 ล้อ')) sheetTruckHint = '10W';
    else if (lowerSheet.includes('6w') || lowerSheet.includes('6 ล้อ')) sheetTruckHint = '6W';
    else if (lowerSheet.includes('4w') || lowerSheet.includes('4 ล้อ')) sheetTruckHint = '4W';

    // Find header row
    let headerIdx = -1;
    for (let i = 0; i < Math.min(8, rawData.length); i++) {
      const rowStr = (rawData[i] || []).map((c) => String(c || '').toLowerCase()).join(' ');
      if (
        rowStr.includes('zone') ||
        rowStr.includes('location') ||
        rowStr.includes('ปลายทาง') ||
        rowStr.includes('โซน') ||
        rowStr.includes('price') ||
        rowStr.includes('rate')
      ) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) headerIdx = 0;

    const headers = (rawData[headerIdx] || []).map((h) => String(h || '').trim());
    const dataRows = rawData.slice(headerIdx + 1);

    // Check if matrix format: has headers like "< 30.00", "lower than 30.00", "30.01 - 32.00", etc.
    const bracketCols: { colIdx: number; label: string; min: number; max: number }[] = [];
    headers.forEach((h, colIdx) => {
      const lh = h.toLowerCase().trim();
      const match = lh.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
      if (match) {
        bracketCols.push({
          colIdx,
          label: h,
          min: parseFloat(match[1]),
          max: parseFloat(match[2]),
        });
      } else if (
        lh.includes('< 30') ||
        lh.includes('<30') ||
        lh.includes('lower than 30') ||
        lh.includes('less than 30') ||
        lh.includes('under 30') ||
        lh.includes('ต่ำกว่า 30') ||
        lh.includes('น้อยกว่า 30')
      ) {
        bracketCols.push({ colIdx, label: h, min: 0, max: 30.00 });
      } else if (
        lh.includes('> 60') ||
        lh.includes('>60') ||
        lh.includes('higher than 60') ||
        lh.includes('more than 60') ||
        lh.includes('over 60') ||
        lh.includes('มากกว่า 60') ||
        lh.includes('เกิน 60')
      ) {
        bracketCols.push({ colIdx, label: h, min: 60.01, max: 999.00 });
      }
    });

    const isMatrix = bracketCols.length >= 3;

    if (isMatrix) {
      // Find location and province cols
      let locIdx = 0;
      let provIdx = 1;
      headers.forEach((h, idx) => {
        const lh = h.toLowerCase();
        if (lh.includes('location') || lh.includes('zone') || lh.includes('โซน') || lh.includes('ปลายทาง')) locIdx = idx;
        if (lh.includes('province') || lh.includes('จังหวัด')) provIdx = idx;
      });

      const truck = sheetTruckHint || (defaultTruckType !== 'ALL' ? defaultTruckType : '4W');

      for (const row of dataRows) {
        if (!row || row.length === 0) continue;
        const location = String(row[locIdx] || '').trim();
        const province = String(row[provIdx] || '').trim();
        if (!location) continue;

        for (const b of bracketCols) {
          const val = parseFloat(String(row[b.colIdx] || '').replace(/,/g, ''));
          if (!isNaN(val) && val > 0) {
            flatRows.push({
              branch: defaultBranch,
              zone: location,
              province: province || undefined,
              truckType: truck,
              weightMin: b.min,
              weightMax: b.max,
              price: val,
              rawJson: { bracket: b.label, location, province, truck },
            });
          }
        }
      }
    } else {
      // Flat column format: headers like Branch, Zone, Truck Type, Min Weight, Max Weight, Price
      let branchIdx = -1;
      let zoneIdx = -1;
      let provIdx = -1;
      let truckIdx = -1;
      let minWIdx = -1;
      let maxWIdx = -1;
      let priceIdx = -1;
      let effIdx = -1;
      let expIdx = -1;

      headers.forEach((h, idx) => {
        const lh = h.toLowerCase();
        if (lh.includes('branch') || lh.includes('สาขา')) branchIdx = idx;
        else if (lh.includes('zone') || lh.includes('location') || lh.includes('ปลายทาง') || lh.includes('โซน')) zoneIdx = idx;
        else if (lh.includes('province') || lh.includes('จังหวัด')) provIdx = idx;
        else if (lh.includes('truck') || lh.includes('ประเภทรถ') || lh.includes('รถ')) truckIdx = idx;
        else if (lh.includes('min') || lh.includes('น้ำหนักเริ่ม') || lh.includes('weight_min')) minWIdx = idx;
        else if (lh.includes('max') || lh.includes('น้ำหนักสุด') || lh.includes('weight_max')) maxWIdx = idx;
        else if (lh.includes('price') || lh.includes('rate') || lh.includes('ราคา') || lh.includes('ค่าเที่ยว')) priceIdx = idx;
        else if (lh.includes('effective') || lh.includes('เริ่ม')) effIdx = idx;
        else if (lh.includes('expiry') || lh.includes('หมดอายุ')) expIdx = idx;
      });

      if (priceIdx === -1) {
        // Fallback: look for first numeric column
        for (let c = 0; c < headers.length; c++) {
          if (c !== zoneIdx && c !== branchIdx && c !== truckIdx) {
            priceIdx = c;
            break;
          }
        }
      }

      for (const row of dataRows) {
        if (!row || row.length === 0) continue;
        const zone = zoneIdx >= 0 ? String(row[zoneIdx] || '').trim() : String(row[0] || '').trim();
        if (!zone) continue;

        const rawPrice = priceIdx >= 0 ? parseFloat(String(row[priceIdx] || '').replace(/,/g, '')) : 0;
        if (isNaN(rawPrice) || rawPrice <= 0) continue;

        const branch = branchIdx >= 0 ? String(row[branchIdx] || '').trim() : defaultBranch;
        const truck = truckIdx >= 0 ? String(row[truckIdx] || '').trim() : (defaultTruckType !== 'ALL' ? defaultTruckType : '4W');
        const minW = minWIdx >= 0 ? parseFloat(String(row[minWIdx] || '')) : undefined;
        const maxW = maxWIdx >= 0 ? parseFloat(String(row[maxWIdx] || '')) : undefined;
        const province = provIdx >= 0 ? String(row[provIdx] || '').trim() : undefined;
        const effDate = effIdx >= 0 ? String(row[effIdx] || '').trim() : undefined;
        const expDate = expIdx >= 0 ? String(row[expIdx] || '').trim() : undefined;

        flatRows.push({
          branch: branch || defaultBranch,
          zone,
          province,
          truckType: truck,
          weightMin: isNaN(minW as number) ? undefined : minW,
          weightMax: isNaN(maxW as number) ? undefined : maxW,
          price: rawPrice,
          effectiveDate: effDate,
          expiryDate: expDate,
          rawJson: { row, zone, truck, branch, price: rawPrice },
        });
      }
    }
  }

  return { flatRows };
}

/**
 * Parse uploaded PTT/Fuel Price Database Excel or CSV
 */
export function parseUploadedFuelPricesFile(fileBuffer: ArrayBuffer, companyOverride?: string): ParsedFuelEntry[] {
  const wb = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rawData: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  if (!rawData || rawData.length < 2) return [];

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(8, rawData.length); i++) {
    const rowStr = (rawData[i] || []).map((c) => String(c || '').toLowerCase()).join(' ');
    if (rowStr.includes('date') || rowStr.includes('วันที่') || rowStr.includes('price') || rowStr.includes('ราคา') || rowStr.includes('diesel')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 0;

  const headers = (rawData[headerIdx] || []).map((h) => String(h || '').trim());
  const dataRows = rawData.slice(headerIdx + 1);

  let dateIdx = -1;
  let priceIdx = -1;
  let sourceIdx = -1;
  let isFixedIdx = -1;
  let companyIdx = -1;

  headers.forEach((h, idx) => {
    const lh = h.toLowerCase();
    if (lh.includes('date') || lh.includes('วันที่')) dateIdx = idx;
    else if (lh.includes('price') || lh.includes('ราคา') || lh.includes('rate') || lh.includes('diesel')) priceIdx = idx;
    else if (lh.includes('source') || lh.includes('แหล่งที่มา') || lh.includes('สถานี')) sourceIdx = idx;
    else if (lh.includes('fixed') || lh.includes('คงที่')) isFixedIdx = idx;
    else if (lh.includes('company') || lh.includes('บริษัท') || lh.includes('ลูกค้า')) companyIdx = idx;
  });

  if (dateIdx === -1) dateIdx = 0;
  if (priceIdx === -1) priceIdx = 1;

  const results: ParsedFuelEntry[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const rawDate = row[dateIdx];
    if (!rawDate) continue;

    // Normalize date string
    let dateStr = '';
    if (typeof rawDate === 'number') {
      // Excel serial date number
      const parsed = XLSX.SSF.parse_date_code(rawDate);
      if (parsed) {
        dateStr = `${parsed.d}/${parsed.m}/${parsed.y}`;
      }
    } else {
      dateStr = String(rawDate).trim();
    }

    const priceVal = parseFloat(String(row[priceIdx] || '').replace(/,/g, ''));
    if (isNaN(priceVal) || priceVal <= 0) continue;

    const source = sourceIdx >= 0 && row[sourceIdx] ? String(row[sourceIdx]).trim() : 'PTT Diesel Database';
    const isFixed = isFixedIdx >= 0 ? String(row[isFixedIdx]).toLowerCase().includes('true') || String(row[isFixedIdx]) === '1' : Boolean(companyOverride);
    const company = companyOverride || (companyIdx >= 0 && row[companyIdx] ? String(row[companyIdx]).trim() : undefined);

    results.push({
      date: dateStr,
      price: priceVal,
      source,
      isFixed,
      company,
    });
  }

  return results;
}

/**
 * Parse raw text (TSV or CSV or multi-section formatted text)
 * Supports multiple sections like:
 * "STANDARD RATE CARD - 4W TRUCK TYPE"
 * "STANDARD RATE CARD - 6W TRUCK TYPE"
 * "STANDARD RATE CARD - 10W TRUCK TYPE"
 * "STANDARD RATE CARD - OD4 TRUCK TYPE"
 * "STANDARD RATE CARD - OD6 TRUCK TYPE"
 */
export function parseRateCardRawText(
  rawText: string,
  defaultBranch = 'NLC'
): {
  flatRows: ParsedRateCardEntry[];
  matrixUpdates: Partial<Record<StandardTruckType, RateCardTable>>;
} {
  const flatRows: ParsedRateCardEntry[] = [];
  const matrixUpdates: Partial<Record<StandardTruckType, RateCardTable>> = {};

  if (!rawText || !rawText.trim()) {
    return { flatRows, matrixUpdates };
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentTruckType: StandardTruckType = '4W';
  let currentHeaders: string[] = [];
  let bracketCols: { colIdx: number; label: string; min: number; max: number; key: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    // Check for section header
    if (upper.includes('STANDARD RATE CARD') || upper.includes('RATE CARD') || upper.includes('TRUCK TYPE')) {
      if (upper.includes('OD6') || upper.includes('OD 6')) currentTruckType = 'OD6';
      else if (upper.includes('OD4') || upper.includes('OD 4')) currentTruckType = 'OD4';
      else if (upper.includes('10W') || upper.includes('10 ล้อ')) currentTruckType = '10W';
      else if (upper.includes('6W') || upper.includes('6 ล้อ')) currentTruckType = '6W';
      else if (upper.includes('4W') || upper.includes('4 ล้อ')) currentTruckType = '4W';
      currentHeaders = [];
      bracketCols = [];
      continue;
    }

    // Split row by tab or comma
    const cells = line.includes('\t')
      ? line.split('\t').map((c) => c.trim())
      : line.split(',').map((c) => c.trim());

    if (cells.length < 2) continue;

    // Check if this row is the column header with fuel brackets
    const isHeaderRow = cells.some((c) => {
      const lc = c.toLowerCase();
      return (
        lc.includes('lower than') ||
        lc.includes('< 30') ||
        lc.includes('30.01') ||
        lc.includes('location') ||
        lc.includes('pickup')
      );
    });

    if (isHeaderRow || bracketCols.length === 0) {
      currentHeaders = cells;
      bracketCols = [];
      cells.forEach((c, idx) => {
        const lc = c.toLowerCase();
        const match = lc.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
        if (match) {
          const min = parseFloat(match[1]);
          const max = parseFloat(match[2]);
          bracketCols.push({
            colIdx: idx,
            label: c,
            min,
            max,
            key: `d_${Math.floor(min)}_${Math.floor(max)}`,
          });
        } else if (
          lc.includes('< 30') ||
          lc.includes('<30') ||
          lc.includes('lower than 30') ||
          lc.includes('less than 30') ||
          lc.includes('under 30') ||
          lc.includes('ต่ำกว่า 30')
        ) {
          bracketCols.push({
            colIdx: idx,
            label: c,
            min: 0,
            max: 30.0,
            key: 'b_under30',
          });
        }
      });
      continue;
    }

    // This is a data row: Location is first column (cells[0])
    const location = cells[0];
    if (!location || location.startsWith('จุดเริ่มต้น') || location.startsWith('---')) continue;

    let province = '';
    if (location.includes(',')) {
      const parts = location.split(',');
      province = parts[parts.length - 1].trim();
    }

    const rowRates: { [key: string]: number } = {};

    for (const b of bracketCols) {
      if (b.colIdx < cells.length) {
        const rawVal = cells[b.colIdx].replace(/,/g, '');
        const val = parseFloat(rawVal);
        if (!isNaN(val) && val > 0) {
          rowRates[b.key] = val;
          flatRows.push({
            branch: defaultBranch,
            zone: location,
            province: province || undefined,
            truckType: currentTruckType,
            weightMin: b.min,
            weightMax: b.max,
            price: val,
            rawJson: { bracket: b.label, location, province, truck: currentTruckType },
          });
        }
      }
    }

    if (Object.keys(rowRates).length > 0) {
      if (!matrixUpdates[currentTruckType]) {
        matrixUpdates[currentTruckType] = {
          truckType: currentTruckType,
          brackets: bracketCols.map((bc) => ({
            key: bc.key,
            label: bc.label,
            minDiesel: bc.min,
            maxDiesel: bc.max,
          })),
          rows: [],
        };
      }
      matrixUpdates[currentTruckType]!.rows.push({
        id: `rc-${currentTruckType.toLowerCase()}-${matrixUpdates[currentTruckType]!.rows.length + 1}`,
        location,
        province,
        region: 'Central',
        rates: rowRates,
      });
    }
  }

  return { flatRows, matrixUpdates };
}

