import { getSupabase } from './supabaseClient';
import {
  RawTripData,
  DieselPriceRecord,
  RateCardTable,
  StandardTruckType,
  ZoneMappingRule,
  QuotationSchema,
  FixedDieselCustomer,
} from '../types';

/**
 * Data mapping utilities between camelCase TypeScript models and snake_case PostgreSQL columns
 */

/**
 * Normalize and convert varied date formats (Thai Buddhist era 2569, D/M/Y, M/D/Y, Excel serial, ISO)
 * into strict PostgreSQL DATE format YYYY-MM-DD.
 * If empty or invalid, returns null.
 */
export function parseDbDate(raw: any): string | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null') return null;

  // 1. If already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. If ISO timestamp with T or space (e.g. 2026-09-08T12:00:00 or 2026-09-08 12:00:00)
  if (/^\d{4}-\d{2}-\d{2}[ T]/.test(str)) {
    return str.substring(0, 10);
  }

  // 3. Handle Excel serial date numbers (e.g. 46274)
  const numVal = Number(str);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
    const d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 4. Split by slash, dash, dot (ignore trailing time if any)
  const datePart = str.split(' ')[0];
  const parts = datePart.split(/[-/.]/);

  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];

    // If format is YYYY/MM/DD
    if (day.length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }

    let dNum = parseInt(day, 10);
    let mNum = parseInt(month, 10);
    let yNum = parseInt(year, 10);

    // Buddhist Era correction (e.g. 2569 -> 2026)
    if (yNum > 2400) {
      yNum -= 543;
    } else if (yNum < 100) {
      yNum = 2000 + yNum;
    }

    if (!isNaN(dNum) && !isNaN(mNum) && !isNaN(yNum) && mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      const yStr = String(yNum).padStart(4, '0');
      const mStr = String(mNum).padStart(2, '0');
      const dStr = String(dNum).padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}`;
    }
  }

  // 5. Native Date fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    let y = parsed.getFullYear();
    if (y > 2400) y -= 543;
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

export function mapTripToDb(trip: RawTripData): Record<string, any> {
  return {
    id: trip.id || (trip.jobNo && trip.tripNo ? `${trip.jobNo}-${trip.tripNo}` : `TRP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    issue_date: parseDbDate(trip.issueDate),
    clearance_date: parseDbDate(trip.clearanceDate),
    consignee_shipper: trip.consigneeShipper || '',
    address: trip.address || null,
    job_no: trip.jobNo || '',
    hawb_no: trip.hawbNo || null,
    mawb_no: trip.mawbNo || null,
    flt_no: trip.fltNo || null,
    invoice_no: trip.invoiceNo || null,
    dimension: trip.dimension || null,
    qty: trip.qty ?? 0,
    unit: trip.unit || null,
    gw: trip.gw ?? 0,
    volume: trip.volume ?? 0,
    product: trip.product || null,
    porter: trip.porter ?? 0,
    dry_ice: trip.dryIce ?? 0,
    actual_qty: trip.actualQty ?? 0,
    unit1: trip.unit1 || null,
    actual_gw: trip.actualGW ?? 0,
    actual_volume: trip.actualVolume ?? 0,
    pick_up_date: parseDbDate(trip.pickUpDate),
    pick_up_time: trip.pickUpTime || null,
    pick_up_in: trip.pickUpIn || null,
    pick_up_out: trip.pickUpOut || null,
    pick_up_name: trip.pickUpName || '',
    pick_up_address: trip.pickUpAddress || null,
    pick_up_province: trip.pickUpProvince || '',
    pick_up_district: trip.pickUpDistrict || null,
    pick_up_zone: trip.pickUpZone || null,
    pick_up_remark: trip.pickUpRemark || null,
    delivery_date: parseDbDate(trip.deliveryDate),
    delivery_time: trip.deliveryTime || null,
    delivery_in: trip.deliveryIn || null,
    delivery_out: trip.deliveryOut || null,
    delivery_name: trip.deliveryName || '',
    delivery_address: trip.deliveryAddress || null,
    delivery_province: trip.deliveryProvince || '',
    delivery_district: trip.deliveryDistrict || '',
    delivery_zone: trip.deliveryZone || null,
    delivery_remark: trip.deliveryRemark || null,
    cs_name: trip.csName || null,
    business_unit: trip.businessUnit || null,
    order_type: trip.orderType || null,
    sub_contractor: trip.subContractor || null,
    truck_site: trip.truckSite || null,
    truck_no: trip.truckNo || null,
    driver_name: trip.driverName || null,
    truck_type: trip.truckType || '4W',
    truck_charge: trip.truckCharge ?? 0,
    transport_site: trip.transportSite || null,
    trip_start_date: parseDbDate(trip.tripStartDate),
    trip_status: trip.tripStatus || null,
    backhaul: trip.backhaul || null,
    trip_no: trip.tripNo || '',
    receiver: trip.receiver || null,
    trip_detail_status: trip.tripDetailStatus || null,
    transport_remark: trip.transportRemark || null,
    trip_create_date: parseDbDate(trip.tripCreateDate),
    trip_created_by: trip.tripCreatedBy || null,
    haul_type: trip.haulType || null,
    closing_remark: trip.closingRemark || null,
    plan_remark: trip.planRemark || null,
    confirm_order_by: trip.confirmOrderBy || null,
    customer_ref2: trip.customerRef2 || null,
    oms_order_number: trip.omsOrderNumber || null,
    zip_code: trip.zipCode || null,
    confirm_order_date: parseDbDate(trip.confirmOrderDate),
    e_running_no: trip.eRunningNo || null,
    branch: trip.branch || 'นวนคร',
    od_type: trip.odType || 'Company Truck',
    drop_count: trip.dropCount ?? 0,
    waiting_hours: trip.waitingHours ?? 0,
    toll_actual: trip.tollActual ?? 0,
    customer_quoted_rate: trip.customerQuotedRate ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export function mapTripFromDb(row: any): RawTripData {
  return {
    id: row.id,
    issueDate: row.issue_date || '',
    clearanceDate: row.clearance_date || undefined,
    consigneeShipper: row.consignee_shipper || '',
    address: row.address || undefined,
    jobNo: row.job_no || '',
    hawbNo: row.hawb_no || undefined,
    mawbNo: row.mawb_no || undefined,
    fltNo: row.flt_no || undefined,
    invoiceNo: row.invoice_no || undefined,
    dimension: row.dimension || undefined,
    qty: Number(row.qty) || 0,
    unit: row.unit || undefined,
    gw: Number(row.gw) || 0,
    volume: Number(row.volume) || 0,
    product: row.product || undefined,
    porter: Number(row.porter) || 0,
    dryIce: Number(row.dry_ice) || 0,
    actualQty: Number(row.actual_qty) || 0,
    unit1: row.unit1 || undefined,
    actualGW: Number(row.actual_gw) || 0,
    actualVolume: Number(row.actual_volume) || 0,
    pickUpDate: row.pick_up_date || undefined,
    pickUpTime: row.pick_up_time || undefined,
    pickUpIn: row.pick_up_in || undefined,
    pickUpOut: row.pick_up_out || undefined,
    pickUpName: row.pick_up_name || '',
    pickUpAddress: row.pick_up_address || undefined,
    pickUpProvince: row.pick_up_province || '',
    pickUpDistrict: row.pick_up_district || undefined,
    pickUpZone: row.pick_up_zone || undefined,
    pickUpRemark: row.pick_up_remark || undefined,
    deliveryDate: row.delivery_date || undefined,
    deliveryTime: row.delivery_time || undefined,
    deliveryIn: row.delivery_in || undefined,
    deliveryOut: row.delivery_out || undefined,
    deliveryName: row.delivery_name || '',
    deliveryAddress: row.delivery_address || undefined,
    deliveryProvince: row.delivery_province || '',
    deliveryDistrict: row.delivery_district || '',
    deliveryZone: row.delivery_zone || undefined,
    deliveryRemark: row.delivery_remark || undefined,
    csName: row.cs_name || undefined,
    businessUnit: row.business_unit || undefined,
    orderType: row.order_type || undefined,
    subContractor: row.sub_contractor || undefined,
    truckSite: row.truck_site || undefined,
    truckNo: row.truck_no || undefined,
    driverName: row.driver_name || undefined,
    truckType: row.truck_type || '4W',
    truckCharge: Number(row.truck_charge) || 0,
    transportSite: row.transport_site || undefined,
    tripStartDate: row.trip_start_date || undefined,
    tripStatus: row.trip_status || undefined,
    backhaul: row.backhaul || undefined,
    tripNo: row.trip_no || '',
    receiver: row.receiver || undefined,
    tripDetailStatus: row.trip_detail_status || undefined,
    transportRemark: row.transport_remark || undefined,
    tripCreateDate: row.trip_create_date || undefined,
    tripCreatedBy: row.trip_created_by || undefined,
    haulType: row.haul_type || undefined,
    closingRemark: row.closingRemark || undefined,
    planRemark: row.plan_remark || undefined,
    confirmOrderBy: row.confirm_order_by || undefined,
    customerRef2: row.customer_ref2 || undefined,
    omsOrderNumber: row.oms_order_number || undefined,
    zipCode: row.zip_code || undefined,
    confirmOrderDate: row.confirm_order_date || undefined,
    eRunningNo: row.e_running_no || undefined,
    branch: row.branch || 'นวนคร',
    odType: row.od_type || 'Company Truck',
    dropCount: Number(row.drop_count) || 0,
    waitingHours: Number(row.waiting_hours) || 0,
    tollActual: Number(row.toll_actual) || 0,
    customerQuotedRate: Number(row.customer_quoted_rate) || 0,
  };
}

