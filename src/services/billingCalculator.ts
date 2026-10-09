import {
  RawTripData,
  StandardTruckType,
  RateCardTable,
  DieselPriceRecord,
  ZoneMappingRule,
  CalculatedBillingTrip,
  BillingReportSummary,
  TruckSummary,
  BranchSummary,
  ODSummary,
  DiffReconciliationSummary,
  FixedDieselCustomer,
  QuotationSchema,
  ODType,
  DiffStatus,
} from '../types';

export function normalizeTruckType(rawType: string): StandardTruckType {
  const t = (rawType || '').trim().toUpperCase();
  if (t.includes('10W') || t.includes('10 ล้อ') || t.includes('10ล้อ') || t.includes('OD 10') || t.includes('OD10') || t.includes('สิบล้อ') || t.includes('พ่วง') || t.includes('TRAILER')) return '10W';
  if (t.includes('6W') || t.includes('6 ล้อ') || t.includes('6ล้อ') || t.includes('OD 6') || t.includes('OD6') || t.includes('หกล้อ') || t.includes('ตู้ 6')) return '6W';
  if (t.includes('4W') || t.includes('4 ล้อ') || t.includes('4ล้อ') || t.includes('OD 4') || t.includes('OD4') || t.includes('กระบะ') || t.includes('PICKUP')) return '4W';
  return '4W';
}

/**
 * Detect Branch: 'นวนคร' or 'บางบ่อ' based on trip properties
 */
export function detectBranch(trip: RawTripData): 'นวนคร' | 'บางบ่อ' {
  if (trip.branch) {
    if (trip.branch.includes('นวนคร') || trip.branch.toUpperCase().includes('NLC')) return 'นวนคร';
    if (trip.branch.includes('บางบ่อ') || trip.branch.toUpperCase().includes('BBO') || trip.branch.toUpperCase().includes('BLC')) return 'บางบ่อ';
  }

  const combined = `${trip.truckSite || ''} ${trip.transportSite || ''} ${trip.pickUpName || ''} ${trip.pickUpAddress || ''} ${trip.pickUpProvince || ''} ${trip.pickUpDistrict || ''} ${trip.businessUnit || ''}`.toLowerCase();
  if (combined.includes('บางบ่อ') || combined.includes('blc') || combined.includes('bbo') || combined.includes('bang bo') || combined.includes('สมุทรปราการ')) {
    return 'บางบ่อ';
  }
  return 'นวนคร'; // Default branch NLC
}

/**
 * Detect OD Type (Company Truck vs Sub Contractor OD4, OD6, OD10)
 */
export function detectODType(trip: RawTripData): ODType {
  if (trip.odType) {
    const rawOd = trip.odType.trim();
    if (rawOd === 'OD 4' || rawOd === 'OD4') return 'OD 4';
    if (rawOd === 'OD 6' || rawOd === 'OD6') return 'OD 6';
    if (rawOd === 'OD 10' || rawOd === 'OD10') return 'OD 10';
    if (rawOd === 'Company Truck') return 'Company Truck';
  }

  // Check subContractor or truckType
  const sub = (trip.subContractor || '').trim().toUpperCase();
  const truckRaw = (trip.truckType || '').toUpperCase();

  const isSub = Boolean(sub && sub !== 'GTT' && sub !== 'COMPANY' && sub !== 'FLEET');

  if (isSub) {
    if (truckRaw.startsWith('4W')) return 'OD 4';
    if (truckRaw.startsWith('6W')) return 'OD 6';
    if (truckRaw.startsWith('10W')) return 'OD 10';
    return 'OD 4';
  }

  return 'Company Truck';
}

/**
 * Standardize dates for matching (handles Excel serial dates, Thai Buddhist era, ISO dates, D/M/Y, M/D/Y)
 */
export function normalizeDate(dateStr: string | number): string {
  if (!dateStr) return '';

  const numVal = Number(dateStr);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
    const d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
  }

  const str = String(dateStr).trim().split(' ')[0];
  const parts = str.split(/[-/.]/);

  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];

    if (day.length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }

    let dNum = parseInt(day, 10);
    let mNum = parseInt(month, 10);
    let yNum = parseInt(year, 10);

    if (yNum > 2400) {
      yNum -= 543;
    } else if (yNum < 100) {
      yNum = 2000 + yNum;
    }

    if (!isNaN(dNum) && !isNaN(mNum) && !isNaN(yNum)) {
      return `${dNum}/${mNum}/${yNum}`;
    }
  }

  return str;
}

