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
  INITIAL_RATE_CARD_OD4,
  INITIAL_RATE_CARD_OD6,
  INITIAL_DIESEL_PRICES,
  INITIAL_ZONE_MAPPINGS,
  generateFullMonthSimulatedTrips,
  INITIAL_QUOTATIONS,
  INITIAL_FIXED_DIESEL_CUSTOMERS,
} from './data/seedData';
import {
  RawTripData,
  RateCardTable,
  DieselPriceRecord,
  ZoneMappingRule,
  StandardTruckType,
  QuotationSchema,
  FixedDieselCustomer,
} from './types';
import {
  processBillingTrips,
  computeBillingSummary,
} from './services/billingCalculator';
import { fetchPTTPrice, updateOrAddDieselPrice, fetchLiveOilPrices, LiveOilProduct } from './services/pttService';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  uploadExcelToGoogleDrive,
  DriveUploadedFile,
  checkUnauthorizedDomainError,
  demoSignIn,
  AuthDomainErrorInfo,
} from './services/googleDriveService';
import { getBillingReportBuffer } from './services/excelService';

import { Navbar } from './components/layout/Navbar';
import { Sidebar, PageTab } from './components/layout/Sidebar';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ImportPage } from './components/import/ImportPage';
import { BillingReportPage } from './components/billing/BillingReportPage';
import { MasterDataPage } from './components/master/MasterDataPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { PriceComparisonPage } from './components/reconciliation/PriceComparisonPage';
import { UserManualPage } from './components/manual/UserManualPage';
import { getRealisticDiffCheckSampleTrips } from './services/sampleFilesService';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { GoogleDriveModal } from './components/common/GoogleDriveModal';
import { QuotationUploadModal } from './components/quotation/QuotationUploadModal';
import { UnauthorizedDomainModal } from './components/common/UnauthorizedDomainModal';
import { SupabaseSyncModal } from './components/common/SupabaseSyncModal';
import {
  saveTripsToSupabase,
  saveRawDataRecordsToSupabase,
} from './services/supabaseService';
import {
  idbGet,
  idbSet,
  idbRemove,
  safeLocalStorageSet,
  safeLocalStorageRemove,
  pruneOversizedLocalStorage,
} from './utils/persistentStorage';

// Immediately prune any oversized items from previous sessions
pruneOversizedLocalStorage();

