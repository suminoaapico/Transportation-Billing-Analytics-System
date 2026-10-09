export interface RawTripData {
  id: string;
  issueDate: string;
  clearanceDate?: string;
  consigneeShipper: string;
  address?: string;
  jobNo: string;
  hawbNo?: string;
  mawbNo?: string;
  fltNo?: string;
  invoiceNo?: string;
  dimension?: string;
  qty?: number;
  unit?: string;
  gw?: number;
  volume?: number;
  product?: string;
  porter?: number;
  dryIce?: number;
  actualQty?: number;
  unit1?: string;
  actualGW?: number;
  actualVolume?: number;
  pickUpDate?: string;
  pickUpTime?: string;
  pickUpIn?: string;
  pickUpOut?: string;
  pickUpName: string;
  pickUpAddress?: string;
  pickUpProvince: string;
  pickUpDistrict?: string;
  pickUpZone?: string;
  pickUpRemark?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryIn?: string;
  deliveryOut?: string;
  deliveryName: string;
  deliveryAddress?: string;
  deliveryProvince: string;
  deliveryDistrict: string;
  deliveryZone?: string;
  deliveryRemark?: string;
  csName?: string;
  businessUnit?: string;
  orderType?: string;
  subContractor?: string;
  truckSite?: string;
  truckNo?: string;
  driverName?: string;
  truckType: string;
  truckCharge?: number;
  transportSite?: string;
  tripStartDate?: string;
  tripStatus?: string;
  backhaul?: string;
  tripNo: string;
  receiver?: string;
  tripDetailStatus?: string;
  transportRemark?: string;
  tripCreateDate?: string;
  tripCreatedBy?: string;
  haulType?: string;
  closingRemark?: string;
  planRemark?: string;
  confirmOrderBy?: string;
  customerRef2?: string;
  omsOrderNumber?: string;
  zipCode?: string;
  confirmOrderDate?: string;
  eRunningNo?: string;
  branch?: string; // สาขา เช่น 'นวนคร' | 'บางบ่อ'
  odType?: string; // ประเภทรถซับ เช่น 'Company Truck' | 'OD 4' | 'OD 6' | 'OD 10'
  dropCount?: number;
  waitingHours?: number;
  tollActual?: number;
  customerQuotedRate?: number;
}

export type StandardTruckType = '4W' | '6W' | '10W' | 'OD4' | 'OD6';

export type BranchType = 'นวนคร' | 'บางบ่อ' | 'ทั้งหมด';

export type ODType = 'Company Truck' | 'OD 4' | 'OD 6' | 'OD 10';

export interface FixedDieselCustomer {
  id: string;
  customerName: string; // e.g. "SIEMENS", "SIEMENS LIMITED"
  fixedDieselRate: number; // e.g. 38.00 THB/L
  notes?: string;
  active: boolean;
}

export interface QuotationTruckRate {
  baseRate: number;
  fuelSurcharge: number;
  dropFee: number;
  waitingFee: number;
  tollFee?: number;
}

export interface QuotationSchema {
  id: string;
  companyName: string;
  branch: 'นวนคร' | 'บางบ่อ' | string;
  effectiveDate: string;
  expiryDate: string;
  truckTypes: {
    '4W'?: QuotationTruckRate;
    '6W'?: QuotationTruckRate;
    '10W'?: QuotationTruckRate;
    [truckKey: string]: QuotationTruckRate | undefined;
  };
  specialConditions: string[]; // e.g. "ไม่ผันแปรเรทน้ำมัน (Fixed Diesel)", "คิดค่าดรอปแยก"
  additionalFees: {
    porter: number;
    dryIce: number;
    seal: number;
    toll: number;
    waitingFeePerHour: number;
    dropFeePerPoint: number;
    consoleFee: number;
    otFee: number;
    penalty: number;
  };
  odRates: {
    OD4?: { baseRate: number; fuelRate: number };
    OD6?: { baseRate: number; fuelRate: number };
    OD10?: { baseRate: number; fuelRate: number };
    [key: string]: { baseRate: number; fuelRate: number } | undefined;
  };
  notes: string;
  uploadedAt?: string;
  fileName?: string;
}

