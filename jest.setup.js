// Mock Firebase modules so tests don't need real Firebase connections
jest.mock('./src/config/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  increment: jest.fn(),
  serverTimestamp: jest.fn(),
  getFirestore: jest.fn(),
  Timestamp: {
    fromDate: (d) => ({ toDate: () => d }),
    now: () => ({ toDate: () => new Date() }),
  },
}));

jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(),
  browserLocalPersistence: {},
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadString: jest.fn(),
  getDownloadURL: jest.fn(),
}));
