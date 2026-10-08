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
} from 'lucide-react';
import { CalculatedBillingTrip, BillingReportSummary, StandardTruckType, TruckSummary } from '../../types';
import { exportBillingReportExcel } from '../../services/excelService';

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
}

export const BillingReportPage: React.FC<BillingReportPageProps> = ({
  trips,
  onOpenGoogleDriveModal,
  isDriveConnected,
  onGoogleSignIn,
  selectedBracket,
  onSelectBracket,
  onAutoResolveAll,
  onUpdateTripRate,
}) => {
  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [filterTruckType, setFilterTruckType] = useState<string>('ALL');
  const [filterZone, setFilterZone] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Inline Rate Editing
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

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

      // Truck Type
      if (filterTruckType !== 'ALL' && t.standardTruckType !== filterTruckType) return false;

      // Zone
      if (filterZone !== 'ALL' && t.zoneLocationMatch !== filterZone) return false;

      // Status
      if (filterStatus !== 'ALL' && t.reviewStatus !== filterStatus) return false;

      // Keyword
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const text = `${t.jobNo} ${t.tripNo} ${t.consigneeShipper} ${t.deliveryName} ${t.pickUpName} ${t.truckTypeRaw}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [trips, filterCompany, filterTruckType, filterZone, filterStatus, searchKeyword]);

  // Computed summary for filtered set
  const filteredSummary: BillingReportSummary = useMemo(() => {
    const types: StandardTruckType[] = ['4W', '6W', '10W'];
    let grandTotalCount = 0;
    let grandTotalAmount = 0;

    const summaries: TruckSummary[] = types.map((t) => {
      const matching = filteredTrips.filter((trip) => trip.standardTruckType === t);
      const count = matching.length;
      const totalAmount = matching.reduce((sum, item) => sum + (item.standardTripRate || 0), 0);
      grandTotalCount += count;
      grandTotalAmount += totalAmount;
      return {
        truckType: t,
        count,
        totalAmount,
      };
    });

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
  }, [filteredTrips]);

  const handleResetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCompany('ALL');
    setFilterTruckType('ALL');
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
  const totalPages = Math.ceil(filteredTrips.length / pageSize) || 1;
  const paginatedTrips = filteredTrips.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
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

          {/* Zone / Location Match */}
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              โซนปลายทาง (Zone Match):
            </label>
            <select
              value={filterZone}
              onChange={(e) => {
                setFilterZone(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
            >
              {zoneOptions.map((z) => (
                <option key={z} value={z}>
                  {z === 'ALL' ? 'ทุกโซน (ทั้งหมด)' : z}
                </option>
              ))}
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

      {/* Summary Card: AUTOMATED TRANSPORTATION BILLING REPORT */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-700/60 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              ตารางสรุปยอดค่าขนส่ง (Billing Summary)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            หน่วย: บาท (THB)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 dark:bg-slate-700/40 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-6">ประเภทรถ</th>
                <th className="py-2.5 px-6 text-center">จำนวน (คัน)</th>
                <th className="py-2.5 px-6 text-right">Total Summary Amount (THB)</th>
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
                        ? 'bg-blue-50/60 dark:bg-blue-950/40 font-bold text-slate-900 dark:text-white'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <td className="py-2.5 px-6">
                      {row.truckType === '4W' && 'รถ 4 ล้อ'}
                      {row.truckType === '6W' && 'รถ 6 ล้อ'}
                      {row.truckType === '10W' && 'รถ 10 ล้อ'}
                      {isGrandTotal && 'รวมทั้งหมด'}
                    </td>
                    <td className="py-2.5 px-6 text-center font-mono">
                      {isGrandTotal ? row.count.toFixed(2) : row.count}
                    </td>
                    <td className="py-2.5 px-6 text-right font-mono font-semibold">
                      {row.totalAmount > 0
                        ? row.totalAmount.toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Table: 19 Columns as Requested */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              ตารางรายละเอียดค่าขนส่ง (Detailed Trips Breakdown)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              คลิกหรือดับเบิ้ลคลิกที่ช่อง <strong>Standard Trip Rate</strong> เพื่อแก้ไขราคาแบบเจาะจงได้ทันที
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
                <th className="py-2.5 px-3">Consignee/Shipper</th>
                <th className="py-2.5 px-3">Pick Up Name</th>
                <th className="py-2.5 px-3">Pick Up Province</th>
                <th className="py-2.5 px-3">Delivery Name</th>
                <th className="py-2.5 px-3">Delivery District</th>
                <th className="py-2.5 px-3">Zone/Location Match</th>
                <th className="py-2.5 px-3">Truck Type (Raw)</th>
                <th className="py-2.5 px-3">Backhaul</th>
                <th className="py-2.5 px-3">HaulType</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                  Standard Trip Rate (THB) ✎
                </th>
                <th className="py-2.5 px-3 text-right">Porter/other not in GTT</th>
                <th className="py-2.5 px-3 text-right">Console not in GTT</th>
                <th className="py-2.5 px-3 text-right">Cancelled trips in GTT</th>
                <th className="py-2.5 px-3 text-center">Missing-price trips</th>
                <th className="py-2.5 px-3 text-right">Diesel rate (THB/L)</th>
                <th className="py-2.5 px-3 text-center">Review status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
              {paginatedTrips.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-8 text-center text-slate-400">
                    ไม่พบรายการเที่ยวขนส่งที่ตรงกับเงื่อนไขการค้นหา
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
                      <td className="py-2 px-3 max-w-[200px] truncate" title={trip.consigneeShipper}>
                        {trip.consigneeShipper}
                      </td>
                      <td className="py-2 px-3 max-w-[180px] truncate" title={trip.pickUpName}>
                        {trip.pickUpName}
                      </td>
                      <td className="py-2 px-3">{trip.pickUpProvince}</td>
                      <td className="py-2 px-3 max-w-[200px] truncate" title={trip.deliveryName}>
                        {trip.deliveryName}
                      </td>
                      <td className="py-2 px-3">{trip.deliveryDistrict}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-white">
                        {trip.zoneLocationMatch}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {trip.truckTypeRaw}
                        </span>
                      </td>
                      <td className="py-2 px-3">{trip.backhaul}</td>
                      <td className="py-2 px-3">{trip.haulType}</td>

                      {/* Standard Trip Rate with Inline Editor */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
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
                              setEditRateValue(String(trip.standardTripRate || ''));
                            }}
                            className={`cursor-pointer group flex items-center justify-end gap-1 hover:underline ${
                              trip.standardTripRate === 0
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-slate-900 dark:text-white'
                            }`}
                            title="คลิกเพื่อแก้ไขตัวเลขราคานี้"
                          >
                            <span>
                              {trip.standardTripRate > 0
                                ? trip.standardTripRate.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                                : '0.00 (คลิกใส่ราคา)'}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right font-mono">
                        {trip.porterOther > 0 ? trip.porterOther.toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {trip.consoleNotInGTT > 0 ? trip.consoleNotInGTT.toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-500">
                        {trip.cancelledTripsInGTT > 0
                          ? `(${trip.cancelledTripsInGTT.toLocaleString()})`
                          : '-'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {trip.missingPriceTrips > 0 ? trip.missingPriceTrips : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {trip.dieselRate ? trip.dieselRate.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                            <CheckCircle className="w-3 h-3" /> มีราคา
                          </span>
                        )}
                        {isZoneWarn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" /> ตรวจโซนปลายทาง
                          </span>
                        )}
                        {!isSuccess && !isZoneWarn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                            <XCircle className="w-3 h-3" /> ไม่มีราคาน้ำมัน
                          </span>
                        )}
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
    </div>
  );
};
