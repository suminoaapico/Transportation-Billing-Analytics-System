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

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!user) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth || !provider) {
    throw new Error('Google Authentication service is not initialized');
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  if (auth) {
    await signOut(auth);
  }
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
  createdTime?: string;
}

/**
 * Upload an Excel file buffer to Google Drive using multipart upload
 */
export async function uploadExcelToGoogleDrive(
  fileName: string,
  buffer: Uint8Array
): Promise<DriveUploadedFile> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วย Google ก่อนบันทึกลง Google Drive');
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

  return await response.json();
}

/**
 * List files saved in Google Drive by this application
 */
export async function listDriveFiles(): Promise<DriveUploadedFile[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime desc',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.files || [];
  } catch (err) {
    console.error('Failed to list files from Drive', err);
    return [];
  }
}
