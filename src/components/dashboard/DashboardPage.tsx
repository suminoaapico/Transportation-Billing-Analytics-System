import React, { useMemo } from 'react';
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
} from 'lucide-react';
import { CalculatedBillingTrip, BillingReportSummary, DieselPriceRecord } from '../../types';

interface DashboardPageProps {
  trips: CalculatedBillingTrip[];
  summary: BillingReportSummary;
  latestDieselPrice: number | null;
  dieselHistory: DieselPriceRecord[];
  onNavigateToBilling: () => void;
  onNavigateToImport: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  trips,
  summary,
  latestDieselPrice,
  dieselHistory,
  onNavigateToBilling,
  onNavigateToImport,
}) => {
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
          <div className="flex items-center gap-3">
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
    </div>
  );
};
