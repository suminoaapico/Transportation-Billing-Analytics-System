import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { pruneOversizedLocalStorage } from './utils/persistentStorage';

// Clean any bloated storage immediately on script evaluation to prevent QuotaExceededError
pruneOversizedLocalStorage();

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Application Error:', error, errorInfo);
    // Auto purge oversized trips key if it caused QuotaExceededError
    if (
      error?.name === 'QuotaExceededError' ||
      error?.message?.toLowerCase().includes('quota')
    ) {
      try {
        localStorage.removeItem('transport_billing_trips_v1');
      } catch (_) {}
    }
  }

  handleClearTripsAndRetry = () => {
    try {
      localStorage.removeItem('transport_billing_trips_v1');
    } catch (_) {}
    window.location.reload();
  };

  handleResetAllAndReload = () => {
    try {
      localStorage.clear();
      if (window.indexedDB) {
        indexedDB.deleteDatabase('TransportBillingDB_v1');
      }
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isQuota =
        this.state.error?.name === 'QuotaExceededError' ||
        this.state.error?.message?.toLowerCase().includes('quota');

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '1.5rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '1rem',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#ef4444',
              fontSize: '24px'
            }}>
              ⚠️
            </div>
            
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.75rem', color: '#f8fafc' }}>
              {isQuota ? 'พื้นที่จัดเก็บ LocalStorage เต็ม (Quota Exceeded)' : 'เกิดข้อผิดพลาดในการโหลดหน้าเว็บ'}
            </h2>

            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              {isQuota
                ? 'ข้อมูลเที่ยวรถหรือข้อมูลที่จัดเก็บมีขนาดใหญ่เกินโควตา LocalStorage ของเบราว์เซอร์ (5MB) ระบบได้เพิ่มระบบ IndexedDB เพื่อรองรับข้อมูลขนาดใหญ่แล้ว กรุณากดปุ่มด้านล่างเพื่อล้างข้อมูลชั่วคราวและเปิดใช้งานใหม่'
                : (this.state.error?.message || 'Unknown error occurred')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={this.handleClearTripsAndRetry}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                ล้างข้อมูลเที่ยวรถที่เกินโควตาและเปิดใช้งานทันที
              </button>

              <button
                onClick={this.handleResetAllAndReload}
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#f87171',
                  border: '1px solid #7f1d1d',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                รีเซ็ตแคชทั้งหมดและเริ่มใหม่ (ล้างแคช LocalStorage)
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
