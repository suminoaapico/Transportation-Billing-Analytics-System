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
    ['AUTOMATED TRANSPORTATION BILLING REPORT (ระบบสรุปค่าขนส่งและตรวจสอบส่วนต่างราคา)'],
    ['Generated on:', new Date().toLocaleString('th-TH')],
    [],
    ['สรุปยอดตามประเภทรถ (Truck Summary)'],
    ['ประเภทรถ', 'จำนวน (คัน)', 'ราคาเรทฐาน (THB)', 'ค่าน้ำมัน (THB)', 'ค่าใช้จ่ายอื่นๆ (THB)', 'ยอดรวมสุทธิ (THB)'],
    ...summary.summaries.map((s) => [
      s.truckType === '4W' ? '4W (รถ 4 ล้อ)' : s.truckType === '6W' ? '6W (รถ 6 ล้อ)' : s.truckType === '10W' ? '10W (รถ 10 ล้อ)' : s.truckType,
      s.count,
      s.baseRateAmount,
      s.fuelSurchargeAmount,
      s.otherFeesAmount,
      s.totalAmount,
    ]),
    [],
    ['สรุปยอดแยกตามสาขา (Branch Breakdown)'],
    ['สาขา', 'จำนวนเที่ยว (คัน)', 'ยอดรวม (THB)', 'เฉลี่ยต่อเที่ยว (THB)'],
    ...summary.branchSummaries.map((b) => [b.branch, b.count, b.totalAmount, b.avgPerTrip]),
    [],
    ['สรุปยอดแยกตามประเภทยานพาหนะ (Company Truck vs Sub Contractor OD)'],
    ['ประเภทรถ', 'ประเภท', 'จำนวนเที่ยว (คัน)', 'ยอดรวม (THB)'],
    ...summary.odSummaries.map((od) => [
      od.odType,
      od.isSubContractor ? 'รถซับ (Sub Contractor)' : 'รถบริษัท (Company Truck)',
      od.count,
      od.totalAmount,
    ]),
    [],
    ['สรุปการตรวจสอบส่วนต่างราคา (Diff Reconciliation)'],
    ['สถานะการตรวจสอบ', 'จำนวนเที่ยว', 'ยอดเงินรวม (THB)'],
    ['✅ ตรงกัน (Match 100%)', summary.diffSummary.matchCount, summary.diffSummary.matchAmount],
    ['⚠️ ส่วนต่างเล็กน้อย (Diff < 5%)', summary.diffSummary.minorDiffCount, summary.diffSummary.minorDiffAmount],
    ['❌ ส่วนต่างมาก (Diff >= 5%) ต้องตรวจสอบ', summary.diffSummary.majorDiffCount, summary.diffSummary.majorDiffAmount],
    ['ยอดส่วนต่างสุทธิ (Net Diff Amount)', '-', summary.diffSummary.netDiffAmount],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 24 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // 2. Details Sheet
  const detailHeaders = [
    'Issue Date',
    'Job No.',
    'Trip No.',
    'Branch (สาขา)',
    'OD Type (ประเภทรถซับ)',
    'Consignee/Shipper',
    'Pick Up Name',
    'Pick Up Province',
    'Delivery Name',
    'Delivery District',
    'Zone/Location Match',
    'Truck Type (Raw)',
    'Base Rate (ราคาเรท)',
    'Fuel Surcharge (ค่าน้ำมัน)',
    'Drop Fee (ค่าดรอป)',
    'Waiting Fee (ค่ารอ)',
    'Toll Fee (ทางด่วน)',
    'Porter Fee (คนยก)',
    'Other Fees (ค่าอื่นๆ)',
    'Total Amount (ราคารวม)',
    'Customer Quoted (ราคาลูกค้า)',
    'Diff vs Quotation (ส่วนต่าง)',
    'Diff Reason (เหตุผลที่ต่าง)',
    'Diesel Rate (THB/L)',
    'Review Status',
    'Notes',
  ];

  const detailRows = trips.map((t) => [
    t.issueDate,
    t.jobNo,
    t.tripNo,
    t.branch,
    t.odType,
    t.consigneeShipper,
    t.pickUpName,
    t.pickUpProvince,
    t.deliveryName,
    t.deliveryDistrict,
    t.zoneLocationMatch,
    t.truckTypeRaw,
    t.baseTripRate,
    t.fuelSurcharge,
    t.dropFee,
    t.waitingFee,
    t.tollFee,
    t.porterFee,
    t.otherFees,
    t.totalAmount,
    t.customerQuotedPrice,
    t.diffAmount,
    t.diffReason,
    t.dieselRate ?? '-',
    t.reviewStatus,
    t.notes || '',
  ]);

  const wsDetails = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  wsDetails['!cols'] = [
    { wch: 12 }, // Issue Date
    { wch: 18 }, // Job No
    { wch: 22 }, // Trip No
    { wch: 14 }, // Branch
    { wch: 16 }, // OD Type
    { wch: 30 }, // Consignee
    { wch: 30 }, // Pickup Name
    { wch: 16 }, // Pickup Prov
    { wch: 32 }, // Delivery Name
    { wch: 18 }, // Delivery Dist
    { wch: 26 }, // Zone Match
    { wch: 16 }, // Truck Type
    { wch: 18 }, // Base Rate
    { wch: 18 }, // Fuel Surcharge
    { wch: 16 }, // Drop Fee
    { wch: 16 }, // Waiting Fee
    { wch: 16 }, // Toll Fee
    { wch: 16 }, // Porter Fee
    { wch: 16 }, // Other Fees
    { wch: 20 }, // Total Amount
    { wch: 20 }, // Customer Quoted
    { wch: 20 }, // Diff
    { wch: 32 }, // Diff Reason
    { wch: 16 }, // Diesel Rate
    { wch: 18 }, // Review Status
    { wch: 30 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Trip Details');

  // 3. Diff Reconciliation Sheet
  const diffHeaders = [
    'Job No.',
    'Trip No.',
    'Branch',
    'Consignee/Shipper',
    'Delivery Name',
    'Calculated Amount (฿)',
    'Customer Quoted (฿)',
    'Diff Amount (฿)',
    'Diff Percent (%)',
    'Status',
    'Reason for Difference (เหตุผลที่ต่าง)',
  ];

  const diffRows = trips.map((t) => [
    t.jobNo,
    t.tripNo,
    t.branch,
    t.consigneeShipper,
    t.deliveryName,
    t.totalAmount,
    t.customerQuotedPrice,
    t.diffAmount,
    t.diffPercent.toFixed(2) + '%',
    t.diffStatus === 'Match' ? 'ตรงกัน (Match)' : t.diffStatus === 'MinorDiff' ? 'ต่างเล็กน้อย (<5%)' : 'ต่างมาก (>=5%)',
    t.diffReason,
  ]);

  const wsDiff = XLSX.utils.aoa_to_sheet([diffHeaders, ...diffRows]);
  wsDiff['!cols'] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 30 },
    { wch: 32 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDiff, 'Diff Reconciliation');

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
 * Standard 69 Columns for Transportation Daily Raw Data (A to BQ)
 * Exactly 69 columns matching client TMS schema
 */
export const RAW_DATA_69_COLUMNS = [
  'Issue Date', // A (0)
  'Clearance Date', // B (1)
  'Consignee/Shipper', // C (2)
  'Address', // D (3)
  'Job No.', // E (4)
  'Hawb No.', // F (5)
  'Mawb No.', // G (6)
  'Flt No.', // H (7)
  'Invoice No.', // I (8)
  'Dimension', // J (9)
  'QTY', // K (10)
  'Unit', // L (11)
  'G.W.', // M (12)
  'Volume', // N (13)
  'Product', // O (14)
  'Porter', // P (15)
  'Dry Ice', // Q (16)
  'Actual QTY', // R (17)
  'Unit1', // S (18)
  'Actual G.W.', // T (19)
  'Actual Volume', // U (20)
  'Pick Up Date', // V (21)
  'Pick Up Time', // W (22)
  'Pick Up IN', // X (23)
  'Pick Up OUT', // Y (24)
  'Pick Up Name', // Z (25)
  'Pick Up Address', // AA (26)
  'Pick Up Province.', // AB (27)
  'Pick Up District', // AC (28)
  'Pick Up Zone', // AD (29)
  'Pick Up Remark', // AE (30)
  'Delivery Date', // AF (31)
  'Delivery Time', // AG (32)
  'Delivery IN', // AH (33)
  'Delivery OUT', // AI (34)
  'Delivery Name', // AJ (35)
  'Delivery Address', // AK (36)
  'Delivery Province', // AL (37)
  'Delivery District', // AM (38)
  'Delivery Zone', // AN (39)
  'Delivery Remark', // AO (40)
  'CS Name', // AP (41)
  'Business Unit', // AQ (42)
  'Order Type', // AR (43)
  'Sub Contractor', // AS (44)
  'Truck Site', // AT (45)
  'Truck No.', // AU (46)
  'Driver Name', // AV (47)
  'Truck Type', // AW (48) - REQUIREMENT: AW = Truck Type (4W, 6W, 10W)
  'Truck Charge', // AX (49) - Truck Charge / Branch Sent Rate
  'Transport Site', // AY (50)
  'Trip start date', // AZ (51)
  'Trip Status', // BA (52)
  'Backhaul', // BB (53)
  'Trip No', // BC (54)
  'Receiver', // BD (55)
  'Trip Detail Status', // BE (56)
  'Transport Remark', // BF (57)
  'Trip create date', // BG (58)
  'Trip Created By', // BH (59)
  'HaulType', // BI (60)
  'ClosingRemark', // BJ (61)
  'PlanRemark', // BK (62)
  'Confirm Order By', // BL (63)
  'Customer Ref2', // BM (64)
  'OMS OrderNumber', // BN (65)
  'ZipCode', // BO (66)
  'Confirm Order Date', // BP (67)
  'ERunningNo', // BQ (68)
];

/**
 * Generate Excel Template for 69 columns Raw Data
 */
export function downloadRawData69TemplateExcel(filename = 'Daily_Raw_Data_69_Columns_Template.xlsx') {
  const wb = XLSX.utils.book_new();

  // Sample rows demonstrating 4W, 6W, 10W
  const sampleRows = [
    [
      '2/9/2026', // A: Issue Date
      '3/9/2026', // B: Clearance Date
      'AJITRADE (THAILAND) CO.,LTD.', // C: Consignee/Shipper
      '487/1 SI AYUTTHAYA ROAD. BANGKOK', // D: Address
      'GTT-D26090200838', // E: Job No.
      'HAWB-001', // F: Hawb No.
      'MAWB-001', // G: Mawb No.
      'TG-102', // H: Flt No.
      'INV-260901', // I: Invoice No.
      '20x25x30', // J: Dimension
      150, // K: QTY
      'CTN', // L: Unit
      2250, // M: G.W.
      2.25, // N: Volume
      'FOOD', // O: Product
      2, // P: Porter
      0, // Q: Dry Ice
      150, // R: Actual QTY
      'CTN', // S: Unit1
      2250, // T: Actual G.W.
      2.25, // U: Actual Volume
      '3/9/2026', // V: Pick Up Date
      '09:00:00', // W: Pick Up Time
      '9/3/26 8:40', // X: Pick Up IN
      '9/3/26 9:30', // Y: Pick Up OUT
      'YUSEN LOGISTICS (THAILAND) CO.,LTD (NLC)', // Z: Pick Up Name
      '101/95 ม.20 ถ.พหลโยธิน คลองหนึ่ง คลองหลวง ปทุมธานี', // AA: Pick Up Address
      'ปทุมธานี', // AB: Pick Up Province.
      'คลองหลวง', // AC: Pick Up District
      'นิคมอุตสาหกรรมนวนคร', // AD: Pick Up Zone
      'จองรถ 4 ล้อ', // AE: Pick Up Remark
      '3/9/2026', // AF: Delivery Date
      '14:00:00', // AG: Delivery Time
      '9/3/26 13:45', // AH: Delivery IN
      '9/3/26 14:30', // AI: Delivery OUT
      'AJITRADE (THAILAND) CO.,LTD.', // AJ: Delivery Name
      '487/1 ถนนศรีอยุธยา แขวงถนนพญาไท เขตราชเทวี กรุงเทพฯ', // AK: Delivery Address
      'กรุงเทพมหานคร', // AL: Delivery Province
      'ราชเทวี', // AM: Delivery District
      'พญาไท', // AN: Delivery Zone
      'ส่งเอกสารตัวจริงครบชุด', // AO: Delivery Remark
      'MS. NATTAPORN', // AP: CS Name
      '1004 CLC1 NLC', // AQ: Business Unit
      'Charter-Domestics', // AR: Order Type
      'GTT Fleet', // AS: Sub Contractor
      'NLC-DC', // AT: Truck Site
      '1ฒฮ-4821', // AU: Truck No.
      'สมพงษ์ ใจมั่น', // AV: Driver Name
      '4W/Single Unit', // AW: Truck Type (4 ล้อ - Col index 48)
      3280, // AX: Truck Charge (Col index 49)
      'NLC-DC', // AY: Transport Site
      '9/3/26 8:40', // AZ: Trip start date
      'FinishTrip', // BA: Trip Status
      'No', // BB: Backhaul
      'TRP-260902-001', // BC: Trip No
      'K. Wiparat', // BD: Receiver
      'Completed', // BE: Trip Detail Status
      'จัดส่งเรียบร้อย', // BF: Transport Remark
      '9/2/26 17:00', // BG: Trip create date
      'SanyaDTG', // BH: Trip Created By
      'Direct', // BI: HaulType
      'ปิดรอบแล้ว', // BJ: ClosingRemark
      '-', // BK: PlanRemark
      'Customer Care', // BL: Confirm Order By
      'REF-2609-01', // BM: Customer Ref2
      'OMS-98120', // BN: OMS OrderNumber
      '10400', // BO: ZipCode
      '9/2/26 17:30', // BP: Confirm Order Date
      'ERN-26090001', // BQ: ERunningNo
    ],
    [
      '5/9/2026',
      '5/9/2026',
      'ROLAND DIGITAL GROUP (THAILAND)',
      '700/806 ม.1 นิคมอมตะซิตี้ ชลบุรี',
      'GTT-D26090500124',
      'HAWB-002',
      'MAWB-002',
      'TG-105',
      'INV-260902',
      '30x40x50',
      80,
      'BOX',
      1800,
      3.5,
      'ELECTRONICS',
      1,
      0,
      80,
      'BOX',
      1800,
      3.5,
      '5/9/2026',
      '08:00:00',
      '9/5/26 7:50',
      '9/5/26 8:30',
      'BANG BO LOGISTICS CENTER (BLC)',
      'บางบ่อ สมุทรปราการ',
      'สมุทรปราการ',
      'บางบ่อ',
      'บางบ่อ',
      'รถ 6 ล้อตู้แห้ง',
      '5/9/2026',
      '13:30:00',
      '9/5/26 13:15',
      '9/5/26 14:00',
      'ROLAND DIGITAL GROUP (THAILAND)',
      'นิคมอุตสาหกรรมอมตะซิตี้ ชลบุรี',
      'ชลบุรี',
      'พานทอง',
      'อมตะนคร ชลบุรี',
      'ระวังสินค้าแตกหัก',
      'MR. SARAWUT',
      '1005 CLC2 BLC',
      'Charter-Domestics',
      'SJD Transport',
      'BLC-DC',
      '70-8812',
      'วิชัย สุขใจ',
      '6W/Single Unit', // AW = Truck Type (6 ล้อ - Col index 48)
      4200, // AX = Truck Charge (Col index 49)
      'BLC-DC',
      '9/5/26 8:00',
      'FinishTrip',
      'No',
      'TRP-260905-002',
      'K. Narong',
      'Completed',
      'ส่งมอบแล้ว',
      '9/5/26 7:00',
      'Operator1',
      'Direct',
      'เรียบร้อย',
      '-',
      'Customer Care',
      'REF-2609-02',
      'OMS-98125',
      '20160',
      '9/4/26 16:00',
      'ERN-26090002',
    ],
    [
      '8/9/2026',
      '8/9/2026',
      'PRIMAHAM (THAILAND) CO.,LTD.',
      '392 ม.7 304 อินดัสเตรียล ปราจีนบุรี',
      'GTT-D26090800311',
      'HAWB-003',
      'MAWB-003',
      'SQ-901',
      'INV-260903',
      '50x50x60',
      450,
      'CTN',
      6800,
      12.5,
      'CHILLED FOOD',
      2,
      20,
      450,
      'CTN',
      6800,
      12.5,
      '8/9/2026',
      '07:00:00',
      '9/8/26 6:45',
      '9/8/26 7:45',
      'YUSEN LOGISTICS (THAILAND) CO.,LTD (NLC)',
      'คลองหลวง ปทุมธานี',
      'ปทุมธานี',
      'คลองหลวง',
      'นวนคร',
      'รถ 10 ล้อตู้เย็นควบคุมอุณหภูมิ',
      '8/9/2026',
      '15:00:00',
      '9/8/26 14:30',
      '9/8/26 15:30',
      'PRIMAHAM (THAILAND) CO.,LTD.',
      '304 Industrial Park อ.ศรีมหาโพธิ จ.ปราจีนบุรี',
      'ปราจีนบุรี',
      'ศรีมหาโพธิ',
      'ศรีมหาโพธิ',
      'รักษาอุณหภูมิ -18C',
      'MS. NATTAPORN',
      '1004 CLC1 NLC',
      'Charter-Domestics',
      'GTT Fleet',
      'NLC-DC',
      '71-5544',
      'อนันต์ สมบูรณ์',
      '10W/Single Unit', // AW = Truck Type (10 ล้อ - Col index 48)
      6500, // AX = Truck Charge (Col index 49)
      'NLC-DC',
      '9/8/26 7:00',
      'FinishTrip',
      'No',
      'TRP-260908-003',
      'K. Prasert',
      'Completed',
      'ตรวจรับครบถ้วน',
      '9/7/26 18:00',
      'SanyaDTG',
      'Direct',
      'ปิดรอบแล้ว',
      '-',
      'Customer Care',
      'REF-2609-03',
      'OMS-98130',
      '25140',
      '9/7/26 16:30',
      'ERN-26090003',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([RAW_DATA_69_COLUMNS, ...sampleRows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Raw Data (69 Columns)');
  XLSX.writeFile(wb, filename);
}

/**
 * Parse uploaded Raw Trip Data file (Excel or CSV)
 * Strictly supports the 69 columns specified, with Truck Type taken from Column AW (index 48)
 * and Truck Charge taken from Column AX (index 49)
 */
export function parseUploadedRawData(fileData: ArrayBuffer): RawTripData[] {
  const wb = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];

  // Convert to array of arrays to find header row
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rows.length < 2) return [];

  // Find header row that contains "Issue Date", "Job No.", or "Truck Type"
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowStr = (rows[i] || []).map((c) => String(c || '').toLowerCase()).join(' ');
    if (rowStr.includes('issue date') || rowStr.includes('job no') || rowStr.includes('consignee') || rowStr.includes('truck type')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0; // fallback to row 0
  }

  const headers = rows[headerIndex].map((h: any) => String(h || '').trim());
  const dataRows = rows.slice(headerIndex + 1);

  // Helper to get value by keyword match or by specific column index
  const getCol = (row: any[], nameKeywords: string[], defaultColIdx?: number): string => {
    // Try exact or partial keyword match in header
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c].toLowerCase();
      if (nameKeywords.some((kw) => h === kw.toLowerCase() || h.includes(kw.toLowerCase()))) {
        if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
          return String(row[c]).trim();
        }
      }
    }

    // Fallback to default column index if provided and valid
    if (defaultColIdx !== undefined && defaultColIdx >= 0 && defaultColIdx < row.length) {
      if (row[defaultColIdx] !== undefined && row[defaultColIdx] !== null) {
        return String(row[defaultColIdx]).trim();
      }
    }

    return '';
  };

  const parsedTrips: RawTripData[] = [];

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx];
    if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
      continue;
    }

    // 1. Issue Date (Col 0 / A)
    const rawIssueDate = getCol(row, ['issue date', 'date', 'วันที่'], 0);
    const issueDate = rawIssueDate ? normalizeDate(rawIssueDate) : new Date().toLocaleDateString('th-TH');

    // 2. Clearance Date (Col 1 / B)
    const clearanceDate = getCol(row, ['clearance date', 'clearance'], 1);

    // 3. Consignee/Shipper (Col 2 / C)
    const rawConsignee = getCol(row, ['consignee/shipper', 'consignee', 'shipper', 'ลูกค้า'], 2);

    // 4. Address (Col 3 / D)
    const consigneeAddr = getCol(row, ['address', 'ที่อยู่'], 3);

    // 5. Job No. (Col 4 / E)
    const jobNo = getCol(row, ['job no.', 'job no', 'job number', 'job'], 4);

    // 6-9. Hawb, Mawb, Flt, Invoice (Col 5-8 / F-I)
    const hawbNo = getCol(row, ['hawb no.', 'hawb no', 'hawb'], 5);
    const mawbNo = getCol(row, ['mawb no.', 'mawb no', 'mawb'], 6);
    const fltNo = getCol(row, ['flt no.', 'flt no', 'flight'], 7);
    const invoiceNo = getCol(row, ['invoice no.', 'invoice no', 'inv'], 8);

    // 10-14. Dimension, QTY, Unit, G.W., Volume (Col 9-13 / J-N)
    const dimension = getCol(row, ['dimension', 'dim'], 9);
    const qty = parseFloat(getCol(row, ['qty', 'quantity', 'จำนวน'], 10)) || 0;
    const unit = getCol(row, ['unit', 'หน่วย'], 11) || 'CTN';
    const gw = parseFloat(getCol(row, ['g.w.', 'gw', 'gross weight', 'น้ำหนัก'], 12)) || 0;
    const volume = parseFloat(getCol(row, ['volume', 'vol', 'cbm'], 13)) || 0;

    // 15-17. Product, Porter, Dry Ice (Col 14-16 / O-Q)
    const product = getCol(row, ['product', 'สินค้า'], 14) || 'General Cargo';
    const porter = parseFloat(getCol(row, ['porter', 'คนยก'], 15)) || 0;
    const dryIce = parseFloat(getCol(row, ['dry ice', 'น้ำแข็งแห้ง'], 16)) || 0;

    // 18-21. Actual QTY, Unit1, Actual G.W., Actual Volume (Col 17-20 / R-U)
    const actualQty = parseFloat(getCol(row, ['actual qty', 'actual quantity'], 17)) || qty;
    const unit1 = getCol(row, ['unit1'], 18) || unit;
    const actualGW = parseFloat(getCol(row, ['actual g.w.', 'actual gw'], 19)) || gw;
    const actualVolume = parseFloat(getCol(row, ['actual volume', 'actual vol'], 20)) || volume;

    // 22-25. Pick Up Date, Time, IN, OUT (Col 21-24 / V-Y)
    const pickUpDate = getCol(row, ['pick up date', 'pickup date'], 21);
    const pickUpTime = getCol(row, ['pick up time', 'pickup time'], 22);
    const pickUpIn = getCol(row, ['pick up in', 'pickup in'], 23);
    const pickUpOut = getCol(row, ['pick up out', 'pickup out'], 24);

    // 26-31. Pick Up Name, Address, Province, District, Zone, Remark (Col 25-30 / Z-AE)
    const pickUpName = getCol(row, ['pick up name', 'pickup name', 'ต้นทาง'], 25) || 'Warehouse';
    const pickUpAddress = getCol(row, ['pick up address', 'pickup address'], 26);
    const pickUpProvince = getCol(row, ['pick up province.', 'pick up province', 'pickup province'], 27) || 'ปทุมธานี';
    const pickUpDistrict = getCol(row, ['pick up district', 'pickup district'], 28) || '';
    const pickUpZone = getCol(row, ['pick up zone', 'pickup zone'], 29) || '';
    const pickUpRemark = getCol(row, ['pick up remark', 'pickup remark'], 30);

    // 32-35. Delivery Date, Time, IN, OUT (Col 31-34 / AF-AI)
    const deliveryDate = getCol(row, ['delivery date'], 31);
    const deliveryTime = getCol(row, ['delivery time'], 32);
    const deliveryIn = getCol(row, ['delivery in'], 33);
    const deliveryOut = getCol(row, ['delivery out'], 34);

    // 36-41. Delivery Name, Address, Province, District, Zone, Remark (Col 35-40 / AJ-AO)
    const deliveryName = getCol(row, ['delivery name', 'ปลายทาง', 'สถานที่ส่ง'], 35) || 'Destination Site';
    const deliveryAddress = getCol(row, ['delivery address'], 36);
    const deliveryProvince = getCol(row, ['delivery province'], 37) || '';
    const deliveryDistrict = getCol(row, ['delivery district'], 38) || '';
    const deliveryZone = getCol(row, ['delivery zone'], 39) || deliveryDistrict;
    const deliveryRemark = getCol(row, ['delivery remark'], 40);

    // 42-48. CS Name, Business Unit, Order Type, Sub Contractor, Truck Site, Truck No., Driver Name (Col 41-47 / AP-AV)
    const csName = getCol(row, ['cs name'], 41);
    const businessUnit = getCol(row, ['business unit'], 42);
    const orderType = getCol(row, ['order type'], 43) || 'Charter-Domestics';
    const subContractor = getCol(row, ['sub contractor', 'subcontractor'], 44);
    const truckSite = getCol(row, ['truck site'], 45);
    const truckNo = getCol(row, ['truck no.', 'truck no', 'ทะเบียน'], 46);
    const driverName = getCol(row, ['driver name', 'คนขับ'], 47);

    // 49. Truck Type (Column AW = index 48) - REQUIREMENT SPECIFIC: AW = Truck Type
    let rawTruckType = getCol(row, ['truck type', 'aw', 'aw=truck type', 'ประเภทรถ'], 48);
    if (!rawTruckType && row.length > 48 && row[48] !== undefined) {
      rawTruckType = String(row[48]).trim();
    }
    if (!rawTruckType) {
      rawTruckType = '4W/Single Unit';
    }

    // 50. Truck Charge (Column AX = index 49) - Branch Sent Rate / TMS Amount
    const rawTruckCharge = getCol(row, ['truck charge', 'charge', 'ค่ารถ', 'ราคา'], 49);
    let truckCharge = 0;
    if (rawTruckCharge) {
      const cleanNum = String(rawTruckCharge).replace(/,/g, '').trim();
      truckCharge = parseFloat(cleanNum) || 0;
    } else if (row.length > 49 && row[49] !== undefined) {
      const cleanNum = String(row[49]).replace(/,/g, '').trim();
      truckCharge = parseFloat(cleanNum) || 0;
    }

    // 51-54. Transport Site, Trip start date, Trip Status, Backhaul (Col 50-53 / AY-BB)
    const transportSite = getCol(row, ['transport site'], 50);
    const tripStartDate = getCol(row, ['trip start date'], 51);
    const tripStatus = getCol(row, ['trip status', 'สถานะ'], 52) || 'FinishTrip';
    const backhaul = getCol(row, ['backhaul', 'ขากลับ'], 53) || 'No';

    // 55. Trip No (Col 54 / BC)
    const tripNo = getCol(row, ['trip no', 'trip no.', 'trip number'], 54) || `TRP-${idx + 1}`;

    // 56-61. Receiver, Trip Detail Status, Transport Remark, Trip create date, Trip Created By, HaulType (Col 55-60 / BD-BI)
    const receiver = getCol(row, ['receiver'], 55);
    const tripDetailStatus = getCol(row, ['trip detail status'], 56) || tripStatus;
    const transportRemark = getCol(row, ['transport remark'], 57);
    const tripCreateDate = getCol(row, ['trip create date'], 58);
    const tripCreatedBy = getCol(row, ['trip created by'], 59);
    const haulType = getCol(row, ['haultype', 'haul type'], 60) || 'Direct';

    // 62-69. ClosingRemark, PlanRemark, Confirm Order By, Customer Ref2, OMS OrderNumber, ZipCode, Confirm Order Date, ERunningNo (Col 61-68 / BJ-BQ)
    const closingRemark = getCol(row, ['closingremark', 'closing remark'], 61);
    const planRemark = getCol(row, ['planremark', 'plan remark'], 62);
    const confirmOrderBy = getCol(row, ['confirm order by'], 63);
    const customerRef2 = getCol(row, ['customer ref2'], 64);
    const omsOrderNumber = getCol(row, ['oms ordernumber', 'oms order number'], 65);
    const zipCode = getCol(row, ['zipcode', 'zip code'], 66);
    const confirmOrderDate = getCol(row, ['confirm order date'], 67);
    const eRunningNo = getCol(row, ['erunningno', 'e running no'], 68);

    // Determine Branch (บางบ่อ vs นวนคร) from sites and names
    let branch: 'บางบ่อ' | 'นวนคร' = 'นวนคร';
    const siteText = `${truckSite} ${transportSite} ${pickUpName} ${businessUnit}`.toLowerCase();
    if (siteText.includes('บางบ่อ') || siteText.includes('blc') || siteText.includes('bbo') || siteText.includes('สมุทรปราการ')) {
      branch = 'บางบ่อ';
    }

    // Determine Consignee / Shipper name
    const consigneeShipper = rawConsignee || deliveryName || 'General Shipper';

    parsedTrips.push({
      id: `imported-raw-${Date.now()}-${idx + 1}`,
      issueDate,
      clearanceDate,
      consigneeShipper,
      address: consigneeAddr || deliveryAddress || '',
      jobNo: jobNo || `JOB-${idx + 1}`,
      hawbNo,
      mawbNo,
      fltNo,
      invoiceNo,
      dimension,
      qty,
      unit,
      gw,
      volume,
      product,
      porter,
      dryIce,
      actualQty,
      unit1,
      actualGW,
      actualVolume,
      pickUpDate,
      pickUpTime,
      pickUpIn,
      pickUpOut,
      pickUpName,
      pickUpAddress,
      pickUpProvince,
      pickUpDistrict,
      pickUpZone,
      pickUpRemark,
      deliveryDate,
      deliveryTime,
      deliveryIn,
      deliveryOut,
      deliveryName,
      deliveryAddress,
      deliveryProvince,
      deliveryDistrict,
      deliveryZone,
      deliveryRemark,
      csName,
      businessUnit,
      orderType,
      subContractor,
      truckSite,
      truckNo,
      driverName,
      truckType: rawTruckType,
      truckCharge,
      transportSite,
      tripStartDate,
      tripStatus,
      backhaul,
      tripNo,
      receiver,
      tripDetailStatus,
      transportRemark,
      tripCreateDate,
      tripCreatedBy,
      haulType,
      closingRemark,
      planRemark,
      confirmOrderBy,
      customerRef2,
      omsOrderNumber,
      zipCode,
      confirmOrderDate,
      eRunningNo,
      branch,
      customerQuotedRate: truckCharge > 0 ? truckCharge : undefined,
    });
  }

  return parsedTrips;
}

