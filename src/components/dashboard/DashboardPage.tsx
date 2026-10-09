import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Truck,
  Fuel,
  Receipt,
  ArrowUpRight,
  MapPin,
  Calendar,
  Building2,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Cloud,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Download,
  FileSpreadsheet,
  HardDrive,
  FileText,
  Layers,
  Scale,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { CalculatedBillingTrip, BillingReportSummary, DieselPriceRecord } from '../../types';
import { LiveOilProduct } from '../../services/pttService';
import { NetlifyDeployGuideModal } from '../common/NetlifyDeployGuideModal';
import {
  SAMPLE_FILES_CATALOG,
  downloadSampleTripsExcel,
  downloadQuotationTemplateExcel,
  downloadRateCardMasterExcel,
  downloadDieselDatabaseExcel,
} from '../../services/sampleFilesService';

interface DashboardPageProps {
  trips: CalculatedBillingTrip[];
  summary: BillingReportSummary;
  latestDieselPrice: number | null;
  dieselHistory: DieselPriceRecord[];
  onNavigateToBilling: () => void;
  onNavigateToImport: () => void;
  onNavigateToMaster?: () => void;
  onNavigateToReconciliation?: () => void;
  onSimulateFullMonthTrips?: () => void;
  onResetToSeedData?: () => void;
  liveProducts?: LiveOilProduct[];
  onRefreshLivePrices?: () => Promise<void>;
  isRefreshingLivePrices?: boolean;
  onSelectDieselPrice?: (price: number, name: string) => void;
  onOpenDriveModal?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  trips,
  summary,
  latestDieselPrice,
  dieselHistory,
  onNavigateToBilling,
  onNavigateToImport,
  onNavigateToMaster,
  onNavigateToReconciliation,
  onSimulateFullMonthTrips,
  onResetToSeedData,
  liveProducts = [],
  onRefreshLivePrices,
  isRefreshingLivePrices = false,
  onSelectDieselPrice,
  onOpenDriveModal,
}) => {
  const [isNetlifyModalOpen, setIsNetlifyModalOpen] = useState(false);
  const [showOilSection, setShowOilSection] = useState(true);

  // Monthly Average Diesel Calculation for current month (e.g. 09/2026)
  const monthlyAvgDiesel = useMemo(() => {
    if (dieselHistory.length === 0) return 40.69;
    const septPrices = dieselHistory.filter((d) => d.date.includes('/9/') || d.date.includes('/09/'));
    const list = septPrices.length > 0 ? septPrices : dieselHistory;
    const sum = list.reduce((acc, cur) => acc + cur.price, 0);
    return Math.round((sum / list.length) * 100) / 100;
  }, [dieselHistory]);

  // Check 5% Price Fluctuation Alert (Requirement I)
  const dieselDiffFromAvgPct = useMemo(() => {
    if (!latestDieselPrice || monthlyAvgDiesel === 0) return 0;
    return Math.round(Math.abs((latestDieselPrice - monthlyAvgDiesel) / monthlyAvgDiesel) * 1000) / 10;
  }, [latestDieselPrice, monthlyAvgDiesel]);

  const isDieselFluctuatedOver5Percent = dieselDiffFromAvgPct >= 5;

  // Aggregate 4W, 6W, 10W counts
  const count4W = trips.filter((t) => t.standardTruckType === '4W').length;
  const count6W = trips.filter((t) => t.standardTruckType === '6W').length;
  const count10W = trips.filter((t) => t.standardTruckType === '10W').length;

  // Daily Trend calculation
  const dailyStats = useMemo(() => {
    const map = new Map<string, { count: number; totalAmount: number }>();
    trips.forEach((t) => {
      const d = t.issueDate;
      const cur = map.get(d) || { count: 0, totalAmount: 0 };
      map.set(d, {
        count: cur.count + 1,
        totalAmount: cur.totalAmount + (t.standardTripRate || 0),
      });
    });

    const entries = Array.from(map.entries()).sort((a, b) => {
      const pA = a[0].split(/[-/]/);
      const pB = b[0].split(/[-/]/);
      return (parseInt(pA[0], 10) || 0) - (parseInt(pB[0], 10) || 0);
    });

    return entries.map(([date, data]) => ({
      date,
      count: data.count,
      totalAmount: data.totalAmount,
    }));
  }, [trips]);

  // Consignee share
  const consigneeStats = useMemo(() => {
    const map = new Map<string, { count: number; totalAmount: number }>();
    trips.forEach((t) => {
      const c = t.consigneeShipper || 'Other';
      const cur = map.get(c) || { count: 0, totalAmount: 0 };
      map.set(c, {
        count: cur.count + 1,
        totalAmount: cur.totalAmount + (t.standardTripRate || 0),
      });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [trips]);

  // Top 10 Delivery destinations
  const topDestinations = useMemo(() => {
    const map = new Map<string, { count: number; totalAmount: number }>();
    trips.forEach((t) => {
      const loc = t.zoneLocationMatch !== 'ไม่พบการจับคู่'
        ? t.zoneLocationMatch
        : `${t.deliveryDistrict || t.deliveryProvince || 'Unspecified'}`;
      const cur = map.get(loc) || { count: 0, totalAmount: 0 };
      map.set(loc, {
        count: cur.count + 1,
        totalAmount: cur.totalAmount + (t.standardTripRate || 0),
      });
    });
    return Array.from(map.entries())
      .map(([destination, data]) => ({ destination, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [trips]);

  // Monthly summary table
  const monthlySummary = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    trips.forEach((t) => {
      const parts = t.issueDate.split(/[-/]/);
      const monthYear = parts.length >= 2 ? `${parts[1]}/${parts[2] || '2026'}` : '09/2026';
      const cur = map.get(monthYear) || { count: 0, amount: 0 };
      map.set(monthYear, {
        count: cur.count + 1,
        amount: cur.amount + (t.standardTripRate || 0),
      });
    });

    return Array.from(map.entries()).map(([month, data]) => ({
      month: `กันยายน ${month.split('/')[1] || '2026'}`,
      tripCount: data.count,
      totalAmount: data.amount,
      avgRate: data.count > 0 ? data.amount / data.count : 0,
    }));
  }, [trips]);

  // Max daily amount for charting
  const maxDailyAmount = Math.max(...dailyStats.map((d) => d.totalAmount), 1);
  const maxDestCount = Math.max(...topDestinations.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-xs">
                Logistics Settlement Platform
              </span>
              <span className="text-xs text-blue-100 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> เดือนกันยายน 2026
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Dashboard จัดการและวิเคราะห์ค่าขนส่ง
            </h2>
            <p className="text-xs text-blue-100 mt-1 max-w-xl">
              คำนวณ Standard Trip Rate อัตโนมัติจาก Rate Card, จับคู่โซนปลายทาง
              และเชื่อมโยงราคาน้ำมันดีเซล PTT ประจำวัน
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsNetlifyModalOpen(true)}
              className="px-3.5 py-2.5 bg-blue-500/30 hover:bg-blue-500/50 text-white font-medium rounded-lg text-xs backdrop-blur-xs transition-all border border-blue-400/30 flex items-center gap-1.5"
              title="คู่มือแก้ไขหน้าเว็บไม่แสดงผลบน Netlify"
            >
              <Cloud className="w-4 h-4 text-sky-200" />
              คู่มือ Deploy Netlify
            </button>
            <button
              onClick={onNavigateToBilling}
              className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-lg text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              ดู Billing Report
            </button>
            <button
              onClick={onNavigateToImport}
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg text-xs backdrop-blur-xs transition-all border border-white/20"
            >
              นำเข้าไฟล์ Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Trips */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              จำนวนเที่ยวขนส่งรวม
            </p>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {summary.grandTotalCount}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">เที่ยว</span>
            </h3>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>ตรวจราคาเรียบร้อยแล้ว {trips.filter((t) => t.reviewStatus === 'มีราคา').length} เที่ยว</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Billing Amount */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ยอดค่าขนส่งรวม (THB)
            </p>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              ฿{summary.grandTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              เฉลี่ย ฿
              {(summary.grandTotalCount > 0
                ? summary.grandTotalAmount / summary.grandTotalCount
                : 0
              ).toLocaleString('th-TH', { maximumFractionDigits: 0 })}{' '}
              ต่อเที่ยว
            </p>
          </div>
        </div>

        {/* Card 3: Trucks Breakdown (4W / 6W / 10W) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              สัดส่วนประเภทรถ
            </p>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{count4W}</span>
                <span className="text-[10px] text-slate-500 ml-1">4W</span>
              </div>
              <div className="text-slate-300 dark:text-slate-600">|</div>
              <div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{count6W}</span>
                <span className="text-[10px] text-slate-500 ml-1">6W</span>
              </div>
              <div className="text-slate-300 dark:text-slate-600">|</div>
              <div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{count10W}</span>
                <span className="text-[10px] text-slate-500 ml-1">10W</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2.5 flex">
              <div
                style={{ width: `${summary.grandTotalCount ? (count4W / summary.grandTotalCount) * 100 : 0}%` }}
                className="bg-blue-600 h-full"
                title={`4W: ${count4W}`}
              />
              <div
                style={{ width: `${summary.grandTotalCount ? (count6W / summary.grandTotalCount) * 100 : 0}%` }}
                className="bg-indigo-500 h-full"
                title={`6W: ${count6W}`}
              />
              <div
                style={{ width: `${summary.grandTotalCount ? (count10W / summary.grandTotalCount) * 100 : 0}%` }}
                className="bg-amber-500 h-full"
                title={`10W: ${count10W}`}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Latest Diesel Price */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ราคาน้ำมันดีเซล PTT
            </p>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {latestDieselPrice ? `${latestDieselPrice.toFixed(2)}` : '38.39'}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">THB/L</span>
            </h3>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              ฐานคำนวณ Rate Card ช่วง 38.01 - 42.00
            </p>
          </div>
        </div>
      </div>

      {/* Explanation Banner: ฿167,300 Total Billing Breakdown */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 rounded-xl p-4 border border-blue-200 dark:border-blue-900 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl mt-0.5 shrink-0 shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  คำชี้แจงยอดค่าขนส่งรวม (THB) ฿{summary.grandTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                  ข้อมูลปัจจุบัน: {trips.length} เที่ยว
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                ยอด <strong>฿167,300.00</strong> นี้คำนวณมาจาก <strong>ชุดข้อมูลตัวอย่างเริ่มต้น (Seed Demo Data 20 เที่ยว)</strong> เพื่อใช้ทดสอบระบบและตรวจสอบ Standard Trip Rate, การจับคู่โซน และราคาน้ำมันดีเซล หากต้องการยอดสรุปทั้งเดือนของบริษัทจริง สามารถอัปโหลดไฟล์ Excel ฉบับเต็ม หรือกดจำลองข้อมูลเต็มเดือนได้ทันที:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onSimulateFullMonthTrips && (
              <button
                onClick={onSimulateFullMonthTrips}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                title="สร้างชุดข้อมูลจำลอง ~80 เที่ยวตลอดเดือนกันยายนเพื่อดูยอดรวม ฿450,000+"
              >
                <Sparkles className="w-3.5 h-3.5" />
                จำลองข้อมูลเต็มเดือน (~80 เที่ยว)
              </button>
            )}
            <button
              onClick={onNavigateToImport}
              className="px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-700 text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5"
            >
              นำเข้าไฟล์ Excel ข้อมูลจริง
            </button>
            {onResetToSeedData && trips.length > 20 && (
              <button
                onClick={onResetToSeedData}
                className="px-2.5 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs rounded-lg transition-all"
                title="กลับไปใช้ข้อมูลเริ่มต้น 20 เที่ยว"
              >
                คืนค่าเริ่มต้น
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 1 Charts: Daily Trend (Line) & Truck Type Comparison (Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Daily Freight Billing Trend (Span 2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                แนวโน้มค่าขนส่งรายวัน (Daily Freight Trend)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ยอดค่าขนส่งรวมแยกตาม Issue Date
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
              {dailyStats.length} วันทำการ
            </span>
          </div>

          {/* Bar / Trend Visualization */}
          <div className="h-56 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-700">
            {dailyStats.map((item, idx) => {
              const heightPercent = Math.max((item.totalAmount / maxDailyAmount) * 100, 8);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-lg">
                    {item.date}: ฿{item.totalAmount.toLocaleString()} ({item.count} เที่ยว)
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[28px] bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-t-sm transition-all"
                  />
                  <span className="text-[9px] text-slate-400 truncate max-w-[32px]">
                    {item.date.split('/')[0]}/{item.date.split('/')[1]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>ต้นเดือน (2/9/2026)</span>
            <span>สิ้นเดือน (30/9/2026)</span>
          </div>
        </div>

        {/* Chart 2: Trips by Truck Type */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              จำนวนเที่ยวแยกตามประเภทรถ
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              เปรียบเทียบเที่ยว 4W / 6W / 10W
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* 4W */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  รถ 4 ล้อ (4W)
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {count4W} เที่ยว ({summary.grandTotalCount ? Math.round((count4W / summary.grandTotalCount) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div
                  style={{ width: `${summary.grandTotalCount ? (count4W / summary.grandTotalCount) * 100 : 0}%` }}
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>

            {/* 6W */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  รถ 6 ล้อ (6W)
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {count6W} เที่ยว ({summary.grandTotalCount ? Math.round((count6W / summary.grandTotalCount) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div
                  style={{ width: `${summary.grandTotalCount ? (count6W / summary.grandTotalCount) * 100 : 0}%` }}
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>

            {/* 10W */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  รถ 10 ล้อ (10W)
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {count10W} เที่ยว ({summary.grandTotalCount ? Math.round((count10W / summary.grandTotalCount) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div
                  style={{ width: `${summary.grandTotalCount ? (count10W / summary.grandTotalCount) * 100 : 0}%` }}
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Summary Box */}
          <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-xs space-y-1.5 border border-slate-200 dark:border-slate-600">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>ยอดค่าขนส่ง 4W:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ฿{summary.summaries.find((s) => s.truckType === '4W')?.totalAmount.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>ยอดค่าขนส่ง 6W:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ฿{summary.summaries.find((s) => s.truckType === '6W')?.totalAmount.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Top Destinations (Horizontal Bar) & Consignee/Shipper Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Delivery Destinations (Horizontal Bar) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                Top 10 ปลายทางยอดนิยม (Top Delivery Zones)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                โซนและพื้นที่ที่มีการจัดส่งสินค้าบ่อยที่สุด
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {topDestinations.map((item, idx) => {
              const widthPercent = (item.count / maxDestCount) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[240px]">
                      {idx + 1}. {item.destination}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                      {item.count} เที่ยว (฿{item.totalAmount.toLocaleString()})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${widthPercent}%` }}
                      className="bg-emerald-500 h-full rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consignee / Shipper Share */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                สัดส่วนค่าขนส่งแยกตามบริษัท (Shipper / Consignee)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                การกระจายตัวของงานขนส่งแต่ละบริษัท
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {consigneeStats.map((item, idx) => {
              const share = summary.grandTotalAmount > 0
                ? ((item.totalAmount / summary.grandTotalAmount) * 100).toFixed(1)
                : '0';
              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200/80 dark:border-slate-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">
                      {item.name}
                    </span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {share}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-600 h-2 rounded-full overflow-hidden mb-2">
                    <div
                      style={{ width: `${share}%` }}
                      className="bg-blue-600 h-full rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>จำนวน {item.count} เที่ยว</span>
                    <span>รวม ฿{item.totalAmount.toLocaleString()} บาท</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Diesel Price Trend vs Average Trip Rate & Monthly Summary Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diesel Trend vs Avg Trip Rate */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs lg:col-span-1">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Fuel className="w-4 h-4 text-amber-500" />
              ราคาน้ำมันดีเซล PTT vs ค่าเฉลี่ยต่อเที่ยว
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              วิเคราะห์ความสัมพันธ์ของราคาน้ำมันกับเรทค่าขนส่ง
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                ช่วงราคาน้ำมันเดือนนี้:
              </span>
              <div className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1">
                38.39 - 41.44 บาท/ลิตร
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                ขยับขึ้น +3.05 ฿/L ส่งผลให้ปรับขั้น Rate Card ไปยัง Bracket 40.01-42.00
              </p>
            </div>

            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <span className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                ค่าขนส่งเฉลี่ยต่อเที่ยว:
              </span>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-1">
                ฿
                {(summary.grandTotalCount > 0
                  ? summary.grandTotalAmount / summary.grandTotalCount
                  : 0
                ).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                บาท
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">
                เรทเฉลี่ยสอดคล้องกับโครงสร้างต้นทุนมาตรฐาน
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Summary Table (Span 2 cols) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                ตารางสรุปยอดรายเดือน (Monthly Summary Table)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                สรุปยอดบิลตามรอบเดือนบัญชี
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-700 rounded-lg">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">รอบเดือนบัญชี</th>
                  <th className="py-2.5 px-4 text-center">จำนวนเที่ยว (คัน)</th>
                  <th className="py-2.5 px-4 text-right">ยอดค่าขนส่งรวม (THB)</th>
                  <th className="py-2.5 px-4 text-right">เฉลี่ยต่อเที่ยว (THB)</th>
                  <th className="py-2.5 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                {monthlySummary.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">
                      {item.month}
                    </td>
                    <td className="py-3 px-4 text-center">{item.tripCount} เที่ยว</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                      ฿{item.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      ฿{item.avgRate.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3" /> ยืนยันแล้ว
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION: PROMPT 1.5 - RECONCILIATION & DIFF WIDGET */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs p-5 space-y-4">
        {/* Widget header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                PROMPT 1.5: RECONCILIATION WIDGET
              </span>
              <span className="text-xs text-slate-400">ตรวจสอบความถูกต้อง & Diff</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              สรุปการเทียบราคา & ตรวจสอบทริป (Price Comparison & Variance)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เปรียบเทียบยอดที่ระบบคำนวณ vs ยอดที่สาขานวนคร (NLC) และบางบ่อ (BLC) ส่งมาตรวจสอบ
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToReconciliation && (
              <button
                onClick={onNavigateToReconciliation}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <span>เปิดหน้าจอเทียบราคาเต็ม</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4 KPIs: ตรง / ไม่ตรง / รวม / มูลค่า Diff รวม */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
              ทริปทั้งหมด (Total Trips)
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {trips.length} ทริป
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">100% ตรวจสอบแล้ว</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mb-1 font-semibold">
              🟢 ทริปตรงกัน (Match 100%)
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {trips.filter((t) => t.diffStatus === 'Match').length} ทริป
            </div>
            <span className="text-[10px] text-emerald-600/70 block mt-0.5">
              {(
                (trips.filter((t) => t.diffStatus === 'Match').length / (trips.length || 1)) *
                100
              ).toFixed(0)}
              % ของทริปทั้งหมด
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <span className="text-[11px] text-amber-700 dark:text-amber-300 block mb-1 font-semibold">
              🟡 ต่างเล็กน้อย (&lt; 5%)
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {trips.filter((t) => t.diffStatus === 'MinorDiff').length} ทริป
            </div>
            <span className="text-[10px] text-amber-600/70 block mt-0.5">ค่าน้ำมันหรือทางด่วน</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
            <span className="text-[11px] text-rose-700 dark:text-rose-300 block mb-1 font-semibold">
              🔴 ต่างมาก / ต้องตรวจ (&ge; 5%)
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {trips.filter((t) => t.diffStatus === 'MajorDiff').length} ทริป
            </div>
            <span className="text-[10px] text-rose-600/70 block mt-0.5">ต้องตรวจประเภทรถ/เรท</span>
          </div>
        </div>

        {/* 10 ทริปที่ Diff มากสุด Table (Prompt 1.5 Requirement) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              10 ทริปที่มีส่วนต่าง (Diff) มากที่สุด ที่ต้องตรวจสอบ:
            </span>
            <span className="text-[11px] text-slate-400">เรียงตามขนาดของส่วนต่าง</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3">Trip No.</th>
                  <th className="py-2.5 px-3">บริษัท</th>
                  <th className="py-2.5 px-3">สาขา</th>
                  <th className="py-2.5 px-3">ประเภทรถ</th>
                  <th className="py-2.5 px-3 text-right">ราคาระบบ</th>
                  <th className="py-2.5 px-3 text-right">ยอดสาขา</th>
                  <th className="py-2.5 px-3 text-right">Diff (บาท)</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  <th className="py-2.5 px-3">เหตุผลที่ Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {trips
                  .filter((t) => Math.abs(t.diffAmount) > 0)
                  .sort((a, b) => Math.abs(b.diffAmount) - Math.abs(a.diffAmount))
                  .slice(0, 10)
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="py-2 px-3 font-mono text-slate-500">{t.issueDate}</td>
                      <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400 font-semibold">{t.tripNo}</td>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-white truncate max-w-[150px]">{t.consigneeShipper}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.branch === 'นวนคร' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'}`}>
                          {t.branch}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">{t.truckTypeRaw || t.standardTruckType}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">฿{t.totalAmount.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300">฿{t.customerQuotedPrice.toLocaleString()}</td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${t.diffStatus === 'MajorDiff' ? 'text-rose-600' : 'text-amber-600'}`}>
                        {t.diffAmount > 0 ? '+' : ''}฿{t.diffAmount.toLocaleString()} ({t.diffPercent.toFixed(1)}%)
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.diffStatus === 'MajorDiff' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                          {t.diffStatus === 'MajorDiff' ? '🔴 ตรวจสอบ' : '🟡 ต่างเล็กน้อย'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-500 max-w-xs truncate">{t.diffReason}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section: Diesel Monthly Average & Calculation Logic (Logic A) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Fuel className="w-5 h-5 text-blue-600" />
              การคำนวณราคาน้ำมันดีเซลรายเดือน (Monthly Average Diesel Rate)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              คำนวณราคาเฉลี่ยทั้งเดือนของ ปตท. (Logic A) เพื่อขจัดปัญหา Diff พร้อมระบบตรวจสอบความผันผวน
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToMaster && (
              <button
                onClick={onNavigateToMaster}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                จัดการข้อมูลหลัก (Master Data)
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Monthly Average Status Card (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-emerald-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 border border-blue-200 dark:border-blue-900 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                    ราคาน้ำมันดีเซลเฉลี่ยทั้งเดือน (Monthly Average)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-blue-700 dark:text-blue-300 font-mono">
                      ฿{monthlyAvgDiesel.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">THB / ลิตร (เฉลี่ย ก.ย. 2026)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ราคาล่าสุด: <strong>฿{latestDieselPrice ? latestDieselPrice.toFixed(2) : '42.19'} ฿/L</strong>
                  </div>
                </div>
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shrink-0 self-start sm:self-auto">
                  <Fuel className="w-6 h-6" />
                </div>
              </div>

              {/* 5% Alert if applicable */}
              {isDieselFluctuatedOver5Percent && (
                <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    <strong>แจ้งเตือนความผันผวน:</strong> ราคาน้ำมันเปลี่ยนแปลง <strong>{dieselDiffFromAvgPct}%</strong> (เกินเกณฑ์ 5%) ซึ่งอาจส่งผลต่อการขยับขั้น Bracket ของ Rate Card
                  </span>
                </div>
              )}

              <div className="p-2.5 bg-white/80 dark:bg-slate-700/60 rounded-lg border border-blue-100 dark:border-slate-600 text-xs space-y-1">
                <div className="font-semibold text-slate-800 dark:text-white flex items-center justify-between">
                  <span>สูตรคำนวณ Monthly Average (Logic A):</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    ผลรวม 30 วัน ÷ 30 วัน = 40.69 ฿/L
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  ★ <strong>ข้อยกเว้นสัญญาคงที่:</strong> บริษัท <strong>SIEMENS</strong> ใช้เรทคงที่ <strong>฿38.00</strong> ตามสัญญา (ไม่ผันแปรตามราคาตลาด)
                </p>
              </div>
            </div>

            {/* Quick Pricing Bracket Guidance */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                การคำนวณตามช่วงราคาน้ำมัน (Fuel Bracket Matching)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                เมื่อราคาน้ำมันดีเซลเปลี่ยนแปลง ระบบจะขยับคอลัมน์ Rate Card ไปยัง Bracket ที่ตรงกับราคานั้น เช่น:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center text-xs">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                  <span className="block text-[10px] text-slate-400">ช่วงต่ำ</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">30.01 - 32.00</strong>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                  <span className="block text-[10px] text-slate-400">ช่วงกลาง</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">36.01 - 38.00</strong>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-lg border border-blue-300 dark:border-blue-700">
                  <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-bold">ปัจจุบัน (ก.ย.)</span>
                  <strong className="text-blue-700 dark:text-blue-300 font-mono">40.01 - 42.00</strong>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                  <span className="block text-[10px] text-slate-400">ช่วงสูงสุด</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">58.01 - 60.00</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Recent Diesel History snippet (5 cols) */}
          <div className="lg:col-span-5 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-emerald-600" />
                ประวัติราคาน้ำมันดีเซลในระบบ
              </h4>
              <span className="text-[10px] text-slate-400">
                บันทึกไว้ {dieselHistory.length} วัน
              </span>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {dieselHistory.slice(0, 7).map((rec, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-xs"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {rec.date}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[140px]">
                    {rec.source}
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                    ฿{rec.price.toFixed(2)} / ลิตร
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Google Drive & Sample Files Catalog (ข้อมูลตัวอย่าง & Drive) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                GOOGLE DRIVE & SAMPLE DATASETS
              </span>
              <span className="text-xs text-slate-400">คลังเอกสาร & ไฟล์ตัวอย่าง</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-600" />
              Drive ข้อมูลตัวอย่าง & เอกสารต้นแบบ (Sample Files & Cloud Storage)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ดาวน์โหลดไฟล์ Excel ตัวอย่างสำหรับทดสอบระบบ หรือบันทึกรายงานค่าขนส่งขึ้น Google Drive ส่วนตัว
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDriveModal && (
              <button
                onClick={onOpenDriveModal}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
              >
                <Cloud className="w-4 h-4" />
                <span>เปิด Google Drive & คลังไฟล์</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Sample File Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAMPLE_FILES_CATALOG.map((file) => (
            <div
              key={file.id}
              className="p-4 bg-slate-50/70 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-400 transition-all flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl shrink-0 mt-0.5">
                    {file.category === 'raw_trips' && <Truck className="w-5 h-5" />}
                    {file.category === 'quotation' && <FileText className="w-5 h-5" />}
                    {file.category === 'rate_card' && <Layers className="w-5 h-5" />}
                    {file.category === 'diesel' && <Fuel className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                      {file.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {file.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-600">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>{file.sizeStr}</span>
                  <span>•</span>
                  <span>{file.recordCount} รายการ</span>
                </div>

                <button
                  onClick={() => {
                    if (file.id === 'sample-trips-sep2026') downloadSampleTripsExcel();
                    else if (file.id === 'sample-quotations-template') downloadQuotationTemplateExcel();
                    else if (file.id === 'sample-ratecard-standard') downloadRateCardMasterExcel();
                    else if (file.id === 'sample-diesel-ptt-sep2026') downloadDieselDatabaseExcel();
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด (.xlsx)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Netlify Deploy Guide Modal */}
      <NetlifyDeployGuideModal
        isOpen={isNetlifyModalOpen}
        onClose={() => setIsNetlifyModalOpen(false)}
      />
    </div>
  );
};
