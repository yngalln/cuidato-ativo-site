import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonError);
  throw new Error(jsonError);
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  instructions?: string;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface IntakeLog {
  id: string;
  userId: string;
  medicationId: string;
  scheduledTime: any;
  actualTime?: any;
  status: 'taken' | 'missed' | 'skipped';
  notes?: string;
  createdAt: any;
}

const getMedicationsPath = (userId: string) => `users/${userId}/medications`;
const getLogsPath = (userId: string) => `users/${userId}/logs`;

export const medicationService = {
  async addMedication(userId: string, medication: Omit<Medication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const path = getMedicationsPath(userId);
    try {
      const newDocRef = doc(collection(db, path));
      const data: Medication = {
        ...medication,
        id: newDocRef.id,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(newDocRef, data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateMedication(userId: string, medicationId: string, updates: Partial<Medication>) {
    const path = `${getMedicationsPath(userId)}/${medicationId}`;
    try {
      const docRef = doc(db, path);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteMedication(userId: string, medicationId: string) {
    const path = `${getMedicationsPath(userId)}/${medicationId}`;
    try {
      const docRef = doc(db, path);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribeToMedications(userId: string, callback: (meds: Medication[]) => void) {
    const path = getMedicationsPath(userId);
    const q = query(collection(db, path), where('active', '==', true), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const meds = snapshot.docs.map(doc => doc.data() as Medication);
      callback(meds);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async addIntakeLog(userId: string, log: Omit<IntakeLog, 'id' | 'userId' | 'createdAt'>) {
    const path = getLogsPath(userId);
    try {
      const newDocRef = doc(collection(db, path));
      const data: IntakeLog = {
        ...log,
        id: newDocRef.id,
        userId,
        createdAt: serverTimestamp(),
      };
      await setDoc(newDocRef, data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  subscribeToLogs(userId: string, callback: (logs: IntakeLog[]) => void) {
    const path = getLogsPath(userId);
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => doc.data() as IntakeLog);
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }
};