/**
 * Parse Month and Year from issueDate (e.g. "2/9/2026" -> month 9, year 2026)
 */
export function parseDateMonthYear(dateStr: string | number): { month: number; year: number } | null {
  const norm = normalizeDate(dateStr);
  const parts = norm.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(month) && !isNaN(year)) {
      return { month, year };
    }
  }
  return null;
}

/**
 * Calculate Monthly Average Diesel Rate from PTT Database
 * Logic: Sum all daily diesel prices in the specified month / count of days
 * Example: September 2026 (1-30/9/26) = sum / 30 = ~40.69 THB/L
 */
export function calculateMonthlyAverageDiesel(
  month: number,
  year: number,
  dieselDatabase: DieselPriceRecord[]
): number | null {
  if (!dieselDatabase || dieselDatabase.length === 0) return null;

  const monthRecords = dieselDatabase.filter((rec) => {
    const parsed = parseDateMonthYear(rec.date);
    return parsed && parsed.month === month && parsed.year === year;
  });

  if (monthRecords.length === 0) {
    // If exact month not found, compute average of available records
    const sum = dieselDatabase.reduce((acc, curr) => acc + curr.price, 0);
    return Math.round((sum / dieselDatabase.length) * 100) / 100;
  }

  const sum = monthRecords.reduce((acc, curr) => acc + curr.price, 0);
  const avg = sum / monthRecords.length;
  return Math.round(avg * 100) / 100;
}

/**
 * Intelligent Zone Matching with multiple tiers (Exact mapping -> Industrial Park -> District -> Province Fallback)
 */
export function matchZone(
  trip: RawTripData,
  zoneMappings: ZoneMappingRule[],
  rateCardLocations: string[]
): { location: string; isFallback: boolean } {
  const deliveryDistrict = trip.deliveryDistrict || '';
  const deliveryProvince = trip.deliveryProvince || '';
  const deliveryZone = trip.deliveryZone || '';
  const deliveryAddress = trip.deliveryAddress || '';
  const deliveryName = trip.deliveryName || '';

  const combinedSearchText = `${deliveryDistrict} ${deliveryProvince} ${deliveryZone} ${deliveryName} ${deliveryAddress}`.toLowerCase();

  // Tier 1: Try explicit Zone Mapping rules first
  for (const rule of zoneMappings) {
    const rawKw = rule.rawZoneKeyword.trim().toLowerCase();
    const provKw = (rule.provinceKeyword || '').trim().toLowerCase();

    if (rawKw && combinedSearchText.includes(rawKw)) {
      if (!provKw || combinedSearchText.includes(provKw)) {
        return { location: rule.matchedLocation, isFallback: false };
      }
    }
  }

  // Tier 2: Direct match with Rate Card location names (English / Thai parts)
  for (const loc of rateCardLocations) {
    const parts = loc.toLowerCase().split(/[, ]+/);
    const matchCount = parts.filter((p) => p.length > 2 && combinedSearchText.includes(p)).length;
    if (matchCount >= 2 || (parts.length === 1 && combinedSearchText.includes(parts[0]))) {
      return { location: loc, isFallback: false };
    }
  }

  // Tier 3: Province Fallback matching to guarantee trips get appropriate baseline rates
  const provinceFallbacks: { [prov: string]: string } = {
    'สมุทรปราการ': 'Bang Sao Thong, Samut Prakan',
    'ปทุมธานี': 'Navanakorn, Pathumtani',
    'สระบุรี': 'Nong Khae, Saraburi',
    'ลพบุรี': 'Phatthana Nikhom, Lopburi',
    'นครปฐม': 'Samphan, Nakornphathom',
    'สมุทรสาคร': 'Mueng, Samutsakorn',
    'พระนครศรีอยุธยา': 'Hi-tech, Ayutthaya',
    'อยุธยา': 'Hi-tech, Ayutthaya',
    'ปราจีนบุรี': 'Si Maha Phot, Prachinburi',
    'ชลบุรี': 'Mueng, Chonburi',
    'ฉะเชิงเทรา': 'Gateway, Chachoengsao',
    'ระยอง': 'Pluak Daeng, Rayong',
    'กรุงเทพมหานคร': 'Bang Na, Bangkok',
    'กรุงเทพ': 'Bang Na, Bangkok',
    'นครราชสีมา': 'Pak Chong, Nakhon Ratchasima',
    'โคราช': 'Pak Chong, Nakhon Ratchasima',
  };

  for (const [provKw, locMatch] of Object.entries(provinceFallbacks)) {
    if (combinedSearchText.includes(provKw.toLowerCase())) {
      const found = rateCardLocations.find(
        (l) => l.toLowerCase() === locMatch.toLowerCase()
      );
      if (found) {
        return { location: found, isFallback: true };
      }
      return { location: locMatch, isFallback: true };
    }
  }

  return { location: '', isFallback: false };
}