export interface RateCardBracket {
  label: string; // e.g. "< 30.00", "30.01 - 32.00", ...
  minDiesel: number;
  maxDiesel: number;
  rate: number;
}

export interface RateCardRow {
  id: string;
  location: string; // e.g. "Si Maha Phot, Prachinburi"
  province: string;
  region: string;
  rates: { [bracketKey: string]: number };
}

export interface RateCardTable {
  truckType: StandardTruckType;
  brackets: { key: string; label: string; minDiesel: number; maxDiesel: number }[];
  rows: RateCardRow[];
}

export interface DieselPriceRecord {
  date: string; // DD/MM/YYYY or YYYY-MM-DD
  price: number; // THB / Litre
  updatedAt?: string;
  source?: string;
}

export interface ZoneMappingRule {
  id: string;
  rawZoneKeyword: string; // e.g. "ศรีมหาโพธิ", "พระพุทธบาท", "สามพราน"
  provinceKeyword?: string;
  districtKeyword?: string;
  matchedLocation: string; // e.g. "Si Maha Phot, Prachinburi"
}

export type ReviewStatus = 'มีราคา' | 'ตรวจโซนปลายทาง' | 'ไม่มีราคาน้ำมัน';

export type DiffStatus = 'Match' | 'MinorDiff' | 'MajorDiff';

export interface CalculatedBillingTrip {
  id: string;
  raw: RawTripData;
  issueDate: string;
  jobNo: string;
  tripNo: string;
  branch: string; // 'นวนคร' | 'บางบ่อ'
  odType: string; // 'Company Truck' | 'OD 4' | 'OD 6' | 'OD 10'
  isSubContractor: boolean;
  consigneeShipper: string;
  pickUpName: string;
  pickUpProvince: string;
  deliveryName: string;
  deliveryDistrict: string;
  deliveryProvince: string;
  zoneLocationMatch: string;
  truckTypeRaw: string;
  standardTruckType: StandardTruckType;
  backhaul: string;
  haulType: string;

  // Pricing components
  baseTripRate: number; // Base rate from quotation / rate card
  fuelSurcharge: number; // Fuel surcharge component
  dropFee: number; // ค่าดรอปสินค้า
  waitingFee: number; // ค่ารอโหลด
  tollFee: number; // ค่าทางด่วน / มอเตอร์เวย์
  porterFee: number; // ค่า Porter ขนถ่าย
  otherFees: number; // Seal, Dry Ice, Console, OT, Penalty
  otherFeesBreakdown?: {
    dryIce?: number;
    seal?: number;
    console?: number;
    ot?: number;
    penalty?: number;
  };

  standardTripRate: number; // Legacy total base rate
  totalAmount: number; // Grand total = base + fuel + drop + waiting + toll + porter + other
  customerQuotedPrice: number; // Price provided by customer / quotation
  diffAmount: number; // totalAmount - customerQuotedPrice
  diffPercent: number; // percentage diff
  diffStatus: DiffStatus; // Match (0%), MinorDiff (< 5%), MajorDiff (>= 5%)
  diffReason: string; // Reason for variance e.g. "ไม่มีราคาน้ำมัน", "ไม่ match zone", "ค่าใช้จ่ายอื่นไม่ครบ"

  porterOther: number;
  consoleNotInGTT: number;
  cancelledTripsInGTT: number;
  missingPriceTrips: number;
  dieselRate: number | null;
  dieselMethod: 'monthly_avg' | 'fixed_contract' | 'daily_spot';
  reviewStatus: ReviewStatus;
  notes?: string;
}

export interface TruckSummary {
  truckType: StandardTruckType | 'รวมทั้งหมด';
  count: number;
  baseRateAmount: number;
  fuelSurchargeAmount: number;
  otherFeesAmount: number;
  totalAmount: number;
}

export interface BranchSummary {
  branch: string;
  count: number;
  totalAmount: number;
  avgPerTrip: number;
}

