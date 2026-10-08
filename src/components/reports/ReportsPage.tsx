import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Truck,
  Building2,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CalculatedBillingTrip } from '../../types';

interface ReportsPageProps {
  trips: CalculatedBillingTrip[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ trips }) => {
  const [reportTab, setReportTab] = useState<'monthly' | 'truck' | 'company'>('monthly');
  const [filterSearch, setFilterSearch] = useState('');

  // 1. Monthly Report Data
  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalAmount: number; count4W: number; count6W: number; count10W: number }
    >();

    trips.forEach((t) => {
      const parts = t.issueDate.split(/[-/]/);
      const mKey = parts.length >= 2 ? `${parts[1]}/${parts[2] || '2026'}` : '09/2026';
      const cur = map.get(mKey) || {
        count: 0,
        totalAmount: 0,
        count4W: 0,
        count6W: 0,
        count10W: 0,
      };

      cur.count += 1;
      cur.totalAmount += t.standardTripRate || 0;
      if (t.standardTruckType === '4W') cur.count4W += 1;
      if (t.standardTruckType === '6W') cur.count6W += 1;
      if (t.standardTruckType === '10W') cur.count10W += 1;

      map.set(mKey, cur);
    });

    return Array.from(map.entries()).map(([month, data]) => ({
      monthKey: month,
      monthName: `กันยายน ${month.split('/')[1] || '2026'}`,
      ...data,
      avgTripRate: data.count > 0 ? data.totalAmount / data.count : 0,
    }));
  }, [trips]);

  // 2. Per Truck / Driver Report Data
  const truckData = useMemo(() => {
    const map = new Map<
      string,
      {
        truckNo: string;
        driverName: string;
        truckType: string;
        tripCount: number;
        totalAmount: number;
        destinations: Set<string>;
      }
    >();

    trips.forEach((t) => {
      const plate = t.raw.truckNo || 'ไม่ระบุทะเบียน';
      const cur = map.get(plate) || {
        truckNo: plate,
        driverName: t.raw.driverName || '-',
        truckType: t.standardTruckType,
        tripCount: 0,
        totalAmount: 0,
        destinations: new Set<string>(),
      };

      cur.tripCount += 1;
      cur.totalAmount += t.standardTripRate || 0;
      if (t.zoneLocationMatch) cur.destinations.add(t.zoneLocationMatch);
      map.set(plate, cur);
    });

    return Array.from(map.values())
      .filter((item) => {
        if (!filterSearch) return true;
        const q = filterSearch.toLowerCase();
        return (
          item.truckNo.toLowerCase().includes(q) ||
          item.driverName.toLowerCase().includes(q) ||
          item.truckType.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [trips, filterSearch]);

  // 3. Per Consignee / Company Report Data
  const companyData = useMemo(() => {
    const map = new Map<
      string,
      {
        companyName: string;
        tripCount: number;
        totalAmount: number;
        count4W: number;
        count6W: number;
        count10W: number;
      }
    >();

    trips.forEach((t) => {
      const comp = t.consigneeShipper || 'Other';
      const cur = map.get(comp) || {
        companyName: comp,
        tripCount: 0,
        totalAmount: 0,
        count4W: 0,
        count6W: 0,
        count10W: 0,
      };

      cur.tripCount += 1;
      cur.totalAmount += t.standardTripRate || 0;
      if (t.standardTruckType === '4W') cur.count4W += 1;
      if (t.standardTruckType === '6W') cur.count6W += 1;
      if (t.standardTruckType === '10W') cur.count10W += 1;

      map.set(comp, cur);
    });

    return Array.from(map.values())
      .filter((item) => {
        if (!filterSearch) return true;
        return item.companyName.toLowerCase().includes(filterSearch.toLowerCase());
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [trips, filterSearch]);

  // Export handlers
  const handleExportMonthly = () => {
    const rows = monthlyData.map((m) => [
      m.monthName,
      m.count,
      m.count4W,
      m.count6W,
      m.count10W,
      m.totalAmount,
      m.avgTripRate,
    ]);
    const headers = [
      'รอบเดือน',
      'จำนวนเที่ยวรวม',
      'รถ 4W (คัน)',
      'รถ 6W (คัน)',
      'รถ 10W (คัน)',
      'ยอดค่าขนส่งรวม (THB)',
      'ค่าขนส่งเฉลี่ยต่อเที่ยว (THB)',
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');
    XLSX.writeFile(wb, 'Monthly_Transportation_Report.xlsx');
  };

  const handleExportTruck = () => {
    const rows = truckData.map((t) => [
      t.truckNo,
      t.driverName,
      t.truckType,
      t.tripCount,
      t.totalAmount,
      Array.from(t.destinations).join(', '),
    ]);
    const headers = [
      'ทะเบียนรถ',
      'ชื่อพนักงานขับรถ',
      'ประเภทรถ',
      'จำนวนเที่ยว',
      'ยอดค่าขนส่งรวม (THB)',
      'ปลายทางที่จัดส่ง',
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Per Truck Report');
    XLSX.writeFile(wb, 'Per_Truck_Transportation_Report.xlsx');
  };

  const handleExportCompany = () => {
    const rows = companyData.map((c) => [
      c.companyName,
      c.tripCount,
      c.count4W,
      c.count6W,
      c.count10W,
      c.totalAmount,
      c.tripCount > 0 ? (c.totalAmount / c.tripCount).toFixed(2) : '0',
    ]);
    const headers = [
      'บริษัท (Consignee/Shipper)',
      'จำนวนเที่ยวรวม',
      'เที่ยว 4W',
      'เที่ยว 6W',
      'เที่ยว 10W',
      'ยอดค่าขนส่งรวม (THB)',
      'เฉลี่ยต่อเที่ยว (THB)',
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Per Company Report');
    XLSX.writeFile(wb, 'Per_Company_Transportation_Report.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            รายงานสรุปผลและสถิติ (Reports & Analytics)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            รายงานรายเดือน, รายงานรายรถ/คนขับ และรายงานแยกตามบริษัทลูกค้า พร้อม Export Excel
          </p>
        </div>

        {/* Global Export for current tab */}
        <div>
          {reportTab === 'monthly' && (
            <button
              onClick={handleExportMonthly}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel (รายเดือน)
            </button>
          )}
          {reportTab === 'truck' && (
            <button
              onClick={handleExportTruck}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel (รายรถ)
            </button>
          )}
          {reportTab === 'company' && (
            <button
              onClick={handleExportCompany}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel (รายบริษัท)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <button
          onClick={() => setReportTab('monthly')}
          className={`pb-3 px-5 border-b-2 transition-all flex items-center gap-2 ${
            reportTab === 'monthly'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>รายงานรายเดือน (Monthly Report)</span>
        </button>

        <button
          onClick={() => setReportTab('truck')}
          className={`pb-3 px-5 border-b-2 transition-all flex items-center gap-2 ${
            reportTab === 'truck'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>รายงานรายรถ / คนขับ (Per Truck / Driver)</span>
        </button>

        <button
          onClick={() => setReportTab('company')}
          className={`pb-3 px-5 border-b-2 transition-all flex items-center gap-2 ${
            reportTab === 'company'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>รายงานรายบริษัท (Per Shipper / Consignee)</span>
        </button>
      </div>

      {/* Search Filter for truck / company */}
      {reportTab !== 'monthly' && (
        <div className="max-w-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหา..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* 1. Monthly Report Table */}
      {reportTab === 'monthly' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="py-2.5 px-4">รอบเดือนบัญชี</th>
                  <th className="py-2.5 px-4 text-center">จำนวนเที่ยวรวม</th>
                  <th className="py-2.5 px-4 text-center">4W (คัน)</th>
                  <th className="py-2.5 px-4 text-center">6W (คัน)</th>
                  <th className="py-2.5 px-4 text-center">10W (คัน)</th>
                  <th className="py-2.5 px-4 text-right">ยอดค่าขนส่งรวม (THB)</th>
                  <th className="py-2.5 px-4 text-right">เฉลี่ยต่อเที่ยว (THB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {monthlyData.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {m.monthName}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {m.count} เที่ยว
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-blue-600 dark:text-blue-400">
                      {m.count4W}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-indigo-600 dark:text-indigo-400">
                      {m.count6W}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400">
                      {m.count10W}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      ฿{m.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ฿{m.avgTripRate.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Truck Report Table */}
      {reportTab === 'truck' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="py-2.5 px-4">ทะเบียนรถ</th>
                  <th className="py-2.5 px-4">พนักงานขับรถ</th>
                  <th className="py-2.5 px-4 text-center">ประเภทรถ</th>
                  <th className="py-2.5 px-4 text-center">จำนวนเที่ยว</th>
                  <th className="py-2.5 px-4 text-right">ยอดค่าขนส่งรวม (THB)</th>
                  <th className="py-2.5 px-4">ปลายทางที่ส่งบ่อย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {truckData.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {t.truckNo}
                    </td>
                    <td className="py-3 px-4">{t.driverName}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold">
                        {t.truckType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {t.tripCount} เที่ยว
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                      ฿{t.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {Array.from(t.destinations).join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Company Report Table */}
      {reportTab === 'company' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="py-2.5 px-4">บริษัท (Consignee / Shipper)</th>
                  <th className="py-2.5 px-4 text-center">จำนวนเที่ยวรวม</th>
                  <th className="py-2.5 px-4 text-center">4W (คัน)</th>
                  <th className="py-2.5 px-4 text-center">6W (คัน)</th>
                  <th className="py-2.5 px-4 text-center">10W (คัน)</th>
                  <th className="py-2.5 px-4 text-right">ยอดค่าขนส่งรวม (THB)</th>
                  <th className="py-2.5 px-4 text-right">เฉลี่ยต่อเที่ยว (THB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {companyData.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {c.companyName}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {c.tripCount} เที่ยว
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{c.count4W}</td>
                    <td className="py-3 px-4 text-center font-mono">{c.count6W}</td>
                    <td className="py-3 px-4 text-center font-mono">{c.count10W}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      ฿{c.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ฿
                      {(c.tripCount > 0 ? c.totalAmount / c.tripCount : 0).toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