/**
 * Determine Effective Diesel Rate:
 * 1. Checks if customer is a "Fixed Diesel Rate" customer (e.g., SIEMENS = fixed contract rate)
 * 2. If not, uses Monthly Average (PTT Diesel Database average for the entire month)
 * 3. Fallback: Daily spot price
 */
export function getEffectiveDieselRate(
  trip: RawTripData,
  dieselDatabase: DieselPriceRecord[],
  fixedCustomers: FixedDieselCustomer[] = [],
  method: 'monthly_avg' | 'daily_spot' = 'monthly_avg'
): { rate: number | null; method: 'monthly_avg' | 'fixed_contract' | 'daily_spot' } {
  const shipperName = (trip.consigneeShipper || '').toUpperCase().trim();

  // Check Exception: Fixed Diesel Rate Customer (e.g. Siemens)
  const fixedMatch = fixedCustomers.find(
    (c) => c.active && (shipperName.includes(c.customerName.toUpperCase()) || c.customerName.toUpperCase().includes(shipperName))
  );

  if (fixedMatch) {
    return {
      rate: fixedMatch.fixedDieselRate,
      method: 'fixed_contract',
    };
  }

  // Monthly Average method (Standard requirement)
  if (method === 'monthly_avg') {
    const my = parseDateMonthYear(trip.issueDate);
    if (my) {
      const monthlyAvg = calculateMonthlyAverageDiesel(my.month, my.year, dieselDatabase);
      if (monthlyAvg !== null) {
        return { rate: monthlyAvg, method: 'monthly_avg' };
      }
    }
  }

  // Daily Spot price
  const normTarget = normalizeDate(trip.issueDate);
  const found = dieselDatabase.find((d) => normalizeDate(d.date) === normTarget);
  if (found) {
    return { rate: found.price, method: 'daily_spot' };
  }

  if (dieselDatabase.length > 0) {
    return { rate: dieselDatabase[0].price, method: 'daily_spot' };
  }

  return { rate: null, method: 'monthly_avg' };
}

export function getBracketKeyForDiesel(
  dieselPrice: number,
  brackets: RateCardTable['brackets']
): string {
  for (const b of brackets) {
    if (dieselPrice >= b.minDiesel && dieselPrice <= b.maxDiesel) {
      return b.key;
    }
  }
  if (dieselPrice < 30) return brackets[0].key;
  return brackets[brackets.length - 1].key;
}

export function calculateTripRate(
  standardType: StandardTruckType,
  matchedLocation: string,
  dieselPrice: number | null,
  rateCards: { [key in StandardTruckType]: RateCardTable },
  manualBracketKey?: string
): number {
  if (!matchedLocation) return 0;

  const table = rateCards[standardType];
  if (!table) return 0;

  let row = table.rows.find(
    (r) => r.location.trim().toLowerCase() === matchedLocation.trim().toLowerCase()
  );

  if (!row) {
    const locPart = matchedLocation.split(',')[0].trim().toLowerCase();
    row = table.rows.find((r) => r.location.toLowerCase().includes(locPart));
  }

  if (!row) {
    if (standardType === '4W') return 1850;
    if (standardType === '6W') return 2950;
    return 4500;
  }

  let bracketKey = manualBracketKey;
  if (!bracketKey || bracketKey === 'auto') {
    if (dieselPrice != null && dieselPrice > 0) {
      bracketKey = getBracketKeyForDiesel(dieselPrice, table.brackets);
    } else {
      bracketKey = 'g_38_40';
    }
  }

  return row.rates[bracketKey] || row.rates['g_38_40'] || row.rates['c_30_32'] || 0;
}

