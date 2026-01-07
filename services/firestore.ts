import { initializeFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  getDocs,
  writeBatch,
  Query,
  DocumentData,
  CollectionReference,
  QueryConstraint
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { Character, CustomQuest, InventoryItem, JournalEntry, StoryChapter, UserProfile } from '../types';

// Get app instance
const getFirebaseApp = () => {
  const apps = getApps();
  return apps.length > 0 ? getApp() : null;
};

// Initialize Firestore
let db: ReturnType<typeof initializeFirestore> | null = null;

export const initializeFirestoreDb = () => {
  const app = getFirebaseApp();
  if (!app) {
    console.warn('Firebase app not initialized');
    return null;
  }

  try {
    db = initializeFirestore(app, {
      cacheSizeBytes: 40 * 1024 * 1024, // 40MB cache
    });

    // Enable offline persistence
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence disabled');
      } else if (err.code === 'unimplemented') {
        console.warn('Browser does not support persistence');
      }
    });

    return db;
  } catch (error) {
    console.error('Failed to initialize Firestore:', error);
    return null;
  }
};

export const getDb = () => {
  if (!db) {
    db = initializeFirestoreDb();
  }
  return db;
};

// ===== CHARACTERS =====

export const saveCharacter = async (uid: string, character: Character): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'characters', character.id);
  await setDoc(docRef, {
    ...character,
    lastPlayed: Date.now(),
  }, { merge: true });
};

export const loadCharacter = async (uid: string, characterId: string): Promise<Character | null> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'characters', characterId);
  const snapshot = await getDoc(docRef);
  
  return snapshot.exists() ? (snapshot.data() as Character) : null;
};

export const loadCharacters = async (uid: string): Promise<Character[]> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const collRef = collection(db, 'users', uid, 'characters') as CollectionReference<Character>;
  const q = query(collRef, orderBy('lastPlayed', 'desc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const deleteCharacter = async (uid: string, characterId: string): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'characters', characterId);
  await deleteDoc(docRef);
};

// ===== INVENTORY ITEMS =====

export const saveInventoryItem = async (uid: string, item: InventoryItem): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'items', item.id);
  await setDoc(docRef, item, { merge: true });
};

export const loadInventoryItems = async (uid: string, characterId?: string): Promise<InventoryItem[]> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const collRef = collection(db, 'users', uid, 'items') as CollectionReference<InventoryItem>;
  const constraints: QueryConstraint[] = [];
  
  if (characterId) {
    constraints.push(where('characterId', '==', characterId));
  }
  
  const q = query(collRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const deleteInventoryItem = async (uid: string, itemId: string): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'items', itemId);
  await deleteDoc(docRef);
};

// ===== QUESTS =====

export const saveQuest = async (uid: string, quest: CustomQuest): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'quests', quest.id);
  await setDoc(docRef, quest, { merge: true });
};

export const loadQuests = async (uid: string, characterId?: string): Promise<CustomQuest[]> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const collRef = collection(db, 'users', uid, 'quests') as CollectionReference<CustomQuest>;
  const constraints: QueryConstraint[] = [];
  
  if (characterId) {
    constraints.push(where('characterId', '==', characterId));
  }
  
  const q = query(collRef, ...constraints, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const loadActiveQuests = async (uid: string, characterId: string): Promise<CustomQuest[]> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const collRef = collection(db, 'users', uid, 'quests') as CollectionReference<CustomQuest>;
  const q = query(
    collRef,
    where('characterId', '==', characterId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const deleteQuest = async (uid: string, questId: string): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'quests', questId);
  await deleteDoc(docRef);
};

// ===== JOURNAL ENTRIES =====

export const saveJournalEntry = async (uid: string, entry: JournalEntry): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'journalEntries', entry.id);
  await setDoc(docRef, entry, { merge: true });
};

export const loadJournalEntries = async (uid: string, characterId?: string): Promise<JournalEntry[]> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const collRef = collection(db, 'users', uid, 'journalEntries') as CollectionReference<JournalEntry>;
  const constraints: QueryConstraint[] = [];
  
  if (characterId) {
    constraints.push(where('characterId', '==', characterId));
  }
  
  const q = query(collRef, ...constraints, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const deleteJournalEntry = async (uid: string, entryId: string): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'journalEntries', entryId);
  await deleteDoc(docRef);
};

// ===== STORY CHAPTERS =====

export const saveStoryChapter = async (uid: string, chapter: StoryChapter): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'storyChapters', chapter.id);
  await setDoc(docRef, chapter, { merge: true });
};

export const loadStoryChapters = async (uid: string, characterId?: string): Promise<StoryChapter[]> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const collRef = collection(db, 'users', uid, 'storyChapters') as CollectionReference<StoryChapter>;
  const constraints: QueryConstraint[] = [];
  
  if (characterId) {
    constraints.push(where('characterId', '==', characterId));
  }
  
  const q = query(collRef, ...constraints, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const loadRecentStory = async (uid: string, characterId: string, limit: number = 3): Promise<StoryChapter[]> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const collRef = collection(db, 'users', uid, 'storyChapters') as CollectionReference<StoryChapter>;
  const q = query(
    collRef,
    where('characterId', '==', characterId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map(doc => doc.data());
};

export const deleteStoryChapter = async (uid: string, chapterId: string): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'storyChapters', chapterId);
  await deleteDoc(docRef);
};

// ===== USER PROFILES =====

export const saveUserProfile = async (uid: string, profile: UserProfile): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'profiles', profile.id);
  await setDoc(docRef, profile, { merge: true });
};

export const loadUserProfiles = async (uid: string): Promise<UserProfile[]> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const collRef = collection(db, 'users', uid, 'profiles') as CollectionReference<UserProfile>;
  const q = query(collRef, orderBy('created', 'desc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const deleteUserProfile = async (uid: string, profileId: string): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'users', uid, 'profiles', profileId);
  await deleteDoc(docRef);
};

// ===== BATCH OPERATIONS =====

export const batchSaveGameState = async (
  uid: string,
  characters: Character[],
  items: InventoryItem[],
  quests: CustomQuest[],
  journalEntries: JournalEntry[],
  storyChapters: StoryChapter[],
  profiles: UserProfile[]
): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const batch = writeBatch(db);

  // Save characters
  characters.forEach(char => {
    const docRef = doc(db, 'users', uid, 'characters', char.id);
    batch.set(docRef, { ...char, lastPlayed: Date.now() }, { merge: true });
  });

  // Save items
  items.forEach(item => {
    const docRef = doc(db, 'users', uid, 'items', item.id);
    batch.set(docRef, item, { merge: true });
  });

  // Save quests
  quests.forEach(quest => {
    const docRef = doc(db, 'users', uid, 'quests', quest.id);
    batch.set(docRef, quest, { merge: true });
  });

  // Save journal entries
  journalEntries.forEach(entry => {
    const docRef = doc(db, 'users', uid, 'journalEntries', entry.id);
    batch.set(docRef, entry, { merge: true });
  });

  // Save story chapters
  storyChapters.forEach(chapter => {
    const docRef = doc(db, 'users', uid, 'storyChapters', chapter.id);
    batch.set(docRef, chapter, { merge: true });
  });

  // Save profiles
  profiles.forEach(profile => {
    const docRef = doc(db, 'users', uid, 'profiles', profile.id);
    batch.set(docRef, profile, { merge: true });
  });

  await batch.commit();
};

// ===== DEFENSIVE INITIALIZATION =====

export const ensureCharacterDefaults = (character: Character): Character => {
  return {
    lastPlayed: Date.now(),
    ...character,
  };
};
