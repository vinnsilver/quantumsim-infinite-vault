/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu,
  Phone,
  FileText,
  KeyRound,
  Image as ImageIcon,
  Video,
  FolderArchive,
  AppWindow,
  Search,
  Plus,
  Shield,
  Lock,
  Unlock,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Database,
  Globe,
  Wifi,
  Battery,
  HardDrive,
  User,
  Folder,
  FileCheck,
  Sparkles,
  Terminal,
  Activity,
  ChevronRight,
  Filter,
  CheckCircle2,
  Share2,
  LockKeyhole,
  Power,
  Play,
  Mail,
  Send,
  Wand2,
  Edit3,
  Layers,
  Palette,
  Crop,
  SlidersHorizontal,
  UploadCloud
} from 'lucide-react';

import avatarImg from './assets/images/quantum_sim_avatar_1790184849681.jpg';
import cyberImg from './assets/images/cyber_landscape_photo_1790184862070.jpg';

interface VaultFile {
  id: string;
  name: string;
  size: string;
  type: string;
  date: string;
  category: string;
  url?: string;
}

interface PhotoItem {
  id: string;
  title: string;
  url: string;
  size: string;
  date: string;
}

interface VideoItem {
  id: string;
  title: string;
  url: string;
  size: string;
  date: string;
  duration: string;
}

interface AppItem {
  id: string;
  name: string;
  version: string;
  size: string;
  platform: string;
  date: string;
  iconType: string;
  url?: string;
}

interface InboundEmail {
  id: string;
  sender: string;
  subject: string;
  attachmentName: string;
  date: string;
  status: string;
}

const readVaultValue = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

type PersistedItem<T> = T & { _storedBlob?: Blob };

interface PersistedVault {
  files: PersistedItem<VaultFile>[];
  videos: PersistedItem<VideoItem>[];
  apps: PersistedItem<AppItem>[];
  photos: PersistedItem<PhotoItem>[];
  inboundEmails: InboundEmail[];
}

const openVaultDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!('indexedDB' in window)) {
    reject(new Error('This browser does not support persistent local storage.'));
    return;
  }

  const request = window.indexedDB.open('quantumsim-infinite-vault', 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains('vault')) {
      request.result.createObjectStore('vault');
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Could not open local vault storage.'));
});

const restoreItems = <T extends { url?: string }>(items: PersistedItem<T>[] = []): T[] => items.map((item) => {
  const { _storedBlob, ...rest } = item;
  if (_storedBlob instanceof Blob && typeof URL.createObjectURL === 'function') {
    return { ...rest, url: URL.createObjectURL(_storedBlob) } as T;
  }
  return rest as T;
});

const prepareItemsForStorage = async <T extends { url?: string }>(items: T[]): Promise<PersistedItem<T>[]> => Promise.all(
  items.map(async (item) => {
    if (!item.url?.startsWith('blob:')) return item;
    try {
      const response = await fetch(item.url);
      if (!response.ok) return item;
      return { ...item, _storedBlob: await response.blob() };
    } catch {
      return item;
    }
  }),
);

const loadPersistedVault = async (): Promise<PersistedVault | undefined> => {
  const db = await openVaultDatabase();
  try {
    return await new Promise<PersistedVault | undefined>((resolve, reject) => {
      const transaction = db.transaction('vault', 'readonly');
      const request = transaction.objectStore('vault').get('data');
      request.onsuccess = () => resolve(request.result as PersistedVault | undefined);
      request.onerror = () => reject(request.error ?? new Error('Could not read local vault data.'));
    });
  } finally {
    db.close();
  }
};

const savePersistedVault = async (vault: {
  files: VaultFile[];
  videos: VideoItem[];
  apps: AppItem[];
  photos: PhotoItem[];
  inboundEmails: InboundEmail[];
}) => {
  const db = await openVaultDatabase();
  try {
    const record: PersistedVault = {
      files: await prepareItemsForStorage(vault.files),
      videos: await prepareItemsForStorage(vault.videos),
      apps: await prepareItemsForStorage(vault.apps),
      photos: await prepareItemsForStorage(vault.photos),
      inboundEmails: vault.inboundEmails,
    };

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('vault', 'readwrite');
      transaction.objectStore('vault').put(record, 'data');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save local vault data.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Saving local vault data was interrupted.'));
    });
  } finally {
    db.close();
  }
};

