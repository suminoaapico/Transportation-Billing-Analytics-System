import {
  RawTripData,
  StandardTruckType,
  RateCardTable,
  DieselPriceRecord,
  ZoneMappingRule,
  CalculatedBillingTrip,
  BillingReportSummary,
  TruckSummary,
} from '../types';

export function normalizeTruckType(rawType: string): StandardTruckType {
  const t = (rawType || '').trim().toUpperCase();
  if (t.startsWith('4W')) return '4W';
  if (t.startsWith('6W')) return '6W';
  if (t.startsWith('10W')) return '10W';
  return '4W';
}

/**
 * Standardize dates for matching (handles Excel serial dates, Thai Buddhist era, ISO dates, D/M/Y, M/D/Y)
 */
export function normalizeDate(dateStr: string | number): string {
  if (!dateStr) return '';

  // 1. Check if it's an Excel numeric serial date (e.g., 46268 is 2026-09-03)
  const numVal = Number(dateStr);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
    const d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
  }

  const str = String(dateStr).trim().split(' ')[0]; // remove time component
  const parts = str.split(/[-/.]/);

  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];

    // If format is YYYY-MM-DD
    if (day.length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }

    let dNum = parseInt(day, 10);
    let mNum = parseInt(month, 10);
    let yNum = parseInt(year, 10);

    // Convert Thai Buddhist Era (e.g. 2569 -> 2026)
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
      // Check if location exists in rate card
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

export function getDieselPriceForDate(
  issueDate: string,
  dieselDatabase: DieselPriceRecord[]
): number | null {
  const normTarget = normalizeDate(issueDate);
  const found = dieselDatabase.find((d) => normalizeDate(d.date) === normTarget);
  if (found) return found.price;

  // If exact date not matched, find closest entry or latest price
  if (dieselDatabase.length > 0) {
    return dieselDatabase[0].price;
  }
  return null;
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

  // If not exact row match, try partial match (e.g. matching province name)
  if (!row) {
    const locPart = matchedLocation.split(',')[0].trim().toLowerCase();
    row = table.rows.find((r) => r.location.toLowerCase().includes(locPart));
  }

  // Fallback to average baseline rate if completely missing from rate card
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
      bracketKey = 'g_38_40'; // Default to prevailing 38-40 THB bracket
    }
  }

  return row.rates[bracketKey] || row.rates['g_38_40'] || row.rates['c_30_32'] || 0;
}

export function processBillingTrips(
  rawTrips: RawTripData[],
  rateCards: { [key in StandardTruckType]: RateCardTable },
  dieselDatabase: DieselPriceRecord[],
  zoneMappings: ZoneMappingRule[],
  manualBracketKey?: string,
  customRatesMap?: { [tripId: string]: number }
): CalculatedBillingTrip[] {
  const rateCardLocations = [
    ...new Set([
      ...rateCards['4W'].rows.map((r) => r.location),
      ...rateCards['6W'].rows.map((r) => r.location),
      ...rateCards['10W'].rows.map((r) => r.location),
    ]),
  ];

  return rawTrips.map((raw) => {
    const standardTruckType = normalizeTruckType(raw.truckType);
    const { location: zoneLocationMatch, isFallback } = matchZone(raw, zoneMappings, rateCardLocations);
    const dieselRate = getDieselPriceForDate(raw.issueDate, dieselDatabase);

    // Calculate rate
    let standardTripRate = 0;

    // Check manual override first
    if (customRatesMap && customRatesMap[raw.id] !== undefined) {
      standardTripRate = customRatesMap[raw.id];
    } else if (zoneLocationMatch) {
      standardTripRate = calculateTripRate(
        standardTruckType,
        zoneLocationMatch,
        dieselRate,
        rateCards,
        manualBracketKey
      );
    }

    let reviewStatus: 'มีราคา' | 'ตรวจโซนปลายทาง' | 'ไม่มีราคาน้ำมัน' = 'มีราคา';
    if (!zoneLocationMatch || standardTripRate === 0) {
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
      standardTripRate,
      porterOther: raw.porter ? raw.porter * 200 : 0,
      consoleNotInGTT: 0,
      cancelledTripsInGTT: raw.tripStatus === 'Cancelled' ? standardTripRate : 0,
      missingPriceTrips: standardTripRate === 0 ? 1 : 0,
      dieselRate,
      reviewStatus,
      notes: raw.deliveryRemark || (isFallback ? 'จับคู่โซนจากจังหวัด' : ''),
    };
  });
}

export function computeBillingSummary(calculatedTrips: CalculatedBillingTrip[]): BillingReportSummary {
  const types: StandardTruckType[] = ['4W', '6W', '10W'];
  const summaries: TruckSummary[] = [];

  let grandTotalCount = 0;
  let grandTotalAmount = 0;

  for (const t of types) {
    const matching = calculatedTrips.filter((c) => c.standardTruckType === t);
    const count = matching.length;
    const totalAmount = matching.reduce((sum, item) => sum + (item.standardTripRate || 0), 0);

    summaries.push({
      truckType: t,
      count,
      totalAmount,
    });

    grandTotalCount += count;
    grandTotalAmount += totalAmount;
  }

  summaries.push({
    truckType: 'รวมทั้งหมด',
    count: grandTotalCount,
    totalAmount: grandTotalAmount,
  });

  return {
    summaries,
    grandTotalCount,
    grandTotalAmount,
  };
}
