import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  userRole: 'elderly' | 'caregiver';
  preferences: {
    fontSize: 'normal' | 'large' | 'extra-large';
    highContrast: boolean;
  };
  createdAt: any;
  updatedAt: any;
}

export const userService = {
  async ensureUserProfile(user: any) {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        userRole: 'elderly',
        preferences: {
          fontSize: 'normal',
          highContrast: false,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, profile);
      return profile;
    }
    return docSnap.data() as UserProfile;
  },

  async updatePreferences(userId: string, preferences: UserProfile['preferences']) {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, { 
      preferences,
      updatedAt: serverTimestamp() 
    }, { merge: true });
  }
};
