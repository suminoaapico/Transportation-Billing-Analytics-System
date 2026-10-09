import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';

const defaultFirebaseConfig = {
  projectId: "avid-wavelet-365901",
  appId: "1:453619687220:web:b510ce9b1eaaa3a1de8f61",
  apiKey: "AIzaSyA0RrB9xR3WpqmpLUBy0nrf9Oq-9XFyku8",
  authDomain: "avid-wavelet-365901.firebaseapp.com",
  storageBucket: "avid-wavelet-365901.firebasestorage.app",
  messagingSenderId: "453619687220",
  oAuthClientId: "453619687220-tiakv6vkq8jcl9mktdajff62voilmi83.apps.googleusercontent.com",
};

let app: any = null;
let auth: any = null;
let provider: any = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(defaultFirebaseConfig);
  auth = getAuth(app);
  provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
} catch (e) {
  console.warn('Firebase initialization note (offline/preview fallback):', e);
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let isDemoSession = false;
let demoUserObj: User | null = null;

import { safeLocalStorageSet } from '../utils/persistentStorage';

const DRIVE_STORAGE_KEY = 'transport_billing_drive_files_v1';

export interface AuthDomainErrorInfo {
  isUnauthorizedDomain: boolean;
  domain: string;
  projectId: string;
  consoleUrl: string;
  errorMessage: string;
}

export const checkUnauthorizedDomainError = (error: any): AuthDomainErrorInfo | null => {
  const errMsg = error?.message || '';
  const errCode = error?.code || '';
  if (
    errCode === 'auth/unauthorized-domain' ||
    errMsg.includes('auth/unauthorized-domain') ||
    errMsg.includes('unauthorized-domain')
  ) {
    const domain = typeof window !== 'undefined' ? window.location.hostname : 'transportationbilling.netlify.app';
    return {
      isUnauthorizedDomain: true,
      domain: domain || 'transportationbilling.netlify.app',
      projectId: defaultFirebaseConfig.projectId,
      consoleUrl: `https://console.firebase.google.com/project/${defaultFirebaseConfig.projectId}/authentication/settings`,
      errorMessage: 'โดเมนปัจจุบันยังไม่ได้ถูกเพิ่มใน Authorized domains ของ Firebase Authentication',
    };
  }
  return null;
};

export const createDemoUser = (customEmail = 'artkitthana12@gmail.com', customName = 'Art Kitthana (GTT Logistics)'): User => {
  return {
    uid: 'demo-user-' + Date.now(),
    email: customEmail,
    displayName: customName,
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: 'demo-refresh-token',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'demo-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'google.com',
  } as unknown as User;
};

export const demoSignIn = (email = 'artkitthana12@gmail.com', name = 'Art Kitthana (GTT Logistics)'): { user: User; accessToken: string } => {
  isDemoSession = true;
  demoUserObj = createDemoUser(email, name);
  cachedAccessToken = 'demo-drive-access-token';
  return { user: demoUserObj, accessToken: cachedAccessToken };
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (isDemoSession && demoUserObj) {
    if (onAuthSuccess) onAuthSuccess(demoUserObj, cachedAccessToken || 'demo-token');
    return () => {};
  }
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!user && !isDemoSession) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth || !provider) {
    // If Firebase is not initialized, fallback to demo sign in
    return demoSignIn();
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }
    cachedAccessToken = credential.accessToken;
    isDemoSession = false;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  if (auth && !isDemoSession) {
    await signOut(auth);
  }
  isDemoSession = false;
  demoUserObj = null;
  cachedAccessToken = null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export interface DriveUploadedFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  downloadUrl?: string;
  createdTime?: string;
  sizeBytes?: number;
  isSimulated?: boolean;
}

/**
 * Upload an Excel file buffer to Google Drive using multipart upload
 * Or simulate storage if in demo mode / offline
 */
export async function uploadExcelToGoogleDrive(
  fileName: string,
  buffer: Uint8Array
): Promise<DriveUploadedFile> {
  const token = await getAccessToken();

  // Create local blob for download link regardless
  const blob = new Blob([buffer as any], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const localBlobUrl = URL.createObjectURL(blob);

  // If in demo mode or token is simulated
  if (isDemoSession || !token || token.startsWith('demo-')) {
    const simulatedFile: DriveUploadedFile = {
      id: `drive-sim-${Date.now()}`,
      name: fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      webViewLink: localBlobUrl,
      downloadUrl: localBlobUrl,
      createdTime: new Date().toISOString(),
      sizeBytes: buffer.byteLength,
      isSimulated: true,
    };

    // Store in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem(DRIVE_STORAGE_KEY) || '[]');
      const updated = [simulatedFile, ...existing].slice(0, 20);
      safeLocalStorageSet(DRIVE_STORAGE_KEY, updated);
    } catch (e) {
      console.warn(e);
    }

    return simulatedFile;
  }

  const metadata = {
    name: fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    description: 'บันทึกรายงานค่าขนส่งอัตโนมัติจาก Transportation Billing & Analytics System',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaHeader = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata);
  const dataHeader =
    'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n';

  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  const base64Data = btoa(binary);

  const multipartRequestBody =
    delimiter +
    metaHeader +
    delimiter +
    dataHeader +
    base64Data +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Google Drive upload failed: ${response.statusText}`);
  }

  const uploaded = await response.json();
  const resultFile: DriveUploadedFile = {
    ...uploaded,
    downloadUrl: localBlobUrl,
    createdTime: new Date().toISOString(),
    sizeBytes: buffer.byteLength,
  };

  try {
    const existing = JSON.parse(localStorage.getItem(DRIVE_STORAGE_KEY) || '[]');
    const updated = [resultFile, ...existing].slice(0, 20);
    safeLocalStorageSet(DRIVE_STORAGE_KEY, updated);
  } catch (e) {
    console.warn(e);
  }

  return resultFile;
}

/**
 * List files saved in Google Drive by this application
 */
export async function listDriveFiles(): Promise<DriveUploadedFile[]> {
  const token = await getAccessToken();

  let localFiles: DriveUploadedFile[] = [];
  try {
    localFiles = JSON.parse(localStorage.getItem(DRIVE_STORAGE_KEY) || '[]');
  } catch (e) {
    localFiles = [];
  }

  if (isDemoSession || !token || token.startsWith('demo-')) {
    if (localFiles.length === 0) {
      // Seed realistic sample file in Drive
      const sampleSeed: DriveUploadedFile = {
        id: 'drive-sample-seed-01',
        name: 'Transportation_Billing_Report_2026-09-30.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        createdTime: '2026-09-30T17:30:00.000Z',
        sizeBytes: 48920,
        isSimulated: true,
      };
      localFiles = [sampleSeed];
      safeLocalStorageSet(DRIVE_STORAGE_KEY, localFiles);
    }
    return localFiles;
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime desc',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) return localFiles;
    const data = await response.json();
    return data.files || localFiles;
  } catch (err) {
    console.error('Failed to list files from Drive', err);
    return localFiles;
  }
}
