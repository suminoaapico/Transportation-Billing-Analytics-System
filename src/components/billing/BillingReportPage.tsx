import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Cloud,
  Search,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Truck,
  ChevronLeft,
  ChevronRight,
  Zap,
  HelpCircle,
  Edit2,
  Save,
  SlidersHorizontal,
  Plus,
  Trash2,
  Sparkles,
  X,
  Scale,
} from 'lucide-react';
import {
  CalculatedBillingTrip,
  BillingReportSummary,
  StandardTruckType,
  TruckSummary,
  RawTripData,
  DiffStatus,
} from '../../types';
import { exportBillingReportExcel, downloadRawData69TemplateExcel } from '../../services/excelService';
import { computeBillingSummary } from '../../services/billingCalculator';

interface BillingReportPageProps {
  trips: CalculatedBillingTrip[];
  summary: BillingReportSummary;
  onOpenGoogleDriveModal: () => void;
  isDriveConnected: boolean;
  onGoogleSignIn: () => void;
  selectedBracket: string;
  onSelectBracket: (key: string) => void;
  onAutoResolveAll: () => void;
  onUpdateTripRate: (tripId: string, newRate: number) => void;
  onAddNewTrip?: (trip: RawTripData) => void;
  onDeleteTrip?: (tripId: string) => void;
  onSimulateFullMonthTrips?: () => void;
  onResetToSeedData?: () => void;
  onOpenQuotationUpload?: () => void;
  dieselMethod?: 'monthly_avg' | 'daily_spot';
  onSelectDieselMethod?: (method: 'monthly_avg' | 'daily_spot') => void;
  onClearTrips?: () => void;
  onNavigateToReconciliation?: () => void;
  onMapAllShippingQuotations100?: () => void;
  onLoad20StandardTrips?: () => void;
}

