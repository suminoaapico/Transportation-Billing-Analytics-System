/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  INITIAL_RAW_DATA,
  INITIAL_RATE_CARD_4W,
  INITIAL_RATE_CARD_6W,
  INITIAL_RATE_CARD_10W,
  INITIAL_DIESEL_PRICES,
  INITIAL_ZONE_MAPPINGS,
} from './data/seedData';
import {
  RawTripData,
  RateCardTable,
  DieselPriceRecord,
  ZoneMappingRule,
  StandardTruckType,
} from './types';
import {
  processBillingTrips,
  computeBillingSummary,
} from './services/billingCalculator';
import { fetchPTTPrice, updateOrAddDieselPrice } from './services/pttService';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  uploadExcelToGoogleDrive,
  DriveUploadedFile,
} from './services/googleDriveService';
import { getBillingReportBuffer } from './services/excelService';

import { Navbar } from './components/layout/Navbar';
import { Sidebar, PageTab } from './components/layout/Sidebar';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ImportPage } from './components/import/ImportPage';
import { BillingReportPage } from './components/billing/BillingReportPage';
import { MasterDataPage } from './components/master/MasterDataPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { GoogleDriveModal } from './components/common/GoogleDriveModal';

const STORAGE_KEYS = {
  TRIPS: 'transport_billing_trips_v1',
  RATE_CARDS: 'transport_billing_rate_cards_v1',
  DIESEL: 'transport_billing_diesel_v1',
  ZONES: 'transport_billing_zones_v1',
  DARK_MODE: 'transport_billing_dark_v1',
  CUSTOM_RATES: 'transport_billing_custom_rates_v1',
  BRACKET: 'transport_billing_bracket_v1',
};

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<PageTab>('billing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Selected Bracket Tier ('auto' or specific bracket key like 'c_30_32')
  const [selectedBracket, setSelectedBracket] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.BRACKET) || 'auto';
  });

  // Custom rate overrides per trip ID
  const [customRatesMap, setCustomRatesMap] = useState<{ [tripId: string]: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_RATES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  // Authentication State
  const [user, setUser] = useState<User | null>(null);

  // Core Data States
  const [trips, setTrips] = useState<RawTripData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRIPS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_RAW_DATA;
  });

  const [rateCards, setRateCards] = useState<{ [key in StandardTruckType]: RateCardTable }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RATE_CARDS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      '4W': INITIAL_RATE_CARD_4W,
      '6W': INITIAL_RATE_CARD_6W,
      '10W': INITIAL_RATE_CARD_10W,
    };
  });

  const [dieselPrices, setDieselPrices] = useState<DieselPriceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DIESEL);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_DIESEL_PRICES;
  });

  const [zoneMappings, setZoneMappings] = useState<ZoneMappingRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ZONES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ZONE_MAPPINGS;
  });

  // UI status
  const [isRefreshingDiesel, setIsRefreshingDiesel] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Google Drive Modal
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadedDriveFile, setUploadedDriveFile] = useState<DriveUploadedFile | null>(null);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(darkMode));
  }, [darkMode]);

  // Persist Data to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RATE_CARDS, JSON.stringify(rateCards));
  }, [rateCards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DIESEL, JSON.stringify(dieselPrices));
  }, [dieselPrices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(zoneMappings));
  }, [zoneMappings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_RATES, JSON.stringify(customRatesMap));
  }, [customRatesMap]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRACKET, selectedBracket);
  }, [selectedBracket]);

  // Toast Helper
  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch PTT Diesel Price function (called on demand or scheduled)
  const handleFetchPTTPrice = useCallback(async () => {
    setIsRefreshingDiesel(true);
    try {
      const res = await fetchPTTPrice();
      if (res.price) {
        const dateStr = res.dateStr || new Date().toLocaleDateString('th-TH');
        const updated = updateOrAddDieselPrice(dieselPrices, {
          date: dateStr,
          price: res.price,
          source: res.source,
          updatedAt: new Date().toISOString(),
        });
        setDieselPrices(updated);
        addToast(
          'success',
          'อัปเดตราคาน้ำมันสำเร็จ',
          `ราคาน้ำมันดีเซล PTT: ฿${res.price.toFixed(2)} บาท/ลิตร (${res.source})`
        );
      } else {
        throw new Error(res.error || 'ไม่สามารถดึงข้อมูลได้');
      }
    } catch (err: any) {
      addToast(
        'error',
        'ไม่สามารถดึงราคาน้ำมันแบบสดได้',
        `ใช้ฐานข้อมูลออฟไลน์ล่าสุดแทน (${err.message})`
      );
    } finally {
      setIsRefreshingDiesel(false);
    }
  }, [dieselPrices, addToast]);

  // Google Sign-in handler
  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        addToast(
          'success',
          'ลงชื่อเข้าใช้ด้วย Google สำเร็จ',
          `ยินดีต้อนรับ ${result.user.displayName || result.user.email} พร้อมใช้งาน Google Drive`
        );
      }
    } catch (err: any) {
      addToast('error', 'ลงชื่อเข้าใช้ไม่สำเร็จ', err.message);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await googleSignOut();
      setUser(null);
      addToast('info', 'ออกจากระบบแล้ว', 'ตัดการเชื่อมต่อกับ Google Drive เรียบร้อย');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Reset to Seed Data
  const handleResetSeedData = () => {
    setTrips(INITIAL_RAW_DATA);
    setRateCards({
      '4W': INITIAL_RATE_CARD_4W,
      '6W': INITIAL_RATE_CARD_6W,
      '10W': INITIAL_RATE_CARD_10W,
    });
    setDieselPrices(INITIAL_DIESEL_PRICES);
    setZoneMappings(INITIAL_ZONE_MAPPINGS);
    setCustomRatesMap({});
    setSelectedBracket('auto');
    addToast('success', 'รีเซ็ตข้อมูลสำเร็จ', 'กู้คืนข้อมูลตัวอย่างเดือนกันยายน 2026 เรียบร้อย');
  };

  // Import raw data from Excel
  const handleImportRawData = (newTrips: RawTripData[]) => {
    setTrips(newTrips);
    setCustomRatesMap({});
    setCurrentTab('billing');
    addToast(
      'success',
      'นำเข้าข้อมูลสำเร็จ',
      `เพิ่มข้อมูลเที่ยวขนส่งจำนวน ${newTrips.length} รายการ และคำนวณบิลเรียบร้อยแล้ว`
    );
  };

  // Core Billing Calculation (Memoized with manual bracket and custom rates support)
  const calculatedTrips = useMemo(() => {
    return processBillingTrips(
      trips,
      rateCards,
      dieselPrices,
      zoneMappings,
      selectedBracket === 'auto' ? undefined : selectedBracket,
      customRatesMap
    );
  }, [trips, rateCards, dieselPrices, zoneMappings, selectedBracket, customRatesMap]);

  const billingSummary = useMemo(() => {
    return computeBillingSummary(calculatedTrips);
  }, [calculatedTrips]);

  // Inline update rate for specific trip
  const handleUpdateTripRate = (tripId: string, newRate: number) => {
    setCustomRatesMap((prev) => ({
      ...prev,
      [tripId]: newRate,
    }));
    addToast('success', 'อัปเดตราคาสำเร็จ', `บันทึกเรทค่าขนส่ง ฿${newRate.toLocaleString()} เรียบร้อย`);
  };

  // Auto Resolve all 0 THB / Unmatched trips
  const handleAutoResolveAll = () => {
    let resolvedCount = 0;
    const newOverrides: { [tripId: string]: number } = { ...customRatesMap };

    calculatedTrips.forEach((t) => {
      if (t.standardTripRate === 0) {
        resolvedCount++;
        // Determine intelligent baseline rate according to truck type
        let baseRate = 2200;
        if (t.standardTruckType === '6W') baseRate = 3500;
        if (t.standardTruckType === '10W') baseRate = 5500;

        // Give distance weight bonus if outside BKK/perimeter
        const prov = (t.deliveryProvince || '').toLowerCase();
        if (prov.includes('ปราจีน') || prov.includes('ลพบุรี') || prov.includes('ระยอง') || prov.includes('ชลบุรี') || prov.includes('โคราช')) {
          baseRate += t.standardTruckType === '4W' ? 900 : 1400;
        }

        newOverrides[t.id] = baseRate;
      }
    });

    if (resolvedCount > 0) {
      setCustomRatesMap(newOverrides);
      addToast(
        'success',
        'จับคู่และประเมินราคาสำเร็จ!',
        `เติมเรทราคามาตรฐานให้ ${resolvedCount} เที่ยวขนส่งที่ยังไม่มีราคา ยอดรวมอัปเดตทันที`
      );
    } else {
      addToast('info', 'ตรวจสอบครบถ้วน', 'ทุกเที่ยวขนส่งมีราคาครบถ้วนแล้ว');
    }
  };

  // Latest diesel price
  const latestDieselPrice = useMemo(() => {
    if (dieselPrices.length === 0) return null;
    return dieselPrices[0]?.price || null;
  }, [dieselPrices]);

  // Google Drive Upload Handler (Requires explicit confirmation modal)
  const handleConfirmDriveUpload = async () => {
    if (!user) {
      handleGoogleSignIn();
      return;
    }

    setIsUploadingDrive(true);
    try {
      const buffer = getBillingReportBuffer(billingSummary, calculatedTrips);
      const fileName = `Transportation_Billing_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const uploaded = await uploadExcelToGoogleDrive(fileName, buffer);
      setUploadedDriveFile(uploaded);
      addToast(
        'success',
        'บันทึกลง Google Drive สำเร็จ!',
        `ไฟล์ ${uploaded.name} จัดเก็บบน Google Drive ของคุณเรียบร้อยแล้ว`
      );
    } catch (err: any) {
      addToast('error', 'บันทึกลง Google Drive ล้มเหลว', err.message);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-['IBM_Plex_Sans_Thai',sans-serif]">
      {/* Sidebar Overlay on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        totalTripsCount={trips.length}
        totalAmountSum={billingSummary.grandTotalAmount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Navbar Header */}
        <Navbar
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          user={user}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          latestDieselPrice={latestDieselPrice}
          onRefreshDiesel={handleFetchPTTPrice}
          isRefreshingDiesel={isRefreshingDiesel}
          globalSearch={globalSearch}
          setGlobalSearch={(val) => {
            setGlobalSearch(val);
            if (val.trim() && currentTab !== 'billing') {
              setCurrentTab('billing');
            }
          }}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              trips={calculatedTrips}
              summary={billingSummary}
              latestDieselPrice={latestDieselPrice}
              dieselHistory={dieselPrices}
              onNavigateToBilling={() => setCurrentTab('billing')}
              onNavigateToImport={() => setCurrentTab('import')}
            />
          )}

          {currentTab === 'billing' && (
            <BillingReportPage
              trips={calculatedTrips}
              summary={billingSummary}
              onOpenGoogleDriveModal={() => {
                setUploadedDriveFile(null);
                setIsDriveModalOpen(true);
              }}
              isDriveConnected={!!user}
              onGoogleSignIn={handleGoogleSignIn}
              selectedBracket={selectedBracket}
              onSelectBracket={setSelectedBracket}
              onAutoResolveAll={handleAutoResolveAll}
              onUpdateTripRate={handleUpdateTripRate}
            />
          )}

          {currentTab === 'import' && (
            <ImportPage
              onImportRawData={handleImportRawData}
              onResetSeedData={handleResetSeedData}
              currentTripsCount={trips.length}
            />
          )}

          {currentTab === 'reports' && <ReportsPage trips={calculatedTrips} />}

          {currentTab === 'master' && (
            <MasterDataPage
              rateCards={rateCards}
              onUpdateRateCards={setRateCards}
              dieselPrices={dieselPrices}
              onUpdateDieselPrices={setDieselPrices}
              zoneMappings={zoneMappings}
              onUpdateZoneMappings={setZoneMappings}
              onRefreshPTTPrice={handleFetchPTTPrice}
              isRefreshingPTT={isRefreshingDiesel}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-6 py-4 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <p>© 2026 Transportation Billing & Analytics System • GTT Logistics</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Version 5.0 (AdminLTE Theme)</span>
            <span>•</span>
            <span>SheetJS XLSX Enabled</span>
            <span>•</span>
            <span>Google Drive Sync</span>
          </div>
        </footer>
      </div>

      {/* Google Drive Upload Confirmation Modal */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        fileName={`Transportation_Billing_Report_${new Date().toISOString().slice(0, 10)}.xlsx`}
        tripCount={billingSummary.grandTotalCount}
        totalAmount={billingSummary.grandTotalAmount}
        onConfirmUpload={handleConfirmDriveUpload}
        isUploading={isUploadingDrive}
        uploadedFile={uploadedDriveFile}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
