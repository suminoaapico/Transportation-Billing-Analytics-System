import React from 'react';
import {
  LayoutDashboard,
  Upload,
  Receipt,
  Settings,
  BarChart3,
  Truck,
  HardDrive,
  CheckCircle,
} from 'lucide-react';

export type PageTab = 'dashboard' | 'import' | 'billing' | 'master' | 'reports';

interface SidebarProps {
  currentTab: PageTab;
  setCurrentTab: (tab: PageTab) => void;
  isOpen: boolean;
  totalTripsCount: number;
  totalAmountSum: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen,
  totalTripsCount,
}) => {
  const navItems: { id: PageTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'แดชบอร์ด (Dashboard)',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'billing',
      label: 'รายงานค่าขนส่ง (Billing Report)',
      icon: <Receipt className="w-5 h-5" />,
      badge: `${totalTripsCount}`,
    },
    {
      id: 'import',
      label: 'นำเข้าข้อมูล (Import Data)',
      icon: <Upload className="w-5 h-5" />,
    },
    {
      id: 'reports',
      label: 'รายงานวิเคราะห์ (Reports)',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'master',
      label: 'ข้อมูลหลัก (Master Data)',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static`}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-600/30">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider uppercase text-white block">
              GTT LOGISTICS
            </span>
            <span className="text-[10px] text-blue-400 font-medium block">
              Billing & Analytics System
            </span>
          </div>
        </div>

        {/* User Mini Profile / System status */}
        <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px]">System Online</span>
          </div>
          <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
            v5.0 AdminLTE
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main Navigation
          </div>

          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Workspace Integrations
          </div>

          <div className="px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-[11px] text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              <HardDrive className="w-4 h-4" />
              <span>Google Drive Ready</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              รองรับการส่งออกไฟล์และสำรองข้อมูลขึ้นระบบคลาวด์ Google Drive อัตโนมัติ
            </p>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/20">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Database Loaded
            </span>
            <span className="font-mono text-[10px] text-slate-300">{totalTripsCount} รายการ</span>
          </div>
          <p className="text-[10px] text-slate-500">
            ระบบตรวจสอบค่าขนส่งอัตโนมัติ © 2026
          </p>
        </div>
      </aside>
    </>
  );
};
