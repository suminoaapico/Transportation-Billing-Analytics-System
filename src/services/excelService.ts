import * as XLSX from 'xlsx';
import { CalculatedBillingTrip, BillingReportSummary, RawTripData } from '../types';
import { normalizeDate } from './billingCalculator';

/**
 * Generate workbook for Billing Report
 */
export function generateBillingReportWorkbook(
  summary: BillingReportSummary,
  trips: CalculatedBillingTrip[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData = [
    ['AUTOMATED TRANSPORTATION BILLING REPORT'],
    ['Generated on:', new Date().toLocaleString('th-TH')],
    [],
    ['ประเภทรถ', 'จำนวน (คัน)', 'Total Summary Amount (THB)'],
    ...summary.summaries.map((s) => [s.truckType, s.count, s.totalAmount]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // 2. Details Sheet
  const detailHeaders = [
    'Issue Date',
    'Job No.',
    'Trip No.',
    'Consignee/Shipper',
    'Pick Up Name',
    'Pick Up Province',
    'Delivery Name',
    'Delivery District',
    'Zone/Location Match',
    'Truck Type (Raw)',
    'Backhaul',
    'HaulType',
    'Standard Trip Rate (THB)',
    'Porter/other not in GTT',
    'Console not in GTT',
    'Cancelled trips in GTT (deduct)',
    'Missing-price trips (est.)',
    'Diesel rate (THB/L)',
    'Review status',
    'Notes',
  ];

  const detailRows = trips.map((t) => [
    t.issueDate,
    t.jobNo,
    t.tripNo,
    t.consigneeShipper,
    t.pickUpName,
    t.pickUpProvince,
    t.deliveryName,
    t.deliveryDistrict,
    t.zoneLocationMatch,
    t.truckTypeRaw,
    t.backhaul,
    t.haulType,
    t.standardTripRate,
    t.porterOther,
    t.consoleNotInGTT,
    t.cancelledTripsInGTT,
    t.missingPriceTrips,
    t.dieselRate ?? '-',
    t.reviewStatus,
    t.notes || '',
  ]);

  const wsDetails = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  wsDetails['!cols'] = [
    { wch: 12 }, // Issue Date
    { wch: 18 }, // Job No
    { wch: 22 }, // Trip No
    { wch: 30 }, // Consignee
    { wch: 30 }, // Pickup Name
    { wch: 16 }, // Pickup Prov
    { wch: 32 }, // Delivery Name
    { wch: 18 }, // Delivery Dist
    { wch: 26 }, // Zone Match
    { wch: 16 }, // Truck Type
    { wch: 10 }, // Backhaul
    { wch: 10 }, // HaulType
    { wch: 22 }, // Trip Rate
    { wch: 18 }, // Porter
    { wch: 18 }, // Console
    { wch: 24 }, // Cancelled
    { wch: 20 }, // Missing
    { wch: 18 }, // Diesel
    { wch: 18 }, // Status
    { wch: 35 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Trip Details');

  return wb;
}

/**
 * Download workbook as file
 */
export function exportBillingReportExcel(
  summary: BillingReportSummary,
  trips: CalculatedBillingTrip[],
  filename = 'Transportation_Billing_Report.xlsx'
) {
  const wb = generateBillingReportWorkbook(summary, trips);
  XLSX.writeFile(wb, filename);
}

/**
 * Get workbook as Uint8Array (for Google Drive upload)
 */
export function getBillingReportBuffer(
  summary: BillingReportSummary,
  trips: CalculatedBillingTrip[]
): Uint8Array {
  const wb = generateBillingReportWorkbook(summary, trips);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}

/**
 * Parse uploaded Raw Trip Data file (Excel or CSV)
 */
export function parseUploadedRawData(fileData: ArrayBuffer): RawTripData[] {
  const wb = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];

  // Convert to array of arrays to find header row
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rows.length < 2) return [];

  // Find header row that contains "Issue Date" or "Job No."
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowStr = (rows[i] || []).map((c) => String(c || '').toLowerCase()).join(' ');
    if (rowStr.includes('issue date') || rowStr.includes('job no') || rowStr.includes('consignee')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0; // fallback to row 0
  }

  const headers = rows[headerIndex].map((h: any) => String(h || '').trim());
  const dataRows = rows.slice(headerIndex + 1);

  const getCol = (row: any[], nameKeywords: string[]): string => {
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c].toLowerCase();
      if (nameKeywords.some((kw) => h.includes(kw.toLowerCase()))) {
        return row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : '';
      }
    }
    return '';
  };

  const parsedTrips: RawTripData[] = [];

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx];
    if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || c === '')) {
      continue;
    }

    const rawIssueDate = getCol(row, ['issue date', 'date', 'วันที่']);
    const issueDate = rawIssueDate ? normalizeDate(rawIssueDate) : new Date().toLocaleDateString('th-TH');
    const jobNo = getCol(row, ['job no', 'job number', 'job']);
    const tripNo = getCol(row, ['trip no', 'trip number', 'trip']);
    const consignee = getCol(row, ['consignee', 'shipper', 'customer', 'บริษัท']);
    const pickupName = getCol(row, ['pick up name', 'pickup name', 'รับสินค้า']);
    const pickupProv = getCol(row, ['pick up province', 'pickup province']);
    const deliveryName = getCol(row, ['delivery name', 'ส่งสินค้า']);
    const deliveryDist = getCol(row, ['delivery district', 'อำเภอ']);
    const deliveryProv = getCol(row, ['delivery province', 'จังหวัด']);
    const truckType = getCol(row, ['truck type', 'ประเภทรถ', 'truck']) || '4W/Single Unit';
    const driverName = getCol(row, ['driver name', 'คนขับ', 'driver']);
    const truckNo = getCol(row, ['truck no', 'ทะเบียน', 'plate']);

    parsedTrips.push({
      id: `imported-${Date.now()}-${idx}`,
      issueDate: issueDate || new Date().toLocaleDateString('th-TH'),
      jobNo: jobNo || `JOB-${idx + 1}`,
      tripNo: tripNo || `TRP-${idx + 1}`,
      consigneeShipper: consignee || 'General Shipper',
      pickUpName: pickupName || 'Warehouse',
      pickUpProvince: pickupProv || 'ปทุมธานี',
      deliveryName: deliveryName || 'Destination Site',
      deliveryDistrict: deliveryDist || '',
      deliveryProvince: deliveryProv || '',
      deliveryZone: getCol(row, ['delivery zone', 'zone']),
      deliveryRemark: getCol(row, ['delivery remark', 'remark']),
      truckType,
      driverName,
      truckNo,
      backhaul: getCol(row, ['backhaul']) || 'No',
      haulType: getCol(row, ['haultype', 'haul type']) || 'Direct',
      porter: parseFloat(getCol(row, ['porter'])) || 0,
      dryIce: parseFloat(getCol(row, ['dry ice'])) || 0,
      qty: parseFloat(getCol(row, ['qty'])) || 0,
      gw: parseFloat(getCol(row, ['g.w.', 'gw', 'weight'])) || 0,
      volume: parseFloat(getCol(row, ['volume', 'cbm'])) || 0,
    });
  }

  return parsedTrips;
}
