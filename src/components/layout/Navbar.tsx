import React, { useState } from 'react';
import {
  Menu,
  Moon,
  Sun,
  Fuel,
  RefreshCw,
  LogOut,
  ChevronDown,
  Search,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  toggleSidebar: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  user: User | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  latestDieselPrice: number | null;
  onRefreshDiesel: () => void;
  isRefreshingDiesel: boolean;
  globalSearch: string;
  setGlobalSearch: (val: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  toggleSidebar,
  darkMode,
  setDarkMode,
  user,
  onGoogleSignIn,
  onGoogleSignOut,
  latestDieselPrice,
  onRefreshDiesel,
  isRefreshingDiesel,
  globalSearch,
  setGlobalSearch,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 flex items-center justify-between px-4 sm:px-6 shadow-xs transition-colors">
      {/* Left: Sidebar toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-hidden transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight flex items-center gap-2">
            <span>ระบบจัดการและวิเคราะห์ค่าขนส่ง</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              AdminLTE 5
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transportation Billing & Analytics System
          </p>
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-xs mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหา Job No, Trip No, บริษัท..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700/60 border border-transparent focus:border-blue-500 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* PTT Diesel Price Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200 text-xs">
          <Fuel className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="hidden lg:inline text-[11px] font-medium text-slate-600 dark:text-slate-400">
            ดีเซล PTT:
          </span>
          <span className="font-bold text-amber-700 dark:text-amber-300">
            {latestDieselPrice ? `${latestDieselPrice.toFixed(2)}` : '38.39'}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">฿/L</span>
          <button
            onClick={onRefreshDiesel}
            disabled={isRefreshingDiesel}
            title="อัปเดตราคาดีเซลล่าสุดจาก PTT (fetchPTTPrice)"
            className="p-1 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 rounded transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingDiesel ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title={darkMode ? 'เปิดโหมดสว่าง' : 'เปิดโหมดกลางคืน'}
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Google Workspace / Drive Authentication */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-blue-500"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden md:block max-w-[120px] truncate">
                {user.displayName || user.email}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-xs">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    เชื่อมต่อ Google Drive แล้ว
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onGoogleSignOut();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onGoogleSignIn}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 transition-all shadow-xs"
            title="ลงชื่อเข้าใช้ด้วย Google เพื่อสำรองข้อมูลลง Google Drive"
          >
            {/* Official Google 'G' icon */}
            <svg className="w-4 h-4" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span className="hidden sm:inline">Sign in Google</span>
          </button>
        )}
      </div>
    </header>
  );
};