export default function App() {
  const [isLaunched, setIsLaunched] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [keyError, setKeyError] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'email-sync' | 'ai-editor' | 'apps' | 'videos' | 'photos' | 'files'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // AI Editor state
  const [editorMode, setEditorMode] = useState<'photo' | 'video'>('photo');
  const [selectedMediaForEdit, setSelectedMediaForEdit] = useState<string>(avatarImg);
  const [editFilter, setEditFilter] = useState<'cyberpunk' | 'quantum' | 'noir' | 'hdr' | 'neon'>('cyberpunk');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiOutputResult, setAiOutputResult] = useState<string | null>(null);

  // Persistent Storage State via localStorage
  const [files, setFiles] = useState<VaultFile[]>(() => {
    const saved = readVaultValue('quantum_sim_files');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      { id: 'f1', name: 'Legal_Contract_2026.pdf', size: '2.4 MB', type: 'PDF', date: '2026-09-23', category: 'Email Sync' },
      { id: 'f2', name: 'Neural_Encryption_Keys_v9.pem', size: '4.2 MB', type: 'PEM', date: '2026-09-22', category: 'Security' },
    ];
  });

  const [videos, setVideos] = useState<VideoItem[]>(() => {
    const saved = readVaultValue('quantum_sim_videos');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      { id: 'v1', title: 'Orbital Station Docking 4K.mp4', url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-code-31910-large.mp4', size: '142.5 MB', date: '2026-09-22', duration: '03:45' },
    ];
  });

  const [apps, setApps] = useState<AppItem[]>(() => {
    const saved = readVaultValue('quantum_sim_apps');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      { id: 'a1', name: 'QuantumSync_Neural_OS.apk', version: 'v9.4.1', size: '85.4 MB', platform: 'Android / eSIM', date: '2026-09-23', iconType: 'app' },
      { id: 'a2', name: 'Photos_Archive.zip', version: 'v1.0', size: '340.2 MB', platform: 'SIM Archive', date: '2026-09-22', iconType: 'folder' },
    ];
  });

  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    const saved = readVaultValue('quantum_sim_photos');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      { id: 'ph1', title: 'Cybernetic Core Insignia', url: avatarImg, size: '3.4 MB', date: '2026-09-23' },
      { id: 'ph2', title: 'Neo-Tokyo Orbital Skyline', url: cyberImg, size: '8.9 MB', date: '2026-09-22' },
    ];
  });

  const [inboundEmails, setInboundEmails] = useState<InboundEmail[]>(() => {
    const saved = readVaultValue('quantum_sim_emails');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      { id: 'e1', sender: 'stopervinn@gmail.com', subject: 'Inbound SIM Backup & Contracts', attachmentName: 'Legal_Contract_2026.pdf', date: '2026-09-23 13:40', status: 'Synced' },
    ];
  });

  const [persistenceReady, setPersistenceReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'unavailable'>('saving');
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let isMounted = true;
    loadPersistedVault()
      .then((saved) => {
        if (!isMounted) return;
        if (saved) {
          setFiles(restoreItems(saved.files));
          setVideos(restoreItems(saved.videos));
          setApps(restoreItems(saved.apps));
          setPhotos(restoreItems(saved.photos));
          setInboundEmails(saved.inboundEmails ?? []);
        }
        setSaveStatus('saved');
        setPersistenceReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setSaveStatus('unavailable');
        setPersistenceReady(true);
      });

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!persistenceReady) return;

    const snapshot = { files, videos, apps, photos, inboundEmails };
    setSaveStatus('saving');
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => savePersistedVault(snapshot))
      .then(() => setSaveStatus('saved'))
      .catch(() => setSaveStatus('unavailable'));
  }, [persistenceReady, files, videos, apps, photos, inboundEmails]);

  const [emailSubjectInput, setEmailSubjectInput] = useState('');
  const [selectedDeviceFiles, setSelectedDeviceFiles] = useState<File[]>([]);

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessKeyInput === '4246SilVer0700') {
      setIsLaunched(true);
      setShowKeypad(false);
      setKeyError(false);
    } else {
      setKeyError(true);
    }
  };

  const downloadItem = (url: string | undefined, filename: string) => {
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob([`QuantumSIM Vault Export Data\nItem: ${filename}\nTimestamp: ${new Date().toISOString()}`], { type: 'text/plain' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }
  };

  const handleDownloadAllBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      email: 'stopervinn@gmail.com',
      photos,
      videos,
      apps,
      files,
      inboundEmails
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuantumSIM_Complete_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Complete QuantumSIM website backup and data downloaded successfully!');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const backupFile = input.files?.[0];
    if (!backupFile) return;

    try {
      if (!window.confirm('Importing a backup replaces the current vault data in this browser. Continue?')) return;
      const backup = JSON.parse(await backupFile.text());
      if (![backup.apps, backup.files, backup.photos, backup.videos, backup.inboundEmails].every(Array.isArray)) {
        throw new Error('This file is not a complete QuantumSIM backup.');
      }
      setApps(backup.apps);
      setFiles(backup.files);
      setPhotos(backup.photos);
      setVideos(backup.videos);
      setInboundEmails(backup.inboundEmails);
      alert('Backup imported into this browser.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not read this backup file.');
    } finally {
      input.value = '';
    }
  };

  const handleGeneralUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      const newPhotos: PhotoItem[] = [];
      const newVids: VideoItem[] = [];
      const newFiles: VaultFile[] = [];
      const newApps: AppItem[] = [];

      fileList.forEach((file, idx) => {
        const fileUrl = URL.createObjectURL(file);
        const sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        const dateStr = new Date().toISOString().split('T')[0];
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp') || lowerName.endsWith('.gif')) {
          newPhotos.push({
            id: `${Date.now()}-${idx}`,
            title: file.name,
            url: fileUrl,
            size: sizeStr,
            date: dateStr,
          });
        } else if (lowerName.endsWith('.mp4') || lowerName.endsWith('.mov') || lowerName.endsWith('.webm') || lowerName.endsWith('.avi')) {
          newVids.push({
            id: `${Date.now()}-${idx}`,
            title: file.name,
            url: fileUrl,
            size: sizeStr,
            date: dateStr,
            duration: '03:00',
          });
        } else if (lowerName.endsWith('.apk') || lowerName.endsWith('.zip') || lowerName.endsWith('.rar') || lowerName.endsWith('.exe') || lowerName.endsWith('.app') || lowerName.endsWith('.dmg')) {
          newApps.push({
            id: `${Date.now()}-${idx}`,
            name: file.name,
            version: 'v1.0',
            size: sizeStr,
            platform: 'Cross-Device Software',
            date: dateStr,
            iconType: lowerName.endsWith('.zip') || lowerName.endsWith('.rar') ? 'folder' : 'app',
            url: fileUrl
          });
        } else {
          newFiles.push({
            id: `${Date.now()}-${idx}`,
            name: file.name,
            size: sizeStr,
            type: file.name.split('.').pop()?.toUpperCase() || 'DAT',
            date: dateStr,
            category: 'Universal Upload',
            url: fileUrl,
          });
        }
      });

      if (newPhotos.length > 0) {
        setPhotos(prev => [...newPhotos, ...prev]);
      }
      if (newVids.length > 0) {
        setVideos(prev => [...newVids, ...prev]);
      }
      if (newFiles.length > 0) {
        setFiles(prev => [...newFiles, ...prev]);
      }
      if (newApps.length > 0) {
        setApps(prev => [...newApps, ...prev]);
      }

      setShowUploadModal(false);
      alert(`Added ${fileList.length} app/document/media item(s) to this browser's vault.`);
    }
  };

  const deleteApp = (id: string) => {
    setApps(apps.filter(a => a.id !== id));
  };

  const deleteFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const deletePhoto = (id: string) => {
    setPhotos(photos.filter(ph => ph.id !== id));
  };

  const deleteVideo = (id: string) => {
    setVideos(videos.filter(v => v.id !== id));
  };

  const deleteAllVideos = () => {
    if (window.confirm('Are you sure you want to delete ALL saved videos?')) {
      setVideos([]);
      alert('All saved videos have been successfully deleted.');
    }
  };

  const deleteAllData = () => {
    if (window.confirm('Are you sure you want to delete ALL saved apps, documents, photos, and videos from this website?')) {
      setApps([]);
      setFiles([]);
      setPhotos([]);
      setVideos([]);
      alert('All saved data has been successfully deleted.');
    }
  };

  const handleSyncEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmailEntry: InboundEmail = {
      id: Date.now().toString(),
      sender: 'stopervinn@gmail.com',
      subject: emailSubjectInput || 'Direct Inbound Attachment Sync',
      attachmentName: selectedDeviceFiles.length > 0 ? selectedDeviceFiles[0].name : 'Email_Attachment.dat',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Synced to SIM',
    };
    setInboundEmails([newEmailEntry, ...inboundEmails]);

    const syncedFile: VaultFile = {
      id: Date.now().toString(),
      name: newEmailEntry.attachmentName,
      size: selectedDeviceFiles.length > 0 ? `${(selectedDeviceFiles[0].size / (1024 * 1024)).toFixed(2)} MB` : '3.1 MB',
      type: 'SYNC',
      date: new Date().toISOString().split('T')[0],
      category: 'stopervinn@gmail.com',
      url: selectedDeviceFiles.length > 0 ? URL.createObjectURL(selectedDeviceFiles[0]) : undefined,
    };
    setFiles([syncedFile, ...files]);
    setEmailSubjectInput('');
    setSelectedDeviceFiles([]);
    alert('Files added to this browser\'s vault. This demo does not send email or sync to other devices.');
  };

  const handleRunAIGenerator = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingAI(true);
    setTimeout(() => {
      setIsProcessingAI(false);
      setAiOutputResult(cyberImg);
      alert('AI Generation & Enhancement successfully completed and ready for download!');
    }, 2000);
  };

  // Launch Screen with Rottetlauch Center Core & Secret Key Prompt
  if (!isLaunched) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden font-sans text-white select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,100,0,0.22)_0%,rgba(0,0,0,0.98)_75%)] pointer-events-none" />

        <div className="text-center z-10 mb-8 px-4">
          <div className="text-xs uppercase tracking-[0.4em] text-orange-400 font-semibold mb-2">
            USB / Offline Vault Ready
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-orange-200 via-orange-400 to-amber-500 bg-clip-text text-transparent">
            QUANTUMSIM INFINITE VAULT
          </h1>
          <p className="text-xs text-neutral-400 mt-2 font-mono">
            Click center core to unlock with secret verification key
          </p>
        </div>
        
        {/* Interactive Center Rotating Core (Rottetlauch) */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border-2 border-dashed border-orange-500/40 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 border border-orange-400/50 rounded-full"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-12 border-2 border-orange-500/80 rounded-full border-t-transparent border-b-transparent"
          />
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-44 h-44 bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 rounded-full blur-2xl opacity-90"
          />
          
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowKeypad(true)}
            className="relative z-20 w-32 h-32 sm:w-36 sm:h-36 bg-neutral-950 border-4 border-orange-500 rounded-full flex flex-col items-center justify-center shadow-[0_0_60px_rgba(255,107,0,0.8)] cursor-pointer group hover:border-orange-400 transition-all"
          >
            <LockKeyhole className="w-10 h-10 text-orange-400 group-hover:text-white transition-colors mb-1 animate-pulse" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-orange-300 font-bold group-hover:text-white">
              UNLOCK
            </span>
          </motion.button>
        </div>

        {/* Secret Security Key Prompt Modal (No key text shown) */}
        <AnimatePresence>
          {showKeypad && (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-400">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Secret Quantum Key Required</h3>
                <p className="text-xs text-neutral-400 mb-4 font-mono">
                  Enter your assigned secure access key to proceed.
                </p>

                <form onSubmit={handleKeySubmit} className="space-y-4">
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter security key..."
                    value={accessKeyInput}
                    onChange={(e) => { setAccessKeyInput(e.target.value); setKeyError(false); }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-center font-mono text-orange-400 tracking-wider placeholder-neutral-600 focus:outline-none focus:border-orange-500"
                  />
                  {keyError && (
                    <p className="text-xs text-red-400 font-mono">ACCESS DENIED: Incorrect Secret Key</p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowKeypad(false)}
                      className="w-1/2 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-xl transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)] cursor-pointer"
                    >
                      Authenticate
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center z-10 font-mono text-xs text-neutral-500">
          Unlock to browse the sample vault stored on this device.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500 selection:text-white pb-16">
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500/10 border border-orange-500/40 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.3)]">
              <Cpu className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">QuantumSIM</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">USB edition</span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                {saveStatus === 'saving' ? 'Saving on this device…' : saveStatus === 'saved' ? 'Auto-saved on this device' : 'Local storage unavailable — export a backup'}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center relative w-72 lg:w-96">
            <Search className="absolute left-3 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search apps, software, documents, emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownloadAllBackup}
              className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 text-green-400 font-medium rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Backup & Download All</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)] cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Apps & Documents</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-editor')}
              className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 rounded-lg text-purple-400 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-orange-400" />
                  <span>Upload Apps, Software & Documents from Any Device</span>
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-neutral-400 hover:text-white text-sm font-mono cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-neutral-400 mb-6 font-mono">
                Select apps, documents, photos, or videos. Items are saved in this browser; export a backup to move data to another device.
              </p>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-neutral-700 hover:border-orange-500 rounded-2xl p-6 text-center bg-neutral-950 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    multiple
                    onChange={handleGeneralUploadFiles}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center justify-center mx-auto mb-2 text-orange-400 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-white mb-0.5">Click or drag files (Photos, Apps, Documents)</div>
                  <div className="text-[10px] text-neutral-400 font-mono">Select multiple individual files</div>
                </div>

                <div className="border-2 border-dashed border-amber-600/40 hover:border-amber-500 rounded-2xl p-6 text-center bg-neutral-950 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                    onChange={handleGeneralUploadFiles}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center mx-auto mb-2 text-amber-400 group-hover:scale-110 transition-transform">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-white mb-0.5">Click here to Upload Multiple Folders</div>
                  <div className="text-[10px] text-neutral-400 font-mono">Select multiple directories at once</div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <input
          ref={backupInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportBackup}
        />
        <div className="relative overflow-hidden bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="absolute right-0 top-0 w-96 h-full bg-[radial-gradient(ellipse_at_top_right,rgba(255,107,0,0.15),transparent_70%)] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-orange-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>LOCAL VAULT • SAVED IN THIS BROWSER</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                Universal Apps, Software & Document Vault
              </h1>
              <p className="text-sm text-neutral-400 max-w-2xl">
                Browse and manage your vault on this device. Export a backup to move saved data to another device.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Apps & Documents</span>
              </button>

              <button
                onClick={() => backupInputRef.current?.click()}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-medium text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Import Backup</span>
              </button>
              <button
                onClick={handleDownloadAllBackup}
                className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download All Saved Data</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8 pt-6 border-t border-neutral-800/80">
            <div 
              onClick={() => setActiveTab('apps')} 
              className={`cursor-pointer p-3 rounded-xl transition-all ${activeTab === 'apps' ? 'bg-orange-500/10 border border-orange-500/40' : 'bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/50'}`}
            >
              <div className="flex items-center justify-between text-neutral-400 mb-1 text-xs">
                <span>Apps & Software</span>
                <AppWindow className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-lg font-bold text-white tracking-tight">
                {apps.length} Saved
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('files')} 
              className={`cursor-pointer p-3 rounded-xl transition-all ${activeTab === 'files' ? 'bg-orange-500/10 border border-orange-500/40' : 'bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/50'}`}
            >
              <div className="flex items-center justify-between text-neutral-400 mb-1 text-xs">
                <span>Documents</span>
                <FileText className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-lg font-bold text-white tracking-tight">
                {files.length} Saved
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('photos')} 
              className={`cursor-pointer p-3 rounded-xl transition-all ${activeTab === 'photos' ? 'bg-orange-500/10 border border-orange-500/40' : 'bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/50'}`}
            >
              <div className="flex items-center justify-between text-neutral-400 mb-1 text-xs">
                <span>Photos</span>
                <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-lg font-bold text-white tracking-tight">
                {photos.length} Saved
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('videos')} 
              className={`cursor-pointer p-3 rounded-xl transition-all ${activeTab === 'videos' ? 'bg-orange-500/10 border border-orange-500/40' : 'bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/50'}`}
            >
              <div className="flex items-center justify-between text-neutral-400 mb-1 text-xs">
                <span>Videos</span>
                <Video className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-lg font-bold text-white tracking-tight">
                {videos.length} Saved
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('ai-editor')} 
              className={`cursor-pointer p-3 rounded-xl transition-all ${activeTab === 'ai-editor' ? 'bg-orange-500/10 border border-orange-500/40' : 'bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/50'}`}
            >
              <div className="flex items-center justify-between text-neutral-400 mb-1 text-xs">
                <span>AI Studio</span>
                <Wand2 className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-lg font-bold text-white tracking-tight">
                Active
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6 overflow-x-auto gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'overview' ? 'bg-orange-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              Vault Overview
            </button>
            <button
              onClick={() => setActiveTab('apps')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'apps' ? 'bg-orange-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              <AppWindow className="w-3.5 h-3.5" />
              <span>Apps & Software ({apps.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'files' ? 'bg-orange-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents ({files.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'photos' ? 'bg-orange-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photos ({photos.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'videos' ? 'bg-orange-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Videos ({videos.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-editor')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'ai-editor' ? 'bg-orange-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('email-sync')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'email-sync' ? 'bg-orange-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Sync</span>
            </button>
          </div>

          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Apps & Docs</span>
            </button>
          </div>
        </div>

        {/* Tab Content: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:col-span-1">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" />
                <span>This Device&apos;s Vault</span>
              </h3>
              
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="text-neutral-400">Saved Apps</span>
                  <span className="text-orange-400">{apps.length} items</span>
                </div>
                <div className="flex justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="text-neutral-400">Saved Documents</span>
                  <span className="text-orange-400">{files.length} items</span>
                </div>
                <div className="flex justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="text-neutral-400">Saved Photos / Videos</span>
                    <span className="text-green-400">{photos.length} / {videos.length}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-800 space-y-2">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Apps & Documents</span>
                </button>
                <button
                  onClick={handleDownloadAllBackup}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download All Saved Data</span>
                </button>
                <button
                  onClick={deleteAllData}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-red-600/20 border border-neutral-800 hover:border-red-500/50 text-neutral-300 hover:text-red-400 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete All Saved Data</span>
                </button>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-orange-400" />
                <span>Recent Vault Items</span>
              </h3>

              <div className="space-y-3">
                {apps.slice(0, 3).map((a) => (
                  <div key={a.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                        <AppWindow className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{a.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">App / Software · {a.size}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.url && (
                        <button
                          onClick={() => downloadItem(a.url, a.name)}
                          className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-orange-400 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      )}
                      <button
                        onClick={() => deleteApp(a.id)}
                        className="p-1 bg-neutral-900 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete App"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {files.slice(0, 3).map((f) => (
                  <div key={f.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{f.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">Document · {f.size}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.url && (
                        <button
                          onClick={() => downloadItem(f.url, f.name)}
                          className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-orange-400 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      )}
                      <button
                        onClick={() => deleteFile(f.id)}
                        className="p-1 bg-neutral-900 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: APPS */}
        {activeTab === 'apps' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Apps & Software Packages Vault</h3>
                <p className="text-xs text-neutral-400 font-mono">Saved in this browser: {apps.length} items</p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Apps & Software (.apk, .zip)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((a) => (
                <div key={a.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl hover:border-orange-500/50 transition-all flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                      {a.iconType === 'folder' ? <FolderArchive className="w-6 h-6" /> : <AppWindow className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{a.name}</h4>
                      <p className="text-xs text-neutral-400 font-mono">{a.version} · {a.size}</p>
                      <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 bg-neutral-900 text-orange-400 rounded">
                        {a.platform}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.url && (
                      <button
                        onClick={() => downloadItem(a.url, a.name)}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-orange-400 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    )}
                    <button
                      onClick={() => deleteApp(a.id)}
                      className="p-1.5 bg-neutral-900 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete Software"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: FILES / DOCUMENTS */}
        {activeTab === 'files' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Software Documents & Files Vault</h3>
                <p className="text-xs text-neutral-400 font-mono">Saved in this browser: {files.length} documents</p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Documents</span>
              </button>
            </div>

            <div className="space-y-3">
              {files.map((f) => (
                <div key={f.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{f.name}</h4>
                      <p className="text-[11px] text-neutral-400 font-mono">{f.size} · {f.date} · {f.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.url && (
                      <button
                        onClick={() => downloadItem(f.url, f.name)}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-orange-400 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    )}
                    <button
                      onClick={() => deleteFile(f.id)}
                      className="p-1.5 bg-neutral-900 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: PHOTOS */}
        {activeTab === 'photos' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Saved Photos Gallery</h3>
                <p className="text-xs text-neutral-400 font-mono">Saved in this browser: {photos.length} photos</p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Photos</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((ph) => (
                <div key={ph.id} className="group bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all">
                  <div className="aspect-video w-full overflow-hidden bg-neutral-900 relative">
                    <img
                      src={ph.url}
                      alt={ph.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[10px] font-mono text-orange-400 border border-orange-500/30">
                      {ph.size}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{ph.title}</h4>
                      <p className="text-[11px] text-neutral-400 font-mono">{ph.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadItem(ph.url, ph.title)}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-orange-400 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => deletePhoto(ph.id)}
                        className="p-1.5 bg-neutral-900 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete Photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: VIDEOS */}
        {activeTab === 'videos' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Saved Videos Vault</h3>
                <p className="text-xs text-neutral-400 font-mono">Saved in this browser: {videos.length} videos</p>
              </div>
              <div className="flex items-center gap-2">
                {videos.length > 0 && (
                  <button
                    onClick={deleteAllVideos}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 text-xs font-medium rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Delete All Videos"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Videos</span>
                  </button>
                )}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Videos</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((v) => (
                <div key={v.id} className="group bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all">
                  <div className="aspect-video w-full bg-neutral-900 relative flex items-center justify-center overflow-hidden">
                    <video
                      src={v.url}
                      controls
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[10px] font-mono text-orange-400 border border-orange-500/30">
                      {v.duration}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{v.title}</h4>
                      <p className="text-[11px] text-neutral-400 font-mono">{v.size} · {v.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadItem(v.url, v.title)}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-orange-400 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => deleteVideo(v.id)}
                        className="p-1.5 bg-neutral-900 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete Video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: AI STUDIO */}
        {activeTab === 'ai-editor' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-400" />
                  <span>AI Photo & Video Editor & Generator Suite</span>
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Upload photos or videos from any device to apply AI generative enhancements and style filters.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-4 lg:col-span-1">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                  <span>AI Generation & Filters</span>
                </h4>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Upload Media for AI Edit</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedMediaForEdit(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">AI Generative Prompt</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Cinematic cyberpunk lighting, high-res upscale 4K..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Style Filter Preset</label>
                  <select
                    value={editFilter}
                    onChange={(e: any) => setEditFilter(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="cyberpunk">Cyberpunk Neon</option>
                    <option value="quantum">Quantum Gold</option>
                    <option value="noir">Cinematic Noir</option>
                    <option value="hdr">Ultra HDR Enhance</option>
                  </select>
                </div>

                <button
                  onClick={handleRunAIGenerator}
                  disabled={isProcessingAI}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-orange-600 hover:opacity-90 text-white font-medium text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessingAI ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Neural AI...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Run AI Generation & Edit</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center lg:col-span-2 relative min-h-[350px]">
                <div className="absolute top-4 left-4 text-xs font-mono text-neutral-400">
                  Preview Canvas
                </div>

                <div className="relative max-w-md w-full aspect-video rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
                  <img
                    src={selectedMediaForEdit}
                    alt="AI Editor Preview"
                    className={`w-full h-full object-cover transition-all duration-500 ${
                      editFilter === 'cyberpunk' ? 'contrast-125 saturate-150 hue-rotate-15' :
                      editFilter === 'quantum' ? 'sepia-50 brightness-110' :
                      editFilter === 'noir' ? 'grayscale contrast-150' : 'brightness-110 saturate-125'
                    }`}
                  />
                  <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-mono text-purple-400 border border-purple-500/30">
                    Filter: {editFilter}
                  </div>
                </div>

                <div className="mt-4 flex gap-3 w-full">
                  <button
                    onClick={() => downloadItem(selectedMediaForEdit, `AI_Edited_Media_${Date.now()}.png`)}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Edited Media</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: EMAIL SYNC */}
        {activeTab === 'email-sync' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-orange-400" />
                  <span>Email-to-SIM Ingestion Gateway</span>
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  This demo records the selected attachment in this browser only; it does not connect to an email service or sync between devices.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-2xl">
                <h4 className="text-sm font-semibold text-white mb-3">Simulate Inbound Email from stopervinn@gmail.com</h4>
                <form onSubmit={handleSyncEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Sender Email</label>
                    <input
                      type="email"
                      readOnly
                      value="stopervinn@gmail.com"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-orange-400 font-mono cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Email Subject / Note</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. My Documents Backup & Photos..."
                      value={emailSubjectInput}
                      onChange={(e) => setEmailSubjectInput(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Attach Files / Documents</label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) setSelectedDeviceFiles(Array.from(e.target.files));
                      }}
                      className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-500 cursor-pointer"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send & Sync to Website Vault</span>
                  </button>
                </form>
              </div>

              <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-2xl">
                <h4 className="text-sm font-semibold text-white mb-3">Inbound Email Log (stopervinn@gmail.com)</h4>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {inboundEmails.map((em) => (
                    <div key={em.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white">{em.subject}</span>
                        <span className="text-[10px] font-mono text-green-400">{em.status}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        File: {em.attachmentName} · {em.date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