export const BillingReportPage: React.FC<BillingReportPageProps> = ({
  trips,
  summary,
  onOpenGoogleDriveModal,
  isDriveConnected,
  onGoogleSignIn,
  selectedBracket,
  onSelectBracket,
  onAutoResolveAll,
  onUpdateTripRate,
  onAddNewTrip,
  onDeleteTrip,
  onSimulateFullMonthTrips,
  onResetToSeedData,
  onOpenQuotationUpload,
  dieselMethod = 'monthly_avg',
  onSelectDieselMethod,
  onClearTrips,
  onNavigateToReconciliation,
  onMapAllShippingQuotations100,
  onLoad20StandardTrips,
}) => {
  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterTruckType, setFilterTruckType] = useState<string>('ALL');
  const [filterODType, setFilterODType] = useState('ALL');
  const [filterDiff, setFilterDiff] = useState<'ALL' | 'Match' | 'MinorDiff' | 'MajorDiff'>('ALL');
  const [filterZone, setFilterZone] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Inline Rate Editing
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState<string>('');

  // Add Trip Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newJobNo, setNewJobNo] = useState('');
  const [newTripNo, setNewTripNo] = useState('');
  const [newIssueDate, setNewIssueDate] = useState(() => {
    const today = new Date();
    return `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  });
  const [newCompany, setNewCompany] = useState('AJITRADE (THAILAND) CO.,LTD.');
  const [newDelivName, setNewDelivName] = useState('');
  const [newDelivDistrict, setNewDelivDistrict] = useState('ศรีมหาโพธิ');
  const [newDelivProvince, setNewDelivProvince] = useState('ปราจีนบุรี');
  const [newTruckType, setNewTruckType] = useState('4W/Single Unit');
  const [newStandardRate, setNewStandardRate] = useState('3280');

  const handleSaveNewTrip = () => {
    if (!newJobNo.trim()) return;
    const rateVal = parseFloat(newStandardRate) || 0;
    const newTripRaw: RawTripData = {
      id: `trip-manual-${Date.now()}`,
      issueDate: newIssueDate,
      jobNo: newJobNo.trim(),
      tripNo: newTripNo.trim() || `TRP-MANUAL-${Date.now().toString().slice(-5)}`,
      consigneeShipper: newCompany.trim(),
      pickUpName: 'YUSEN LOGISTICS (THAILAND) CO.,LTD (NLC)',
      pickUpDistrict: 'คลองหลวง',
      pickUpProvince: 'ปทุมธานี',
      deliveryName: newDelivName.trim() || 'สถานที่จัดส่ง',
      deliveryDistrict: newDelivDistrict.trim(),
      deliveryProvince: newDelivProvince.trim(),
      deliveryZone: newDelivDistrict.trim(),
      truckType: newTruckType,
      tripStatus: 'FinishTrip',
      haulType: 'Direct',
      backhaul: 'No',
    };

    if (onAddNewTrip) {
      onAddNewTrip(newTripRaw);
    }
    if (rateVal > 0) {
      onUpdateTripRate(newTripRaw.id, rateVal);
    }

    setIsAddModalOpen(false);
    setNewJobNo('');
    setNewTripNo('');
    setNewDelivName('');
  };

  // Pagination (Supports viewing all items across all branches without pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [summaryViewTab, setSummaryViewTab] = useState<'both' | 'truck' | 'zone'>('both');

  // Options
  const companyOptions = useMemo(() => {
    return ['ALL', ...new Set(trips.map((t) => t.consigneeShipper).filter(Boolean))];
  }, [trips]);

  const zoneOptions = useMemo(() => {
    return ['ALL', ...new Set(trips.map((t) => t.zoneLocationMatch).filter(Boolean))];
  }, [trips]);

  // Diagnostics & Missing analysis
  const pricedTrips = trips.filter((t) => t.standardTripRate > 0);
  const zeroRateTrips = trips.filter((t) => t.standardTripRate === 0);
  const unmappedZoneTrips = trips.filter((t) => t.reviewStatus === 'ตรวจโซนปลายทาง');
  const estimatedMissingAmount = zeroRateTrips.reduce((sum, t) => {
    const baseline = t.standardTruckType === '4W' ? 2200 : t.standardTruckType === '6W' ? 3500 : 5500;
    return sum + baseline;
  }, 0);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // Company
      if (filterCompany !== 'ALL' && t.consigneeShipper !== filterCompany) return false;

      // Branch
      if (filterBranch !== 'ALL' && t.branch !== filterBranch) return false;

      // Truck Type
      if (filterTruckType !== 'ALL' && t.standardTruckType !== filterTruckType) return false;

      // OD Type
      if (filterODType !== 'ALL') {
        if (filterODType === 'Company Truck' && t.isSubContractor) return false;
        if (filterODType !== 'Company Truck' && t.odType !== filterODType) return false;
      }

      // Diff Status
      if (filterDiff !== 'ALL' && t.diffStatus !== filterDiff) return false;

      // Zone
      if (filterZone !== 'ALL' && t.zoneLocationMatch !== filterZone) return false;

      // Status
      if (filterStatus !== 'ALL' && t.reviewStatus !== filterStatus) return false;

      // Keyword
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const text = `${t.jobNo} ${t.tripNo} ${t.consigneeShipper} ${t.deliveryName} ${t.pickUpName} ${t.truckTypeRaw} ${t.branch} ${t.odType}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [trips, filterCompany, filterBranch, filterTruckType, filterODType, filterDiff, filterZone, filterStatus, searchKeyword]);

  // Computed summary for filtered set using official multi-metric calculation
  const filteredSummary: BillingReportSummary = useMemo(() => {
    return computeBillingSummary(filteredTrips);
  }, [filteredTrips]);

  // Calculation by Delivery Zone ("คำนวน แต่ละโซน และรถแต่ละประเภทด้วย")
  const zoneSummaries = useMemo(() => {
    const map = new Map<string, {
      zone: string;
      province: string;
      count4W: number;
      count6W: number;
      count10W: number;
      totalCount: number;
      baseAmount: number;
      fuelAmount: number;
      otherAmount: number;
      totalAmount: number;
    }>();

    filteredTrips.forEach((t) => {
      const zoneKey = t.zoneLocationMatch || t.deliveryDistrict || 'ไม่ระบุ';
      const existing = map.get(zoneKey) || {
        zone: zoneKey,
        province: t.deliveryProvince || '-',
        count4W: 0,
        count6W: 0,
        count10W: 0,
        totalCount: 0,
        baseAmount: 0,
        fuelAmount: 0,
        otherAmount: 0,
        totalAmount: 0,
      };

      if (t.standardTruckType === '4W') existing.count4W++;
      else if (t.standardTruckType === '6W') existing.count6W++;
      else if (t.standardTruckType === '10W') existing.count10W++;

      existing.totalCount++;
      existing.baseAmount += t.baseTripRate || 0;
      existing.fuelAmount += t.fuelSurcharge || 0;
      existing.otherAmount += (t.dropFee + t.waitingFee + t.tollFee + t.porterFee + t.otherFees) || 0;
      existing.totalAmount += t.totalAmount || 0;

      map.set(zoneKey, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredTrips]);

  const handleResetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCompany('ALL');
    setFilterBranch('ALL');
    setFilterTruckType('ALL');
    setFilterODType('ALL');
    setFilterDiff('ALL');
    setFilterZone('ALL');
    setFilterStatus('ALL');
    setSearchKeyword('');
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    exportBillingReportExcel(filteredSummary, filteredTrips, `Billing_Report_${Date.now()}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveInlineRate = (tripId: string) => {
    const val = parseFloat(editRateValue);
    if (!isNaN(val) && val >= 0) {
      onUpdateTripRate(tripId, val);
    }
    setEditingTripId(null);
  };

  // Pagination calculation
  const isShowAll = pageSize >= 999999;
  const totalPages = isShowAll ? 1 : Math.ceil(filteredTrips.length / pageSize) || 1;
  const paginatedTrips = isShowAll ? filteredTrips : filteredTrips.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              OFFICIAL BILLING
            </span>
            <span className="text-xs text-slate-400">GTT Logistics & Transportation</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white uppercase tracking-tight">
            AUTOMATED TRANSPORTATION BILLING REPORT
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            รายงานคำนวณและสรุปยอดบิลค่าขนส่งอัตโนมัติประจำงวด
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Navigate to Diff Check */}
          {onNavigateToReconciliation && (
            <button
              onClick={onNavigateToReconciliation}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="ไปยังหน้าจอ Diff Check (เทียบราคาสาขา & ตรวจสอบทริป)"
            >
              <Scale className="w-4 h-4 text-emerald-200" />
              <span>Diff Check (เทียบราคาสาขา)</span>
            </button>
          )}

          {/* Download 69-Col Template */}
          <button
            onClick={() => downloadRawData69TemplateExcel()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            title="ดาวน์โหลดแม่แบบ Excel สำหรับกรอกข้อมูล 69 คอลัมน์ (AW=Truck Type)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Template 69 คอลัมน์</span>
          </button>

          {/* Clear all trips to 0 */}
          {onClearTrips && (
            <button
              onClick={onClearTrips}
              className="px-3 py-2 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title="ล้างข้อมูลดิบ / เที่ยวรถทั้งหมดให้เป็น 0 รายการ (เคลียร์ LocalStorage)"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>ล้างข้อมูลดิบ (เป็น 0)</span>
            </button>
          )}

          {/* Upload Quotation AI OCR Button */}
          {onOpenQuotationUpload && (
            <button
              onClick={onOpenQuotationUpload}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              title="อัปโหลดใบเสนอราคา (PDF / Excel / รูปภาพ) และสกัดข้อมูลด้วย AI OCR"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>ใบเสนอราคา (AI OCR)</span>
            </button>
          )}

          {/* Add New Trip Button */}
          {onAddNewTrip && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title="เพิ่มเที่ยวรถใหม่เข้าสู่ระบบ"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเที่ยวรถ</span>
            </button>
          )}

          {/* Simulate Full Month Button */}
          {onSimulateFullMonthTrips && (
            <button
              onClick={onSimulateFullMonthTrips}
              className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              title="โหลดชุดข้อมูลจำลองปิดรอบเดือน 9 เพื่อดูยอดจริง บางบ่อ ฿3.78M / นวนคร ฿507k"
            >
              <Sparkles className="w-4 h-4" />
              <span>จำลองปิดรอบเดือน 9 (บางบ่อ 3.78M / นวนคร 507k)</span>
            </button>
          )}

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            title="ดาวน์โหลดไฟล์ Excel (.xlsx) ผ่าน SheetJS"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {/* Export / Print PDF */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            title="พิมพ์หน้ารายงาน หรือบันทึกเป็น PDF"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ / PDF</span>
          </button>

          {/* Save to Google Drive */}
          {isDriveConnected ? (
            <button
              onClick={onOpenGoogleDriveModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
              title="บันทึกไฟล์รายงานขึ้น Google Drive"
            >
              <Cloud className="w-4 h-4" />
              <span>บันทึกลง Google Drive</span>
            </button>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
              title="เข้าสู่ระบบ Google เพื่อเปิดใช้บันทึก Drive"
            >
              <Cloud className="w-4 h-4 text-blue-500" />
              <span>เชื่อมต่อ Google Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* DIAGNOSTIC & AUDIT BANNER: Answers why the amount might be lower */}
      {zeroRateTrips.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-xl shadow-xs text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-lg text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-100 text-sm flex items-center gap-2">
                  <span>ตรวจพบเที่ยวที่ยังไม่มีราคา (เรท 0 บาท) จำนวน {zeroRateTrips.length} เที่ยว</span>
                  <span className="text-[11px] font-normal text-amber-700 dark:text-amber-300">
                    (เป็นสาเหตุที่ทำให้ยอดรวมได้น้อยลง)
                  </span>
                </h4>
                <p className="text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                  มีเที่ยวขนส่ง {zeroRateTrips.length} รายการที่ติดสถานะ <strong>"ตรวจโซนปลายทาง"</strong> หรือยังไม่มีชื่อปลายทางใน Rate Card ทำให้คิดเป็น 0 บาท
                  หากคำนวณราคาครบถ้วน ยอดค่าขนส่งจะเพิ่มขึ้นอีกประมาณ{' '}
                  <span className="font-bold underline text-blue-700 dark:text-blue-300">
                    +฿{estimatedMissingAmount.toLocaleString('th-TH')} บาท
                  </span>
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={onAutoResolveAll}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 text-xs transition-colors"
                title="ระบบจะวิเคราะห์อำเภอ/จังหวัดของเที่ยวที่ราคาเป็น 0 และจับคู่ราคา Rate Card ที่เหมาะสมที่สุดให้ทันที"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>⚡ จับคู่โซนและเติมราคาอัตโนมัติ</span>
              </button>
              <button
                onClick={() => setFilterStatus('ตรวจโซนปลายทาง')}
                className="px-3 py-2 border border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg text-xs font-semibold transition-colors"
              >
                ดูกลุ่ม 0 บาท ({zeroRateTrips.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bracket Selector & Calculation Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-white">
              ช่วงราคาน้ำมันดีเซล / น้ำหนักที่ใช้คำนวณ (Rate Card Tier):
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              สลับช่วงราคาเพื่อดูการเปลี่ยนแปลงของยอดบิลรวม
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBracket}
            onChange={(e) => onSelectBracket(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-medium text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="auto">คำนวณอัตโนมัติตามราคาน้ำมันดีเซล PTT ประจำวัน (Recommended)</option>
            <option value="b_under30">ช่วงราคา &lt; 30.00 THB/L</option>
            <option value="c_30_32">ช่วงราคา 30.01 - 32.00 THB/L (เช่น Si Maha Phot = 3,280 ฿)</option>
            <option value="d_32_34">ช่วงราคา 32.01 - 34.00 THB/L</option>
            <option value="e_34_36">ช่วงราคา 34.01 - 36.00 THB/L</option>
            <option value="f_36_38">ช่วงราคา 36.01 - 38.00 THB/L</option>
            <option value="g_38_40">ช่วงราคา 38.01 - 40.00 THB/L (ช่วงราคากันยายน 2026)</option>
            <option value="h_40_42">ช่วงราคา 40.01 - 42.00 THB/L (ช่วงราคาสูง)</option>
            <option value="i_42_44">ช่วงราคา 42.01 - 44.00 THB/L</option>
          </select>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white">
          <div className="flex items-center gap-2">
            <span>ตัวกรองข้อมูลรายงาน (Filter Bar)</span>
            <span className="text-slate-400 font-normal">
              (พบ {filteredTrips.length} จาก {trips.length} รายการ)
            </span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 font-normal transition-colors text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 text-xs">
          {/* Keyword Search */}
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              คำค้นหา (Job/Trip/สถานที่):
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ระบุคำค้น..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Company / Shipper */}
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              บริษัท (Consignee/Shipper):
            </label>
            <select
              value={filterCompany}
              onChange={(e) => {
                setFilterCompany(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              {companyOptions.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'ทุกบริษัท (ทั้งหมด)' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Branch (สาขา) */}
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              สาขา (Branch):
            </label>
            <select
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              <option value="ALL">ทุกสาขา (นวนคร + บางบ่อ)</option>
              <option value="นวนคร">สาขานวนคร (NLC)</option>
              <option value="บางบ่อ">สาขาบางบ่อ (BBO)</option>
            </select>
          </div>

          {/* Truck Type */}
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              ประเภทรถ:
            </label>
            <select
              value={filterTruckType}
              onChange={(e) => {
                setFilterTruckType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              <option value="ALL">รถทุกประเภท (ทั้งหมด)</option>
              <option value="4W">รถ 4 ล้อ (4W)</option>
              <option value="6W">รถ 6 ล้อ (6W)</option>
              <option value="10W">รถ 10 ล้อ (10W)</option>
            </select>
          </div>

          {/* OD Type (รถซับ Sub Contractor) */}
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              ประเภทรถซับ (OD Type):
            </label>
            <select
              value={filterODType}
              onChange={(e) => {
                setFilterODType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              <option value="ALL">รถทุกกลุ่ม (บริษัท + ซับ)</option>
              <option value="Company Truck">รถบริษัท (Company Truck)</option>
              <option value="OD 4">OD 4 (รถซับ 4 ล้อ)</option>
              <option value="OD 6">OD 6 (รถซับ 6 ล้อ)</option>
              <option value="OD 10">OD 10 (รถซับ 10 ล้อ)</option>
            </select>
          </div>

          {/* Diff Reconciliation Filter */}
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              ตรวจสอบส่วนต่าง (Diff):
            </label>
            <select
              value={filterDiff}
              onChange={(e) => {
                setFilterDiff(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              <option value="ALL">แสดงทุกรายการ</option>
              <option value="Match">✅ ตรงกัน (Match 100%)</option>
              <option value="MinorDiff">⚠️ ต่างเล็กน้อย (Diff &lt; 5%)</option>
              <option value="MajorDiff">❌ ต่างมาก (Diff &ge; 5%)</option>
            </select>
          </div>

          {/* Review Status */}
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              สถานะตรวจสอบราคา:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              <option value="ALL">ทุกสถานะ (ทั้งหมด)</option>
              <option value="มีราคา">มีราคา (ครบถ้วน)</option>
              <option value="ตรวจโซนปลายทาง">ตรวจโซนปลายทาง</option>
              <option value="ไม่มีราคาน้ำมัน">ไม่มีราคาน้ำมัน</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Section: Layout 8 as Requested */}
      <div className="space-y-4">
        {/* Table Summary per truck type matching exact brief */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-700/60 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                AUTOMATED TRANSPORTATION BILLING REPORT SUMMARY
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {onSelectDieselMethod ? (
                <div className="flex items-center bg-slate-200 dark:bg-slate-700/80 rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={() => onSelectDieselMethod('monthly_avg')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      dieselMethod === 'monthly_avg'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="คำนวณตามราคาดีเซลเฉลี่ยทั้งเดือน (Monthly Average - มาตรฐาน ปตท.)"
                  >
                    ★ เฉลี่ยทั้งเดือน (Monthly Avg)
                  </button>
                  <button
                    onClick={() => onSelectDieselMethod('daily_spot')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      dieselMethod === 'daily_spot'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="คำนวณตามราคา ณ วันที่เที่ยวรถ (Issue Date)"
                  >
                    ราคา ณ วันที่ (Daily Spot)
                  </button>
                </div>
              ) : (
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-semibold text-[11px]">
                  ราคาน้ำมัน: ดีเซลเฉลี่ยรายเดือน (Monthly Avg)
                </span>
              )}
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                หน่วย: บาท (THB)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 dark:bg-slate-700/40 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-6">ประเภทรถ</th>
                  <th className="py-2.5 px-6 text-center">จำนวน (คัน)</th>
                  <th className="py-2.5 px-6 text-right">ราคาเรท</th>
                  <th className="py-2.5 px-6 text-right">ค่าน้ำมัน</th>
                  <th className="py-2.5 px-6 text-right">ค่าอื่นๆ</th>
                  <th className="py-2.5 px-6 text-right font-bold text-blue-600 dark:text-blue-400">รวม (THB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {filteredSummary.summaries.map((row, idx) => {
                  const isGrandTotal = row.truckType === 'รวมทั้งหมด';
                  return (
                    <tr
                      key={idx}
                      className={`transition-colors ${
                        isGrandTotal
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 font-bold text-slate-900 dark:text-white text-xs'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      <td className="py-2.5 px-6 font-semibold">
                        {row.truckType === '4W' && '4W (รถ 4 ล้อ)'}
                        {row.truckType === '6W' && '6W (รถ 6 ล้อ)'}
                        {row.truckType === '10W' && '10W (รถ 10 ล้อ)'}
                        {isGrandTotal && 'รวม'}
                      </td>
                      <td className="py-2.5 px-6 text-center font-mono">
                        {row.count}
                      </td>
                      <td className="py-2.5 px-6 text-right font-mono">
                        {row.baseRateAmount > 0
                          ? row.baseRateAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                      <td className="py-2.5 px-6 text-right font-mono">
                        {row.fuelSurchargeAmount > 0
                          ? row.fuelSurchargeAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                      <td className="py-2.5 px-6 text-right font-mono">
                        {row.otherFeesAmount > 0
                          ? row.otherFeesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                      <td className="py-2.5 px-6 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {row.totalAmount > 0
                          ? `฿${row.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Breakdown Mini-Cards: Branches, Sub-Contractor OD, and Price Reconciliation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* 1. Branch Summary */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                🏢 แยกตามสาขา (Branches)
              </span>
              <span className="text-[10px] text-slate-400">นวนคร & บางบ่อ</span>
            </div>
            {filteredSummary.branchSummaries.map((b) => (
              <div key={b.branch} className="flex items-center justify-between py-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  สาขา{b.branch}:
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ฿{b.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1.5">({b.count} เที่ยว)</span>
                </div>
              </div>
            ))}
          </div>

          {/* 2. Sub Contractor OD Summary */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                🚚 รถบริษัท vs รถซับ (OD)
              </span>
              <span className="text-[10px] text-slate-400">Company vs Sub</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">รถบริษัท (Company):</span>
              <div className="text-right">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ฿{filteredSummary.companyTruckAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 ml-1.5">({filteredSummary.companyTruckCount} เที่ยว)</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">รถซับ (Sub OD):</span>
              <div className="text-right">
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  ฿{filteredSummary.subContractorAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 ml-1.5">({filteredSummary.subContractorCount} เที่ยว)</span>
              </div>
            </div>
          </div>

          {/* 3. Price Reconciliation (Diff Status) */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                ⚖️ เช็ค Diff อัตโนมัติ (Reconciliation)
              </span>
              <span className="text-[10px] text-slate-400">vs ลูกค้า</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                ✅ ตรงกัน (Match):
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {filteredSummary.diffSummary.matchCount} เที่ยว
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1">
                ⚠️ ต่างเล็กน้อย (&lt;5%):
              </span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                {filteredSummary.diffSummary.minorDiffCount} เที่ยว
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-rose-700 dark:text-rose-300 flex items-center gap-1">
                ❌ ต่างมาก (&ge;5%):
              </span>
              <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                {filteredSummary.diffSummary.majorDiffCount} เที่ยว
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Table: 24 Columns as Requested */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              ตารางรายละเอียดค่าขนส่ง (Detailed Trips Breakdown & Diff Reconciliation)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              แสดงรายละเอียดแยกตาม สาขา, รถซับ OD, ค่าน้ำมัน, ค่าดรอป, ค่ารอ, ค่าทางด่วน, ค่าคนยก, และส่วนต่าง vs ราคาลูกค้า
            </p>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            หน้า {currentPage} จาก {totalPages} ({filteredTrips.length} รายการ)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Issue Date</th>
                <th className="py-2.5 px-3">Job No.</th>
                <th className="py-2.5 px-3">Trip No.</th>
                <th className="py-2.5 px-3">Branch (สาขา)</th>
                <th className="py-2.5 px-3">OD Type</th>
                <th className="py-2.5 px-3">Consignee/Shipper</th>
                <th className="py-2.5 px-3">Pick Up Name</th>
                <th className="py-2.5 px-3">Delivery Name</th>
                <th className="py-2.5 px-3">Zone Match</th>
                <th className="py-2.5 px-3">Truck Type</th>
                <th className="py-2.5 px-3 text-right">ราคาเรท (Base) ✎</th>
                <th className="py-2.5 px-3 text-right">ค่าน้ำมัน (Fuel)</th>
                <th className="py-2.5 px-3 text-right">ค่าดรอป (Drop)</th>
                <th className="py-2.5 px-3 text-right">ค่ารอ (Wait)</th>
                <th className="py-2.5 px-3 text-right">ทางด่วน (Toll)</th>
                <th className="py-2.5 px-3 text-right">Porter (คนยก)</th>
                <th className="py-2.5 px-3 text-right">ค่าอื่นๆ (Other)</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                  Total Amount (ราคารวม)
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                  ราคาลูกค้า (Quoted)
                </th>
                <th className="py-2.5 px-3 text-center">Diff (ส่วนต่าง)</th>
                <th className="py-2.5 px-3">เหตุผลที่ต่าง (Diff Reason)</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
                <th className="py-2.5 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
              {paginatedTrips.length === 0 ? (
                <tr>
                  <td colSpan={24} className="py-12 text-center">
                    {trips.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Truck className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                          ข้อมูลเที่ยวรถปัจจุบันเป็น 0 รายการ
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          ระบบเคลียร์ข้อมูล Data mock เป็น 0 เรียบร้อย พร้อมสำหรับการนำเข้าไฟล์งานจริง Daily Raw Data (69 คอลัมน์ / AW=Truck Type)
                        </p>
                        <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
                          <button
                            onClick={() => downloadRawData69TemplateExcel()}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>ดาวน์โหลด Template 69 คอลัมน์</span>
                          </button>
                          {onSimulateFullMonthTrips && (
                            <button
                              onClick={onSimulateFullMonthTrips}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>ทดสอบโหลดรอบเดือน 9 (3.78M / 507k)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-slate-400 text-xs">
                          ไม่พบรายการเที่ยวขนส่งที่ตรงกับเงื่อนไขการค้นหา
                        </p>
                        <button
                          onClick={handleResetFilters}
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-md"
                        >
                          ล้างตัวกรอง
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedTrips.map((trip, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isSuccess = trip.reviewStatus === 'มีราคา';
                  const isZoneWarn = trip.reviewStatus === 'ตรวจโซนปลายทาง';
                  const isEditingThis = editingTripId === trip.id;

                  return (
                    <tr
                      key={trip.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="py-2 px-3 text-slate-400 text-center font-mono">
                        {globalIdx}
                      </td>
                      <td className="py-2 px-3">{trip.issueDate}</td>
                      <td className="py-2 px-3 font-mono text-slate-900 dark:text-white font-medium">
                        {trip.jobNo}
                      </td>
                      <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400">
                        {trip.tripNo}
                      </td>
                      {/* Branch Badge */}
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trip.branch === 'บางบ่อ'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {trip.branch}
                        </span>
                      </td>
                      {/* OD Type Badge */}
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            trip.isSubContractor
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {trip.odType}
                        </span>
                      </td>
                      <td className="py-2 px-3 max-w-[180px] truncate" title={trip.consigneeShipper}>
                        {trip.consigneeShipper}
                      </td>
                      <td className="py-2 px-3 max-w-[150px] truncate" title={trip.pickUpName}>
                        {trip.pickUpName}
                      </td>
                      <td className="py-2 px-3 max-w-[180px] truncate" title={trip.deliveryName}>
                        {trip.deliveryName}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-white">
                        {trip.zoneLocationMatch}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {trip.standardTruckType}
                        </span>
                      </td>

                      {/* Base Rate with Inline Editor */}
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {isEditingThis ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editRateValue}
                              onChange={(e) => setEditRateValue(e.target.value)}
                              className="w-20 px-1.5 py-0.5 text-right border border-blue-500 rounded bg-white dark:bg-slate-900 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInlineRate(trip.id);
                                if (e.key === 'Escape') setEditingTripId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveInlineRate(trip.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-700"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => {
                              setEditingTripId(trip.id);
                              setEditRateValue(String(trip.baseTripRate || ''));
                            }}
                            className={`cursor-pointer group flex items-center justify-end gap-1 hover:underline ${
                              trip.baseTripRate === 0
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-slate-900 dark:text-white'
                            }`}
                            title="คลิกเพื่อแก้ไขราคาเรทฐาน"
                          >
                            <span>
                              {trip.baseTripRate > 0
                                ? trip.baseTripRate.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                                : '0.00'}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        )}
                      </td>

                      {/* Fuel Surcharge */}
                      <td className="py-2 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                        {trip.fuelSurcharge > 0 ? trip.fuelSurcharge.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                      </td>

                      {/* Drop Fee */}
                      <td className="py-2 px-3 text-right font-mono">
                        {trip.dropFee > 0 ? trip.dropFee.toLocaleString() : '-'}
                      </td>

                      {/* Waiting Fee */}
                      <td className="py-2 px-3 text-right font-mono">
                        {trip.waitingFee > 0 ? trip.waitingFee.toLocaleString() : '-'}
                      </td>

                      {/* Toll Fee */}
                      <td className="py-2 px-3 text-right font-mono">
                        {trip.tollFee > 0 ? trip.tollFee.toLocaleString() : '-'}
                      </td>

                      {/* Porter Fee */}
                      <td className="py-2 px-3 text-right font-mono">
                        {trip.porterFee > 0 ? trip.porterFee.toLocaleString() : '-'}
                      </td>

                      {/* Other Fees */}
                      <td className="py-2 px-3 text-right font-mono">
                        {trip.otherFees > 0 ? trip.otherFees.toLocaleString() : '-'}
                      </td>

                      {/* Total Amount */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                        ฿{trip.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Customer Quoted */}
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        ฿{trip.customerQuotedPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Diff Badge */}
                      <td className="py-2 px-3 text-center font-mono">
                        {trip.diffStatus === 'Match' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                            0.00 (Match)
                          </span>
                        ) : trip.diffStatus === 'MinorDiff' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                            {trip.diffAmount > 0 ? '+' : ''}{trip.diffAmount.toFixed(0)} ฿ ({trip.diffPercent.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                            {trip.diffAmount > 0 ? '+' : ''}{trip.diffAmount.toFixed(0)} ฿ ({trip.diffPercent.toFixed(1)}%)
                          </span>
                        )}
                      </td>

                      {/* Diff Reason */}
                      <td className="py-2 px-3 max-w-[200px] truncate text-[11px]" title={trip.diffReason}>
                        <span className="text-slate-600 dark:text-slate-300">{trip.diffReason}</span>
                      </td>

                      {/* Review status */}
                      <td className="py-2 px-3 text-center">
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                            <CheckCircle className="w-3 h-3" /> มีราคา
                          </span>
                        )}
                        {isZoneWarn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" /> ตรวจโซน
                          </span>
                        )}
                        {!isSuccess && !isZoneWarn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                            <XCircle className="w-3 h-3" /> ไม่มีราคา
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingTripId(trip.id);
                              setEditRateValue(String(trip.standardTripRate || ''));
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="แก้ไขราคาเที่ยวนี้"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteTrip && (
                            <button
                              onClick={() => onDeleteTrip(trip.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="ลบเที่ยวรถนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              แสดงหน้า {currentPage} จากทั้งหมด {totalPages} หน้า
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded text-xs font-semibold ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add New Trip Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                เพิ่มเที่ยวขนส่งใหม่ (Add Trip Record)
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Job No. *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น GTT-D260930999"
                    value={newJobNo}
                    onChange={(e) => setNewJobNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Trip No.
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น TRP-GTTD260930999"
                    value={newTripNo}
                    onChange={(e) => setNewTripNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="text"
                    value={newIssueDate}
                    onChange={(e) => setNewIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    ประเภทรถ (Truck Type) *
                  </label>
                  <select
                    value={newTruckType}
                    onChange={(e) => setNewTruckType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="4W/Single Unit">4W/Single Unit (รถ 4 ล้อ)</option>
                    <option value="6W/Single Unit">6W/Single Unit (รถ 6 ล้อ)</option>
                    <option value="10W/Single Unit">10W/Single Unit (รถ 10 ล้อ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  บริษัทลูกค้า (Consignee/Shipper)
                </label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    อำเภอปลายทาง (District)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ศรีมหาโพธิ / พระพุทธบาท"
                    value={newDelivDistrict}
                    onChange={(e) => setNewDelivDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    จังหวัดปลายทาง (Province)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ปราจีนบุรี / สระบุรี"
                    value={newDelivProvince}
                    onChange={(e) => setNewDelivProvince(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Standard Trip Rate (THB)
                </label>
                <input
                  type="number"
                  placeholder="เช่น 3280"
                  value={newStandardRate}
                  onChange={(e) => setNewStandardRate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono font-bold text-blue-600"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveNewTrip}
                disabled={!newJobNo.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-40"
              >
                บันทึกเที่ยวรถใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