const STORAGE_KEYS = {
  TRIPS: 'transport_billing_trips_v1',
  RATE_CARDS: 'transport_billing_rate_cards_v1',
  DIESEL: 'transport_billing_diesel_v1',
  ZONES: 'transport_billing_zones_v1',
  DARK_MODE: 'transport_billing_dark_v1',
  CUSTOM_RATES: 'transport_billing_custom_rates_v1',
  BRACKET: 'transport_billing_bracket_v1',
  QUOTATIONS: 'transport_billing_quotations_v1',
  FIXED_CUSTOMERS: 'transport_billing_fixed_customers_v1',
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

  // Core Data States - Default strictly 0 trips unless real data imported
  const [trips, setTrips] = useState<RawTripData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRIPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if this was the old mock dataset (starts with raw-1 or mock-)
          const isOldMock = parsed.every((t: any) => t.id && (t.id.startsWith('raw-') || t.id.startsWith('sim-')));
          if (isOldMock) {
            safeLocalStorageRemove(STORAGE_KEYS.TRIPS);
            return [];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Asynchronously restore trips from IndexedDB (handles high-volume datasets)
  useEffect(() => {
    idbGet<RawTripData[]>(STORAGE_KEYS.TRIPS).then((idbTrips) => {
      if (idbTrips && Array.isArray(idbTrips) && idbTrips.length > 0) {
        setTrips((curr) => (curr.length === 0 ? idbTrips : curr));
      }
    }).catch((e) => {
      console.warn('Could not read trips from IndexedDB:', e);
    });
  }, []);

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
      'OD4': INITIAL_RATE_CARD_OD4,
      'OD6': INITIAL_RATE_CARD_OD6,
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

  // Quotation and Fixed Contract Data States
  const [quotations, setQuotations] = useState<QuotationSchema[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_QUOTATIONS;
  });

  const [fixedCustomers, setFixedCustomers] = useState<FixedDieselCustomer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FIXED_CUSTOMERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_FIXED_DIESEL_CUSTOMERS;
  });

  const [dieselMethod, setDieselMethod] = useState<'monthly_avg' | 'daily_spot'>('monthly_avg');
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);

  // UI status
  const [isRefreshingDiesel, setIsRefreshingDiesel] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Google Drive Modal
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadedDriveFile, setUploadedDriveFile] = useState<DriveUploadedFile | null>(null);

  // Supabase Cloud Modal
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Unauthorized Domain (Firebase / Netlify) State
  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState<AuthDomainErrorInfo | null>(null);
  const [isUnauthorizedDomainModalOpen, setIsUnauthorizedDomainModalOpen] = useState(false);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    safeLocalStorageSet(STORAGE_KEYS.DARK_MODE, String(darkMode));
  }, [darkMode]);

  // Persist Data to IndexedDB (virtually unlimited quota) and safely to LocalStorage if small
  useEffect(() => {
    if (trips.length === 0) {
      idbRemove(STORAGE_KEYS.TRIPS).catch(console.warn);
      safeLocalStorageRemove(STORAGE_KEYS.TRIPS);
    } else {
      idbSet(STORAGE_KEYS.TRIPS, trips).catch(console.warn);
      // For LocalStorage, only store if modest size to guarantee 0 quota errors
      if (trips.length <= 500) {
        safeLocalStorageSet(STORAGE_KEYS.TRIPS, trips);
      } else {
        // Free LocalStorage space for large datasets
        safeLocalStorageRemove(STORAGE_KEYS.TRIPS);
      }
    }
  }, [trips]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.RATE_CARDS, rateCards);
  }, [rateCards]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.DIESEL, dieselPrices);
  }, [dieselPrices]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ZONES, zoneMappings);
  }, [zoneMappings]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.QUOTATIONS, quotations);
  }, [quotations]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.FIXED_CUSTOMERS, fixedCustomers);
  }, [fixedCustomers]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.CUSTOM_RATES, customRatesMap);
  }, [customRatesMap]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.BRACKET, selectedBracket);
  }, [selectedBracket]);

  // Toast Helper
  const addToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type: type as any, title, message }]);
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
      console.error('Sign in error:', err);
      const domainErr = checkUnauthorizedDomainError(err);
      if (domainErr) {
        setUnauthorizedDomainError(domainErr);
        setIsUnauthorizedDomainModalOpen(true);
      } else {
        addToast('error', 'ลงชื่อเข้าใช้ไม่สำเร็จ', err.message);
      }
    }
  };

  // Demo Sign-in Bypass (for Netlify testing without Firebase domain setup)
  const handleDemoSignIn = () => {
    const demo = demoSignIn();
    setUser(demo.user);
    addToast(
      'success',
      'เข้าสู่ระบบโหมดทดสอบสำเร็จ (Demo Google Drive)',
      `ยินดีต้อนรับ ${demo.user.displayName} พร้อมใช้งาน Google Drive และดาวน์โหลดไฟล์ตัวอย่างทันที`
    );
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

  // Reset and Clear all trips to 0
  const handleClearAllTrips = () => {
    setTrips([]);
    setCustomRatesMap({});
    idbRemove(STORAGE_KEYS.TRIPS).catch(console.warn);
    safeLocalStorageRemove(STORAGE_KEYS.TRIPS);
    safeLocalStorageRemove(STORAGE_KEYS.CUSTOM_RATES);
    addToast('info', 'ล้างข้อมูลเป็น 0 เรียบร้อย', 'เคลียร์รายการเที่ยวรถทั้งหมดเป็น 0 รายการ พร้อมสำหรับนำเข้าไฟล์ใหม่');
  };

  // Reset to Clean Slate (0 trips)
  const handleResetSeedData = () => {
    setTrips([]);
    setRateCards({
      '4W': INITIAL_RATE_CARD_4W,
      '6W': INITIAL_RATE_CARD_6W,
      '10W': INITIAL_RATE_CARD_10W,
      'OD4': INITIAL_RATE_CARD_OD4,
      'OD6': INITIAL_RATE_CARD_OD6,
    });
    setDieselPrices(INITIAL_DIESEL_PRICES);
    setZoneMappings(INITIAL_ZONE_MAPPINGS);
    setCustomRatesMap({});
    setSelectedBracket('auto');
    idbRemove(STORAGE_KEYS.TRIPS).catch(console.warn);
    safeLocalStorageRemove(STORAGE_KEYS.TRIPS);
    safeLocalStorageRemove(STORAGE_KEYS.CUSTOM_RATES);
    addToast('success', 'ล้างข้อมูลเป็น 0 เรียบร้อย', 'เคลียร์ข้อมูลเที่ยวรถเป็น 0 รายการ และรีเซ็ต Rate Card เป็นค่ามาตรฐาน');
  };

  // Import raw data from Excel & Auto Sync to Supabase
  const handleImportRawData = (newTrips: RawTripData[]) => {
    setTrips(newTrips);
    setCustomRatesMap({});
    setCurrentTab('billing');
    addToast(
      'success',
      'นำเข้าข้อมูลสำเร็จ',
      `เพิ่มข้อมูลเที่ยวขนส่งจำนวน ${newTrips.length} รายการ และคำนวณบิลเรียบร้อยแล้ว`
    );

    // Auto-sync into Supabase Cloud in background
    Promise.all([
      saveTripsToSupabase(newTrips),
      saveRawDataRecordsToSupabase(newTrips),
    ])
      .then(([tripsRes, rawRes]) => {
        if (!tripsRes.error && !rawRes.error) {
          addToast(
            'success',
            'Supabase Auto Sync',
            `บันทึกข้อมูลดิบ ${newTrips.length} รายการ เข้าฐานข้อมูล Supabase เรียบร้อยแล้ว`
          );
        }
      })
      .catch((err) => {
        console.warn('Auto sync trips to Supabase error:', err);
      });
  };

  // Full Month Simulated dataset handler
  const handleLoadFullMonthSimulated = () => {
    const fullTrips = generateFullMonthSimulatedTrips();
    setTrips(fullTrips);
    setCustomRatesMap({});
    addToast(
      'success',
      'จำลองข้อมูลเต็มเดือนสำเร็จ',
      `โหลดชุดข้อมูลจำลอง ${fullTrips.length} เที่ยวเรียบร้อย ยอดค่าขนส่งรวมปรับตามข้อมูลทั้งเดือน`
    );
  };

  // Add new trip manually
  const handleAddNewTrip = (newTrip: RawTripData) => {
    setTrips((prev) => [newTrip, ...prev]);
    addToast('success', 'เพิ่มเที่ยวรถใหม่สำเร็จ', `บันทึก Job: ${newTrip.jobNo} ในระบบเรียบร้อย`);
  };

  // Delete trip
  const handleDeleteTrip = (tripId: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
    addToast('info', 'ลบเที่ยวรถแล้ว', 'ลบรายการเที่ยวขนส่งออกจากระบบเรียบร้อย');
  };

  // Real-time oil state and handlers
  const [liveProducts, setLiveProducts] = useState<LiveOilProduct[]>([]);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);

  const handleFetchAllLivePrices = useCallback(async () => {
    setIsRefreshingLive(true);
    try {
      const live = await fetchLiveOilPrices();
      if (live.products && live.products.length > 0) {
        setLiveProducts(live.products);
        if (live.primaryDieselPrice) {
          const dateStr = live.dateStr || new Date().toLocaleDateString('th-TH');
          const updated = updateOrAddDieselPrice(dieselPrices, {
            date: dateStr,
            price: live.primaryDieselPrice,
            source: 'Bangchak Live API',
            updatedAt: new Date().toISOString(),
          });
          setDieselPrices(updated);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingLive(false);
    }
  }, [dieselPrices]);

  useEffect(() => {
    handleFetchAllLivePrices();
  }, []);

  const handleSelectDieselPrice = (price: number, name: string) => {
    const today = new Date();
    const dateFormatted = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const updated = updateOrAddDieselPrice(dieselPrices, {
      date: dateFormatted,
      price,
      source: `Bangchak ${name}`,
      updatedAt: new Date().toISOString(),
    });
    setDieselPrices(updated);
    addToast('success', 'ปรับใช้ราคาน้ำมันสำเร็จ', `นำราคา ${name} ฿${price.toFixed(2)} บาท/ลิตร ไปใช้ในระบบเรียบร้อย`);
  };

  // Core Billing Calculation (Memoized with manual bracket and custom rates support)
  const calculatedTrips = useMemo(() => {
    return processBillingTrips(
      trips,
      rateCards,
      dieselPrices,
      zoneMappings,
      selectedBracket === 'auto' ? undefined : selectedBracket,
      customRatesMap,
      quotations,
      fixedCustomers,
      dieselMethod
    );
  }, [trips, rateCards, dieselPrices, zoneMappings, selectedBracket, customRatesMap, quotations, fixedCustomers, dieselMethod]);

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
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
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
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
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
              onNavigateToMaster={() => setCurrentTab('master')}
              onNavigateToReconciliation={() => setCurrentTab('reconciliation')}
              onSimulateFullMonthTrips={handleLoadFullMonthSimulated}
              onResetToSeedData={handleResetSeedData}
              liveProducts={liveProducts}
              onRefreshLivePrices={handleFetchAllLivePrices}
              isRefreshingLivePrices={isRefreshingLive}
              onSelectDieselPrice={handleSelectDieselPrice}
              onOpenDriveModal={() => setIsDriveModalOpen(true)}
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
              onAddNewTrip={handleAddNewTrip}
              onDeleteTrip={handleDeleteTrip}
              onSimulateFullMonthTrips={handleLoadFullMonthSimulated}
              onResetToSeedData={handleResetSeedData}
              onOpenQuotationUpload={() => setIsQuotationModalOpen(true)}
              dieselMethod={dieselMethod}
              onSelectDieselMethod={setDieselMethod}
              onClearTrips={handleClearAllTrips}
              onNavigateToReconciliation={() => setCurrentTab('reconciliation')}
            />
          )}

          {currentTab === 'reconciliation' && (
            <PriceComparisonPage
              calculatedTrips={calculatedTrips}
              rawTrips={trips}
              onOpenMasterData={() => setCurrentTab('master')}
              onOpenQuotationUpload={() => setIsQuotationModalOpen(true)}
              onImportTrips={(newTrips) => {
                setTrips(newTrips);
                setCustomRatesMap({});
                addToast('success', 'นำเข้าข้อมูลสำหรับ Diff Check สำเร็จ', `อัปเดตข้อมูลเที่ยวรถ ${newTrips.length} รายการ เรียบร้อยแล้ว`);
              }}
              onNavigateToImport={() => setCurrentTab('import')}
              onLoadSampleDiffData={() => {
                const sample = getRealisticDiffCheckSampleTrips();
                setTrips(sample);
                setCustomRatesMap({});
                addToast('success', 'โหลดข้อมูลตัวอย่างสำหรับ Diff Check สำเร็จ', `นำเข้าข้อมูลตัวอย่าง ${sample.length} เที่ยว พร้อมยอดสาขาสำหรับเปรียบเทียบเรียบร้อย`);
              }}
              onClearTrips={handleClearAllTrips}
            />
          )}

          {currentTab === 'manual' && <UserManualPage />}

          {currentTab === 'quotation' && (
            <MasterDataPage
              rateCards={rateCards}
              onUpdateRateCards={setRateCards}
              dieselPrices={dieselPrices}
              onUpdateDieselPrices={setDieselPrices}
              zoneMappings={zoneMappings}
              onUpdateZoneMappings={setZoneMappings}
              onRefreshPTTPrice={handleFetchPTTPrice}
              isRefreshingPTT={isRefreshingDiesel}
              quotations={quotations}
              onUpdateQuotations={(newQ) => setQuotations(newQ)}
              fixedCustomers={fixedCustomers}
              onUpdateFixedCustomers={(newF) => setFixedCustomers(newF)}
              initialTab="quotation"
            />
          )}

          {currentTab === 'import' && (
            <ImportPage
              onImportRawData={handleImportRawData}
              onResetSeedData={handleResetSeedData}
              onClearTrips={handleClearAllTrips}
              currentTripsCount={trips.length}
              onNavigateToReconciliation={() => setCurrentTab('reconciliation')}
              onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
              dieselPrices={dieselPrices}
              onUpdateDieselPrices={setDieselPrices}
              rateCards={rateCards}
              onUpdateRateCards={setRateCards}
              addToast={addToast}
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
              quotations={quotations}
              onUpdateQuotations={(newQ) => setQuotations(newQ)}
              fixedCustomers={fixedCustomers}
              onUpdateFixedCustomers={(newF) => setFixedCustomers(newF)}
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

      {/* Quotation Upload & AI OCR Modal */}
      {isQuotationModalOpen && (
        <QuotationUploadModal
          isOpen={isQuotationModalOpen}
          onClose={() => setIsQuotationModalOpen(false)}
          onSaveQuotation={(newQ) => {
            setQuotations((prev) => [newQ, ...prev]);
            addToast(
              'success',
              'บันทึกใบเสนอราคาสำเร็จ!',
              `เชื่อมโยงเงื่อนไขของ ${newQ.companyName} (สาขา${newQ.branch}) เข้าสู่ระบบเรียบร้อย`
            );
          }}
        />
      )}

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

      {/* Unauthorized Domain Modal for Netlify / Firebase */}
      <UnauthorizedDomainModal
        isOpen={isUnauthorizedDomainModalOpen}
        onClose={() => setIsUnauthorizedDomainModalOpen(false)}
        errorInfo={unauthorizedDomainError}
        onDemoSignIn={handleDemoSignIn}
      />

      {/* Supabase Cloud Sync & SQL Schema Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        trips={trips}
        setTrips={setTrips}
        dieselPrices={dieselPrices}
        setDieselPrices={setDieselPrices}
        rateCards={rateCards}
        setRateCards={setRateCards}
        zoneMappings={zoneMappings}
        setZoneMappings={setZoneMappings}
        quotations={quotations}
        setQuotations={setQuotations}
        fixedCustomers={fixedCustomers}
        setFixedCustomers={setFixedCustomers}
        addToast={addToast}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