// ====================================================================
// SUPABASE SYNC OPERATIONS
// ====================================================================

/**
 * Fetch all trips from Supabase (batches 1000 items per call)
 */
export async function fetchTripsFromSupabase(): Promise<{ data: RawTripData[]; error: string | null }> {
  try {
    const supabase = getSupabase();
    let allRows: any[] = [];
    let from = 0;
    const step = 1000;
    let keepGoing = true;

    while (keepGoing) {
      const { data, error } = await supabase
        .from('transport_trips')
        .select('*')
        .range(from, from + step - 1);

      if (error) {
        return { data: [], error: error.message };
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        if (data.length < step) {
          keepGoing = false;
        } else {
          from += step;
        }
      } else {
        keepGoing = false;
      }
    }

    const mapped = allRows.map(mapTripFromDb);
    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Failed to fetch trips' };
  }
}

/**
 * Upsert trips to Supabase in chunks of 200
 */
export async function saveTripsToSupabase(trips: RawTripData[]): Promise<{ count: number; error: string | null }> {
  if (!trips || trips.length === 0) {
    return { count: 0, error: null };
  }

  try {
    const supabase = getSupabase();
    const rows = trips.map(mapTripToDb);
    const chunkSize = 200;
    let savedCount = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await (supabase.from('transport_trips') as any)
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        return { count: savedCount, error: error.message };
      }
      savedCount += chunk.length;
    }

    return { count: savedCount, error: null };
  } catch (err: any) {
    return { count: 0, error: err?.message || 'Failed to upsert trips' };
  }
}

