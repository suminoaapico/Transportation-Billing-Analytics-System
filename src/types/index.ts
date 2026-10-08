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
}

export type StandardTruckType = '4W' | '6W' | '10W';

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

export interface CalculatedBillingTrip {
  id: string;
  raw: RawTripData;
  issueDate: string;
  jobNo: string;
  tripNo: string;
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
  standardTripRate: number;
  porterOther: number;
  consoleNotInGTT: number;
  cancelledTripsInGTT: number;
  missingPriceTrips: number;
  dieselRate: number | null;
  reviewStatus: ReviewStatus;
  notes?: string;
}

export interface TruckSummary {
  truckType: StandardTruckType | 'รวมทั้งหมด';
  count: number;
  totalAmount: number;
}

export interface BillingReportSummary {
  summaries: TruckSummary[];
  grandTotalCount: number;
  grandTotalAmount: number;
}