/**
 * Match Quotation for a specific trip by Consignee/Shipper and Branch
 */
export function findMatchingQuotation(
  trip: RawTripData,
  branch: string,
  quotations: QuotationSchema[] = []
): QuotationSchema | null {
  if (!quotations || quotations.length === 0) return null;
  const shipper = (trip.consigneeShipper || '').toLowerCase().trim();

  return (
    quotations.find((q) => {
      const qCompany = q.companyName.toLowerCase().trim();
      const matchCompany = shipper.includes(qCompany) || qCompany.includes(shipper);
      const matchBranch = !q.branch || q.branch === 'ทั้งหมด' || q.branch === branch;
      return matchCompany && matchBranch;
    }) ||
    quotations.find((q) => {
      const qCompany = q.companyName.toLowerCase().trim();
      return shipper.includes(qCompany) || qCompany.includes(shipper);
    }) ||
    null
  );
}

/**
 * Comprehensive Billing Processor with full Quotation Schema, OD rates, Additional fees, and Diff Reconciliation
 */
export function processBillingTrips(
  rawTrips: RawTripData[],
  rateCards: { [key in StandardTruckType]: RateCardTable },
  dieselDatabase: DieselPriceRecord[],
  zoneMappings: ZoneMappingRule[],
  manualBracketKey?: string,
  customRatesMap?: { [tripId: string]: number },
  quotations: QuotationSchema[] = [],
  fixedCustomers: FixedDieselCustomer[] = [],
  dieselMethod: 'monthly_avg' | 'daily_spot' = 'monthly_avg'
): CalculatedBillingTrip[] {
  const rateCardLocations = [
    ...new Set([
      ...rateCards['4W'].rows.map((r) => r.location),
      ...rateCards['6W'].rows.map((r) => r.location),
      ...rateCards['10W'].rows.map((r) => r.location),
    ]),
  ];

  const seenTripNos = new Set<string>();

  return rawTrips.map((raw) => {
    const standardTruckType = normalizeTruckType(raw.truckType);
    const branch = detectBranch(raw);
    const odType = detectODType(raw);
    const isSubContractor = odType !== 'Company Truck';

    // Check if trip is cancelled / void / abort
    const statusText = `${raw.tripStatus || ''} ${raw.tripDetailStatus || ''} ${raw.closingRemark || ''} ${raw.planRemark || ''}`.toLowerCase();
    const isCancelled = statusText.includes('cancel') || statusText.includes('ยกเลิก') || statusText.includes('void') || statusText.includes('abort');

    // Check multi-drop: In TMS exports, 1 trip with multiple drop points creates multiple rows with the same Trip No.
    // In real billing, only the 1st drop gets Base Rate + Fuel. Subsequent drops get only Drop Fee (500฿).
    const tripNoKey = (raw.tripNo || '').trim();
    const isSubsequentDrop = Boolean(tripNoKey && seenTripNos.has(tripNoKey));
    if (tripNoKey && !isCancelled) {
      seenTripNos.add(tripNoKey);
    }

    const { location: zoneLocationMatch, isFallback } = matchZone(raw, zoneMappings, rateCardLocations);

    // Effective diesel rate (Monthly Average standard or fixed contract)
    const { rate: dieselRate, method: dieselMethodUsed } = getEffectiveDieselRate(
      raw,
      dieselDatabase,
      fixedCustomers,
      dieselMethod
    );

    // Matching Quotation
    const matchedQuotation = findMatchingQuotation(raw, branch, quotations);

    // Additional Fee configurations
    const qFees = matchedQuotation?.additionalFees || {
      porter: 200,
      dryIce: 150,
      seal: 50,
      toll: 120,
      waitingFeePerHour: 300,
      dropFeePerPoint: 500,
      consoleFee: 100,
      otFee: 250,
      penalty: 0,
    };

    // 1. Base Trip Rate
    let baseTripRate = 0;
    if (isCancelled) {
      baseTripRate = 0;
    } else if (isSubsequentDrop) {
      // Subsequent drop in a multi-drop run: Only billed drop fee (e.g. 500 THB)
      baseTripRate = 0;
    } else if (customRatesMap && customRatesMap[raw.id] !== undefined) {
      baseTripRate = customRatesMap[raw.id];
    } else if (isSubContractor && matchedQuotation?.odRates) {
      const odKey = odType.replace(' ', ''); // 'OD4', 'OD6', 'OD10'
      const odRateObj = matchedQuotation.odRates[odKey];
      if (odRateObj && odRateObj.baseRate > 0) {
        baseTripRate = odRateObj.baseRate;
      } else {
        baseTripRate = calculateTripRate(standardTruckType, zoneLocationMatch, dieselRate, rateCards, manualBracketKey);
      }
    } else if (zoneLocationMatch) {
      baseTripRate = calculateTripRate(
        standardTruckType,
        zoneLocationMatch,
        dieselRate,
        rateCards,
        manualBracketKey
      );
    }

    // 2. Fuel Surcharge
    let fuelSurcharge = 0;
    if (isCancelled || isSubsequentDrop) {
      // No fuel surcharge on cancelled or subsequent drops
      fuelSurcharge = 0;
    } else if (matchedQuotation) {
      if (isSubContractor && matchedQuotation.odRates) {
        const odKey = odType.replace(' ', '');
        fuelSurcharge = matchedQuotation.odRates[odKey]?.fuelRate || 0;
      } else {
        const truckRate = matchedQuotation.truckTypes[standardTruckType];
        if (truckRate?.fuelSurcharge) {
          fuelSurcharge = truckRate.fuelSurcharge;
        }
      }
    } else if (dieselRate && dieselRate > 38.0) {
      // Dynamic fuel surcharge based on diesel differential (> 38 THB/L)
      const diffLitre = dieselRate - 38.0;
      fuelSurcharge = Math.round(diffLitre * (standardTruckType === '4W' ? 80 : standardTruckType === '6W' ? 120 : 180));
    }

    // 3. Additional Fees
    const dropFee = isCancelled
      ? 0
      : isSubsequentDrop
      ? qFees.dropFeePerPoint // Charged 500฿ as additional drop
      : (raw.dropCount || 0) * qFees.dropFeePerPoint;

    const waitingFee = isCancelled ? 0 : (raw.waitingHours || 0) * qFees.waitingFeePerHour;
    const tollFee = isCancelled
      ? 0
      : raw.tollActual !== undefined
      ? raw.tollActual
      : (matchedQuotation?.truckTypes[standardTruckType]?.tollFee || 0);
    const porterFee = isCancelled ? 0 : (raw.porter ? raw.porter * qFees.porter : 0);
    const dryIceFee = isCancelled ? 0 : (raw.dryIce ? raw.dryIce * qFees.dryIce : 0);
    const sealFee = 0;
    const consoleFee = 0;
    const otFee = 0;
    const penaltyFee = 0;

    const otherFees = dryIceFee + sealFee + consoleFee + otFee + penaltyFee;

    // Total Amount
    const totalAmount = isCancelled ? 0 : baseTripRate + fuelSurcharge + dropFee + waitingFee + tollFee + porterFee + otherFees;

    // Customer Quoted Rate / Expected Price
    let customerQuotedPrice = raw.customerQuotedRate || raw.truckCharge || 0;
    if (isCancelled) {
      customerQuotedPrice = 0;
    } else if (customerQuotedPrice === 0) {
      customerQuotedPrice = totalAmount; // Default match if not provided in raw
    }

    // Diff calculation
    const diffAmount = totalAmount - customerQuotedPrice;
    const diffPercent = customerQuotedPrice > 0 ? (Math.abs(diffAmount) / customerQuotedPrice) * 100 : totalAmount > 0 ? 100 : 0;

    let diffStatus: DiffStatus = 'Match';
    if (Math.abs(diffAmount) < 1) {
      diffStatus = 'Match';
    } else if (diffPercent < 5) {
      diffStatus = 'MinorDiff';
    } else {
      diffStatus = 'MajorDiff';
    }

    // Diff Reason diagnosis
    let diffReason = 'ตรงกัน (Match 100%)';
    if (isCancelled) {
      diffReason = 'ทริปยกเลิก (Cancelled Trip / 0.00 บาท)';
    } else if (isSubsequentDrop) {
      diffReason = 'จุดส่งเพิ่มในทริปเดียวกัน (Multi-Drop +500 บาท)';
    } else if (!zoneLocationMatch || baseTripRate === 0) {
      diffReason = 'ไม่ match zone / ไม่พบใน Rate Card';
    } else if (dieselRate === null) {
      diffReason = 'ไม่มีราคาน้ำมัน (Missing Diesel Rate)';
    } else if (diffStatus !== 'Match') {
      if (isSubContractor && !matchedQuotation?.odRates) {
        diffReason = 'เรทรถซับ OD ต่างจากเรทมาตรฐาน';
      } else if (dieselMethodUsed === 'fixed_contract') {
        diffReason = 'ใช้เรทสัญญาคงที่ (Fixed Diesel Contract 38.00)';
      } else if (tollFee > 0 || dropFee > 0 || waitingFee > 0) {
        diffReason = 'มีค่าใช้จ่ายพิเศษ (Drop/Toll/Wait Fees)';
      } else {
        diffReason = `ส่วนต่าง ${diffPercent.toFixed(1)}% (${diffAmount > 0 ? '+' : ''}${diffAmount.toFixed(0)} ฿)`;
      }
    }

    let reviewStatus: 'มีราคา' | 'ตรวจโซนปลายทาง' | 'ไม่มีราคาน้ำมัน' = 'มีราคา';
    if (isCancelled) {
      reviewStatus = 'มีราคา';
    } else if (!zoneLocationMatch || (baseTripRate === 0 && !isSubsequentDrop)) {
      reviewStatus = 'ตรวจโซนปลายทาง';
    } else if (dieselRate === null) {
      reviewStatus = 'ไม่มีราคาน้ำมัน';
    }

    return {
      id: raw.id,
      raw,
      issueDate: raw.issueDate,
      jobNo: raw.jobNo || '-',
      tripNo: raw.tripNo || '-',
      branch,
      odType,
      isSubContractor,
      consigneeShipper: raw.consigneeShipper || '-',
      pickUpName: raw.pickUpName || '-',
      pickUpProvince: raw.pickUpProvince || '-',
      deliveryName: raw.deliveryName || '-',
      deliveryDistrict: raw.deliveryDistrict || '-',
      deliveryProvince: raw.deliveryProvince || '-',
      zoneLocationMatch: zoneLocationMatch || (isFallback ? 'จับคู่อัตโนมัติ (จังหวัด)' : 'ไม่พบการจับคู่'),
      truckTypeRaw: raw.truckType || '-',
      standardTruckType,
      backhaul: raw.backhaul || 'No',
      haulType: raw.haulType || 'Direct',

      baseTripRate,
      fuelSurcharge,
      dropFee,
      waitingFee,
      tollFee,
      porterFee,
      otherFees,
      otherFeesBreakdown: {
        dryIce: dryIceFee,
        seal: sealFee,
        console: consoleFee,
        ot: otFee,
        penalty: penaltyFee,
      },

      standardTripRate: baseTripRate,
      totalAmount,
      customerQuotedPrice,
      diffAmount,
      diffPercent,
      diffStatus,
      diffReason,

      porterOther: porterFee,
      consoleNotInGTT: 0,
      cancelledTripsInGTT: raw.tripStatus === 'Cancelled' ? totalAmount : 0,
      missingPriceTrips: totalAmount === 0 ? 1 : 0,
      dieselRate,
      dieselMethod: dieselMethodUsed,
      reviewStatus,
      notes: raw.deliveryRemark || (isFallback ? 'จับคู่โซนจากจังหวัด' : ''),
    };
  });
}