/**
 * Clear all trips in Supabase
 */
export async function clearAllTripsInSupabase(): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabase();
    // delete all with non-empty id
    const { error } = await supabase.from('transport_trips').delete().neq('id', '___NEVER_MATCH___');
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to clear trips' };
  }
}

/**
 * Sync Master Data: Diesel Prices
 */
export async function fetchDieselPricesFromSupabase(): Promise<DieselPriceRecord[] | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('transport_diesel_prices').select('*').order('date', { ascending: false });
    if (error || !data) return null;
    return data.map((r: any) => ({
      date: r.date,
      price: Number(r.price),
      source: r.source || 'PTT Station',
      updatedAt: r.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function saveDieselPricesToSupabase(prices: DieselPriceRecord[]): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const rows = prices.map((p) => ({
      date: p.date,
      price: p.price,
      source: p.source || 'PTT Station',
      updated_at: new Date().toISOString(),
    }));
    const { error } = await (supabase.from('transport_diesel_prices') as any).upsert(rows, { onConflict: 'date' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sync Master Data: Rate Cards
 */
export async function fetchRateCardsFromSupabase(): Promise<{ [key in StandardTruckType]: RateCardTable } | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await (supabase.from('transport_rate_cards') as any).select('*');
    if (error || !data || data.length === 0) return null;

    const result: any = {};
    for (const item of (data as any[])) {
      if (item.truck_type) {
        result[item.truck_type] = {
          truckType: item.truck_type as StandardTruckType,
          brackets: item.brackets || [],
          rows: item.rows || [],
        };
      }
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Convert RateCardTable dictionary into flat rows for `rate_cards` table
 */
export function convertRateCardsToFlatList(
  rateCards: Record<string, RateCardTable>,
  defaultBranch = 'NLC'
): {
  branch: string;
  zone: string;
  truckType: string;
  weightMin?: number;
  weightMax?: number;
  price: number;
  rawJson?: Record<string, any>;
}[] {
  const flatRows: any[] = [];
  const truckTypes = Object.keys(rateCards);

  for (const tType of truckTypes) {
    const table = rateCards[tType];
    if (!table || !table.rows) continue;

    for (const r of table.rows) {
      if (!r.location) continue;
      for (const b of table.brackets) {
        const p = r.rates[b.key];
        if (p !== undefined && p > 0) {
          flatRows.push({
            branch: defaultBranch,
            zone: r.location,
            truckType: tType,
            weightMin: b.minDiesel,
            weightMax: b.maxDiesel,
            price: p,
            rawJson: {
              bracket: b.label,
              province: r.province,
              region: r.region,
            },
          });
        }
      }
    }
  }

  return flatRows;
}

export async function saveRateCardsToSupabase(rateCards: Record<string, RateCardTable>): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const truckTypes = Object.keys(rateCards);
    const rows = truckTypes.map((type) => ({
      truck_type: type,
      brackets: rateCards[type]?.brackets || [],
      rows: rateCards[type]?.rows || [],
      updated_at: new Date().toISOString(),
    }));

    // 1. Save matrix tables into transport_rate_cards
    const { error: matrixErr } = await (supabase.from('transport_rate_cards') as any).upsert(rows, { onConflict: 'truck_type' });
    if (matrixErr) {
      console.warn('Could not upsert to transport_rate_cards:', matrixErr.message);
    }

    // 2. Also save normalized flat rows into rate_cards table
    try {
      const flatRows = convertRateCardsToFlatList(rateCards);
      if (flatRows.length > 0) {
        await saveFlatRateCardsToSupabase(flatRows);
      }
    } catch (flatErr) {
      console.warn('Could not sync to rate_cards table:', flatErr);
    }

    return !matrixErr;
  } catch {
    return false;
  }
}

/**
 * High-level one-click helper to upload all Rate Cards to Supabase
 */
export async function uploadAllRateCardsToSupabase(
  rateCards: Record<string, RateCardTable>,
  branch = 'NLC'
): Promise<{
  success: boolean;
  truckTypesCount: number;
  flatRowsCount: number;
  error: string | null;
}> {
  try {
    const supabase = getSupabase();
    const truckTypes = Object.keys(rateCards);
    const rows = truckTypes.map((type) => ({
      truck_type: type,
      brackets: rateCards[type]?.brackets || [],
      rows: rateCards[type]?.rows || [],
      updated_at: new Date().toISOString(),
    }));

    // Save to transport_rate_cards
    const { error: matrixErr } = await (supabase.from('transport_rate_cards') as any)
      .upsert(rows, { onConflict: 'truck_type' });

    // Save to rate_cards
    const flatRows = convertRateCardsToFlatList(rateCards, branch);
    let flatError: string | null = null;
    let savedCount = 0;

    if (flatRows.length > 0) {
      const flatRes = await saveFlatRateCardsToSupabase(flatRows);
      savedCount = flatRes.count;
      flatError = flatRes.error;
    }

    if (matrixErr && flatError) {
      return {
        success: false,
        truckTypesCount: 0,
        flatRowsCount: 0,
        error: `Matrix: ${matrixErr.message} | Flat: ${flatError}`,
      };
    }

    return {
      success: true,
      truckTypesCount: truckTypes.length,
      flatRowsCount: savedCount || flatRows.length,
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      truckTypesCount: 0,
      flatRowsCount: 0,
      error: err?.message || 'Failed to upload rate cards to Supabase',
    };
  }
}

/**
 * Pre-generate clean SQL query script for inserting all Rate Cards into Supabase
 */
export function generateRateCardsSqlScript(
  rateCards: Record<string, RateCardTable>,
  branch = 'NLC'
): string {
  const flatRows = convertRateCardsToFlatList(rateCards, branch);
  const truckTypes = Object.keys(rateCards);

  const valueLines = flatRows
    .map(
      (r) =>
        `('${r.branch.replace(/'/g, "''")}', '${r.zone.replace(/'/g, "''")}', '${r.truckType}', ${r.weightMin ?? 'NULL'}, ${r.weightMax ?? 'NULL'}, ${r.price})`
    )
    .join(',\n    ');

  return `-- ====================================================================
-- SQL SCRIPT: INSERT RATE CARDS INTO SUPABASE DATABASE
-- Total: ${flatRows.length} Flat Records across ${truckTypes.join(', ')}
-- ====================================================================

-- 1. Create table public.rate_cards if not exists
CREATE TABLE IF NOT EXISTS public.rate_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch TEXT NOT NULL DEFAULT 'NLC',
    zone TEXT NOT NULL,
    truck_type TEXT NOT NULL DEFAULT '4W',
    weight_min NUMERIC(10, 2),
    weight_max NUMERIC(10, 2),
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    effective_date DATE,
    expiry_date DATE,
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable RLS & full access policy
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all access on rate_cards" ON public.rate_cards
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Insert/Append all Rate Card Records (${flatRows.length} rows)
INSERT INTO public.rate_cards (branch, zone, truck_type, weight_min, weight_max, price)
VALUES
    ${valueLines};
`;
}


/**
 * Sync Master Data: Zone Mappings
 */
export async function fetchZoneMappingsFromSupabase(): Promise<ZoneMappingRule[] | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await (supabase.from('transport_zone_mappings') as any).select('*');
    if (error || !data || data.length === 0) return null;
    return (data as any[]).map((z: any) => ({
      id: z.id,
      rawZoneKeyword: z.raw_zone_keyword,
      provinceKeyword: z.provinceKeyword || undefined,
      districtKeyword: z.districtKeyword || undefined,
      matchedLocation: z.matched_location,
    }));
  } catch {
    return null;
  }
}

export async function saveZoneMappingsToSupabase(zones: ZoneMappingRule[]): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const rows = zones.map((z) => ({
      id: z.id,
      raw_zone_keyword: z.rawZoneKeyword,
      province_keyword: z.provinceKeyword || null,
      district_keyword: z.districtKeyword || null,
      matched_location: z.matchedLocation,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await (supabase.from('transport_zone_mappings') as any).upsert(rows, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sync Master Data: Quotations
 */
export async function fetchQuotationsFromSupabase(): Promise<QuotationSchema[] | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await (supabase.from('transport_quotations') as any).select('*');
    if (error || !data || data.length === 0) return null;
    return (data as any[]).map((q: any) => ({
      id: q.id,
      companyName: q.company_name,
      branch: q.branch,
      effectiveDate: q.effective_date,
      expiryDate: q.expiry_date,
      truckTypes: q.truck_types || {},
      specialConditions: q.special_conditions || [],
      additionalFees: q.additional_fees || {},
      odRates: q.od_rates || {},
      notes: q.notes || '',
      fileName: q.file_name || undefined,
      uploadedAt: q.uploaded_at,
    }));
  } catch {
    return null;
  }
}

export async function saveQuotationsToSupabase(quotations: QuotationSchema[]): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const rows = quotations.map((q) => ({
      id: q.id,
      company_name: q.companyName,
      branch: q.branch,
      effective_date: q.effectiveDate || null,
      expiry_date: q.expiryDate || null,
      truck_types: q.truckTypes || {},
      special_conditions: q.specialConditions || [],
      additional_fees: q.additionalFees || {},
      od_rates: q.odRates || {},
      notes: q.notes || '',
      file_name: q.fileName || null,
      uploaded_at: q.uploadedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await (supabase.from('transport_quotations') as any).upsert(rows, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sync Master Data: Fixed Customers
 */
export async function fetchFixedCustomersFromSupabase(): Promise<FixedDieselCustomer[] | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await (supabase.from('transport_fixed_customers') as any).select('*');
    if (error || !data || data.length === 0) return null;
    return (data as any[]).map((c: any) => ({
      id: c.id,
      customerName: c.customer_name,
      fixedDieselRate: Number(c.fixed_diesel_rate),
      notes: c.notes || undefined,
      active: c.active !== false,
    }));
  } catch {
    return null;
  }
}

export async function saveFixedCustomersToSupabase(customers: FixedDieselCustomer[]): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const rows = customers.map((c) => ({
      id: c.id,
      customer_name: c.customerName,
      fixed_diesel_rate: c.fixedDieselRate,
      notes: c.notes || '',
      active: c.active,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await (supabase.from('transport_fixed_customers') as any).upsert(rows, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Full Sync Push: Pushes all local state into Supabase
 */
export async function fullSyncPushToSupabase(params: {
  trips: RawTripData[];
  dieselPrices: DieselPriceRecord[];
  rateCards: { [key in StandardTruckType]: RateCardTable };
  zoneMappings: ZoneMappingRule[];
  quotations: QuotationSchema[];
  fixedCustomers: FixedDieselCustomer[];
}): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  const tripsResult = await saveTripsToSupabase(params.trips);
  if (tripsResult.error) errors.push(`Trips: ${tripsResult.error}`);

  const dieselOk = await saveDieselPricesToSupabase(params.dieselPrices);
  if (!dieselOk) errors.push('Diesel prices failed to sync');

  const rateCardsOk = await saveRateCardsToSupabase(params.rateCards);
  if (!rateCardsOk) errors.push('Rate cards failed to sync');

  const zoneOk = await saveZoneMappingsToSupabase(params.zoneMappings);
  if (!zoneOk) errors.push('Zone mappings failed to sync');

  const quoteOk = await saveQuotationsToSupabase(params.quotations);
  if (!quoteOk) errors.push('Quotations failed to sync');

  const fixedOk = await saveFixedCustomersToSupabase(params.fixedCustomers);
  if (!fixedOk) errors.push('Fixed customers failed to sync');

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Full Sync Pull: Pulls all cloud data from Supabase
 */
export async function fullSyncPullFromSupabase(): Promise<{
  trips: RawTripData[] | null;
  dieselPrices: DieselPriceRecord[] | null;
  rateCards: { [key in StandardTruckType]: RateCardTable } | null;
  zoneMappings: ZoneMappingRule[] | null;
  quotations: QuotationSchema[] | null;
  fixedCustomers: FixedDieselCustomer[] | null;
}> {
  const [tripsRes, diesel, rateCards, zoneMappings, quotations, fixedCustomers] = await Promise.all([
    fetchTripsFromSupabase(),
    fetchDieselPricesFromSupabase(),
    fetchRateCardsFromSupabase(),
    fetchZoneMappingsFromSupabase(),
    fetchQuotationsFromSupabase(),
    fetchFixedCustomersFromSupabase(),
  ]);

  return {
    trips: tripsRes.error ? null : tripsRes.data,
    dieselPrices: diesel,
    rateCards: rateCards,
    zoneMappings: zoneMappings,
    quotations: quotations,
    fixedCustomers: fixedCustomers,
  };
}

// ====================================================================
// DIRECT IMPORT & SYNC TO COMPATIBILITY TABLES (rate_cards, fuel_prices, raw_data)
// ====================================================================

/**
 * Save flat rate card rows directly into `rate_cards` table
 */
export async function saveFlatRateCardsToSupabase(
  rows: {
    branch: string;
    zone: string;
    truckType: string;
    weightMin?: number;
    weightMax?: number;
    price: number;
    effectiveDate?: string;
    expiryDate?: string;
    rawJson?: Record<string, any>;
  }[]
): Promise<{ count: number; error: string | null }> {
  if (!rows || rows.length === 0) return { count: 0, error: null };

  try {
    const supabase = getSupabase();
    const dbRows = rows.map((r) => ({
      branch: r.branch || 'NLC',
      zone: r.zone,
      truck_type: r.truckType || '4W',
      weight_min: r.weightMin !== undefined ? r.weightMin : null,
      weight_max: r.weightMax !== undefined ? r.weightMax : null,
      price: r.price,
      effective_date: r.effectiveDate || null,
      expiry_date: r.expiryDate || null,
      raw_json: r.rawJson || {},
      updated_at: new Date().toISOString(),
    }));

    const chunkSize = 200;
    let savedCount = 0;
    for (let i = 0; i < dbRows.length; i += chunkSize) {
      const chunk = dbRows.slice(i, i + chunkSize);
      const { error } = await (supabase.from('rate_cards') as any).insert(chunk);
      if (error) {
        // Fallback to updating transport_rate_cards if table doesn't exist yet
        console.warn('Could not insert to rate_cards:', error.message);
        return { count: savedCount, error: error.message };
      }
      savedCount += chunk.length;
    }

    return { count: savedCount, error: null };
  } catch (err: any) {
    return { count: 0, error: err?.message || 'Failed to save rate cards' };
  }
}

/**
 * Save fuel prices directly into `fuel_prices` table
 */
export async function saveFuelPricesToSupabase(
  prices: {
    date: string;
    price: number;
    source?: string;
    isFixed?: boolean;
    company?: string;
  }[]
): Promise<{ count: number; error: string | null }> {
  if (!prices || prices.length === 0) return { count: 0, error: null };

  try {
    const supabase = getSupabase();
    const dbRows = prices.map((p) => {
      const isoDate = parseDbDate(p.date) || p.date;

      return {
        date: isoDate,
        price: p.price,
        source: p.source || 'PTT',
        is_fixed: Boolean(p.isFixed),
        company: p.company || null,
      };
    });

    const chunkSize = 200;
    let savedCount = 0;
    for (let i = 0; i < dbRows.length; i += chunkSize) {
      const chunk = dbRows.slice(i, i + chunkSize);
      const { error } = await (supabase.from('fuel_prices') as any).upsert(chunk, { onConflict: 'date' });
      if (error) {
        return { count: savedCount, error: error.message };
      }
      savedCount += chunk.length;
    }

    return { count: savedCount, error: null };
  } catch (err: any) {
    return { count: 0, error: err?.message || 'Failed to save fuel prices' };
  }
}

/**
 * Save raw trip records into `raw_data` table
 */
export async function saveRawDataRecordsToSupabase(
  trips: RawTripData[],
  branchOverride?: string
): Promise<{ count: number; error: string | null }> {
  if (!trips || trips.length === 0) return { count: 0, error: null };

  try {
    const supabase = getSupabase();
    const dbRows = trips.map((t) => {
      const isoDate = parseDbDate(t.issueDate);

      return {
        issue_date: isoDate || null,
        job_no: t.jobNo || null,
        trip_no: t.tripNo || null,
        consignee_shipper: t.consigneeShipper || null,
        pick_up_name: t.pickUpName || null,
        pick_up_province: t.pickUpProvince || null,
        delivery_name: t.deliveryName || null,
        delivery_province: t.deliveryProvince || null,
        delivery_district: t.deliveryDistrict || null,
        zone_match: t.deliveryZone || null,
        truck_type_raw: t.truckType || null,
        truck_type_std: t.truckType?.includes('10') ? '10W' : t.truckType?.includes('6') ? '6W' : '4W',
        backhaul: t.backhaul || null,
        haul_type: t.haulType || null,
        trip_status: t.tripStatus || null,
        driver_name: t.driverName || null,
        truck_no: t.truckNo || null,
        branch: branchOverride || (t.branch === 'บางบ่อ' ? 'BLC' : 'NLC'),
        raw_json: t,
      };
    });

    const chunkSize = 200;
    let savedCount = 0;
    for (let i = 0; i < dbRows.length; i += chunkSize) {
      const chunk = dbRows.slice(i, i + chunkSize);
      const { error } = await (supabase.from('raw_data') as any).insert(chunk);
      if (error) {
        return { count: savedCount, error: error.message };
      }
      savedCount += chunk.length;
    }

    return { count: savedCount, error: null };
  } catch (err: any) {
    return { count: 0, error: err?.message || 'Failed to save raw data records' };
  }
}