export interface ODSummary {
  odType: string;
  isSubContractor: boolean;
  count: number;
  totalAmount: number;
}

export interface DiffReconciliationSummary {
  matchCount: number;
  matchAmount: number;
  minorDiffCount: number;
  minorDiffAmount: number;
  majorDiffCount: number;
  majorDiffAmount: number;
  netDiffAmount: number;
}

export interface BillingReportSummary {
  summaries: TruckSummary[];
  grandTotalCount: number;
  grandTotalAmount: number;
  grandTotalBaseRate: number;
  grandTotalFuelSurcharge: number;
  grandTotalOtherFees: number;
  subContractorCount: number;
  subContractorAmount: number;
  companyTruckCount: number;
  companyTruckAmount: number;
  branchSummaries: BranchSummary[];
  odSummaries: ODSummary[];
  diffSummary: DiffReconciliationSummary;
}

// -------------------------------------------------------------
// Prompt 1 & Prompt 2: Price Comparison, Completeness & Master Data
// -------------------------------------------------------------

export interface TruckTypeMappingRule {
  id: string;
  rawTruckType: string; // e.g. '4W/Single Unit', '6W/Extra Box', '4W/Trailer', 'OD4'
  standardType: '4W' | '6W' | '10W' | 'OD4' | 'OD6' | 'OD10';
  rateKey: string; // e.g. 'Rate 4W', 'Rate 6W', 'Rate OD4'
  branch: 'นวนคร' | 'บางบ่อ' | 'ทั้งหมด';
  active: boolean;
  notes?: string;
}

export interface FeeMasterItem {
  id: string;
  code: string; // F01, F02, ... F12
  name: string; // Base Rate, Fuel Surcharge, Drop Fee, Waiting Fee, Toll Fee, etc.
  category: 'หลัก' | 'ผันแปร' | 'เพิ่ม' | 'ตามจริง' | 'หัก';
  calculationMethod: string; // 'ตามเรท', 'Avg เดือน', 'ต่อครั้ง', 'ชม.ละ', 'ตามบิล', '50%'
  minAmount?: number;
  rateAmount: number;
  branch: 'นวนคร' | 'บางบ่อ' | 'ทั้งหมด';
  applicableCompanies: string; // 'ทั้งหมด' or 'AJITRADE', 'SIEMENS', 'ROLAND'
  active: boolean;
  notes?: string;
}

export interface ConditionRule {
  id: string;
  code: string; // C01 ... C10
  conditionName: string;
  value: string;
  applicableTo: string; // 'ทั้งหมด', 'Siemens', 'Roland', etc.
  branch: 'นวนคร' | 'บางบ่อ' | 'ทั้งหมด';
  notes: string;
  active: boolean;
  updatedAt?: string;
}

export interface PriceComparisonRow {
  id: string;
  issueDate: string;
  jobNo: string;
  tripNo: string;
  companyName: string;
  branch: 'นวนคร' | 'บางบ่อ';
  truckType: string;
  calculatedRate: number; // ราคาระบบ
  branchSentRate: number; // ยอดสาขา
  diffAmount: number; // ส่วนต่าง (บาท) = calculatedRate - branchSentRate
  diffPercent: number; // ส่วนต่าง (%)
  diffStatus: DiffStatus; // Match, MinorDiff, MajorDiff
  primaryReason: string;
  diffReasons: string[];
  tripStatus: string; // FinishTrip, TripPlan, Cancelled
  haulType?: string;
  backhaul?: string;
  isVerifiedQuoted?: boolean; // true for Roland at Bang Bo!
  deliveryZone?: string;
  rawTrip?: RawTripData;
}

export interface TripCompletenessSummary {
  totalExpectedTrips: number;
  totalActualTrips: number;
  missingTripsCount: number;
  missingTripNos: string[];
  finishTripsCount: number;
  tripPlanCount: number;
  cancelledTripsCount: number;
  backhaulCount: number;
  missingPriceCount: number;
  missingFuelCount: number;
  isAllComplete: boolean;
}