/**
 * Compute Comprehensive Billing Summary with Truck Types, Branches, Sub Contractors, and Diff Reconciliation
 */
export function computeBillingSummary(calculatedTrips: CalculatedBillingTrip[]): BillingReportSummary {
  const types: StandardTruckType[] = ['4W', '6W', '10W'];
  const summaries: TruckSummary[] = [];

  let grandTotalCount = 0;
  let grandTotalAmount = 0;
  let grandTotalBaseRate = 0;
  let grandTotalFuelSurcharge = 0;
  let grandTotalOtherFees = 0;

  for (const t of types) {
    const matching = calculatedTrips.filter((c) => c.standardTruckType === t);
    const count = matching.length;
    const baseRateAmount = matching.reduce((sum, item) => sum + (item.baseTripRate || 0), 0);
    const fuelSurchargeAmount = matching.reduce((sum, item) => sum + (item.fuelSurcharge || 0), 0);
    const otherFeesAmount = matching.reduce(
      (sum, item) => sum + (item.dropFee + item.waitingFee + item.tollFee + item.porterFee + item.otherFees),
      0
    );
    const totalAmount = matching.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    summaries.push({
      truckType: t,
      count,
      baseRateAmount,
      fuelSurchargeAmount,
      otherFeesAmount,
      totalAmount,
    });

    grandTotalCount += count;
    grandTotalAmount += totalAmount;
    grandTotalBaseRate += baseRateAmount;
    grandTotalFuelSurcharge += fuelSurchargeAmount;
    grandTotalOtherFees += otherFeesAmount;
  }

  summaries.push({
    truckType: 'รวมทั้งหมด',
    count: grandTotalCount,
    baseRateAmount: grandTotalBaseRate,
    fuelSurchargeAmount: grandTotalFuelSurcharge,
    otherFeesAmount: grandTotalOtherFees,
    totalAmount: grandTotalAmount,
  });

  // Branch summaries
  const branches = ['นวนคร', 'บางบ่อ'];
  const branchSummaries: BranchSummary[] = branches.map((b) => {
    const matching = calculatedTrips.filter((t) => t.branch === b);
    const count = matching.length;
    const totalAmount = matching.reduce((sum, t) => sum + t.totalAmount, 0);
    return {
      branch: b,
      count,
      totalAmount,
      avgPerTrip: count > 0 ? totalAmount / count : 0,
    };
  });

  // OD Subcontractor summaries
  const odCategories = ['Company Truck', 'OD 4', 'OD 6', 'OD 10'];
  const odSummaries: ODSummary[] = odCategories.map((od) => {
    const matching = calculatedTrips.filter((t) => t.odType === od);
    const count = matching.length;
    const totalAmount = matching.reduce((sum, t) => sum + t.totalAmount, 0);
    return {
      odType: od,
      isSubContractor: od !== 'Company Truck',
      count,
      totalAmount,
    };
  });

  const subContractorMatching = calculatedTrips.filter((t) => t.isSubContractor);
  const companyTruckMatching = calculatedTrips.filter((t) => !t.isSubContractor);

  // Diff Reconciliation summary
  const matchTrips = calculatedTrips.filter((t) => t.diffStatus === 'Match');
  const minorDiffTrips = calculatedTrips.filter((t) => t.diffStatus === 'MinorDiff');
  const majorDiffTrips = calculatedTrips.filter((t) => t.diffStatus === 'MajorDiff');

  const diffSummary: DiffReconciliationSummary = {
    matchCount: matchTrips.length,
    matchAmount: matchTrips.reduce((s, t) => s + t.totalAmount, 0),
    minorDiffCount: minorDiffTrips.length,
    minorDiffAmount: minorDiffTrips.reduce((s, t) => s + t.totalAmount, 0),
    majorDiffCount: majorDiffTrips.length,
    majorDiffAmount: majorDiffTrips.reduce((s, t) => s + t.totalAmount, 0),
    netDiffAmount: calculatedTrips.reduce((s, t) => s + t.diffAmount, 0),
  };

  return {
    summaries,
    grandTotalCount,
    grandTotalAmount,
    grandTotalBaseRate,
    grandTotalFuelSurcharge,
    grandTotalOtherFees,
    subContractorCount: subContractorMatching.length,
    subContractorAmount: subContractorMatching.reduce((s, t) => s + t.totalAmount, 0),
    companyTruckCount: companyTruckMatching.length,
    companyTruckAmount: companyTruckMatching.reduce((s, t) => s + t.totalAmount, 0),
    branchSummaries,
    odSummaries,
    diffSummary,
  };
}
