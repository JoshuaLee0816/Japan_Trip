import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  deleteDoc,
  orderBy,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Trip, Expense, ItineraryDay, ItineraryItem, Participant, ShoppingItem } from '../types';
import { generateRoomCode } from '../utils/roomCode';

// ==================== 旅程相關 ====================

export async function createTrip(name: string, maxParticipants = 4): Promise<Trip> {
  const roomCode = generateRoomCode();
  const tripId = `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const defaultParticipants: Participant[] = Array.from({ length: maxParticipants }, (_, i) => ({
    id: `p${i + 1}`,
    name: String.fromCharCode(65 + i), // A, B, C, D
  }));

  const trip: Trip = {
    id: tripId,
    name,
    roomCode,
    participants: defaultParticipants,
    maxParticipants,
    exchangeRate: 0.22, // 預設匯率 JPY -> TWD
    displayCurrency: 'JPY',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'trips', tripId), trip);
  return trip;
}

export async function getTripByRoomCode(roomCode: string): Promise<Trip | null> {
  const q = query(collection(db, 'trips'), where('roomCode', '==', roomCode));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Trip;
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const docRef = doc(db, 'trips', tripId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Trip) : null;
}

export async function updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
  const docRef = doc(db, 'trips', tripId);
  await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

export function subscribeTripChanges(tripId: string, callback: (trip: Trip | null) => void): Unsubscribe {
  const docRef = doc(db, 'trips', tripId);
  return onSnapshot(docRef,
    (doc) => {
      const trip = doc.exists() ? (doc.data() as Trip) : null;
      callback(trip);
      console.log(`[Firestore] Trip updated:`, trip?.name || 'null');
    },
    (error) => {
      console.error('[Firestore] Error subscribing to trip:', error);
      callback(null);
    }
  );
}

export async function getRecentTrips(limitCount = 10): Promise<Trip[]> {
  const q = query(
    collection(db, 'trips'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Trip);
}

export async function deleteTrip(tripId: string): Promise<void> {
  // 刪除旅程相關的所有資料

  // 刪除費用
  const expensesQuery = query(collection(db, 'expenses'), where('tripId', '==', tripId));
  const expensesSnapshot = await getDocs(expensesQuery);
  await Promise.all(expensesSnapshot.docs.map(doc => deleteDoc(doc.ref)));

  // 刪除行程項目
  const itemsQuery = query(collection(db, 'itinerary_items'), where('tripId', '==', tripId));
  const itemsSnapshot = await getDocs(itemsQuery);
  await Promise.all(itemsSnapshot.docs.map(doc => deleteDoc(doc.ref)));

  // 刪除行程天數
  const daysQuery = query(collection(db, 'itinerary_days'), where('tripId', '==', tripId));
  const daysSnapshot = await getDocs(daysQuery);
  await Promise.all(daysSnapshot.docs.map(doc => deleteDoc(doc.ref)));

  // 刪除購物清單
  const shoppingQuery = query(collection(db, 'shopping_items'), where('tripId', '==', tripId));
  const shoppingSnapshot = await getDocs(shoppingQuery);
  await Promise.all(shoppingSnapshot.docs.map(doc => deleteDoc(doc.ref)));

  // 最後刪除旅程本身
  await deleteDoc(doc(db, 'trips', tripId));
}

// ==================== 費用相關 ====================

export async function addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
  const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newExpense: Expense = {
    ...expense,
    id: expenseId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'expenses', expenseId), newExpense);
  return newExpense;
}

export async function updateExpense(expenseId: string, updates: Partial<Expense>): Promise<void> {
  const docRef = doc(db, 'expenses', expenseId);
  await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', expenseId));
}

export function subscribeExpenses(tripId: string, callback: (expenses: Expense[]) => void): Unsubscribe {
  // 暫時移除 orderBy 來避免需要複合索引
  // 改在前端排序
  const q = query(
    collection(db, 'expenses'),
    where('tripId', '==', tripId)
  );

  return onSnapshot(q,
    (snapshot) => {
      // 在前端排序資料
      const expenses = snapshot.docs
        .map(doc => doc.data() as Expense)
        .sort((a, b) => {
          // 依照 createdAt 降序排列(最新的在前面)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      callback(expenses);
      console.log(`[Firestore] Expenses updated: ${expenses.length} expenses`);
    },
    (error) => {
      console.error('[Firestore] Error subscribing to expenses:', error);
      console.error('[Firestore] Error details:', error.code, error.message);
      // Return empty array on error to prevent app crash
      callback([]);
    }
  );
}

// ==================== 行程相關 ====================

export async function addItineraryDay(day: Omit<ItineraryDay, 'id' | 'createdAt'>): Promise<ItineraryDay> {
  const dayId = `day_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newDay: ItineraryDay = {
    ...day,
    id: dayId,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'itinerary_days', dayId), newDay);
  return newDay;
}

export async function deleteItineraryDay(dayId: string): Promise<void> {
  // 刪除該日期的所有項目
  const itemsQuery = query(collection(db, 'itinerary_items'), where('dayId', '==', dayId));
  const itemsSnapshot = await getDocs(itemsQuery);
  await Promise.all(itemsSnapshot.docs.map(doc => deleteDoc(doc.ref)));

  // 刪除日期
  await deleteDoc(doc(db, 'itinerary_days', dayId));
}

export function subscribeItineraryDays(tripId: string, callback: (days: ItineraryDay[]) => void): Unsubscribe {
  // 暫時移除 orderBy 來避免需要複合索引
  const q = query(
    collection(db, 'itinerary_days'),
    where('tripId', '==', tripId)
  );

  return onSnapshot(q,
    (snapshot) => {
      // 在前端排序資料
      const days = snapshot.docs
        .map(doc => doc.data() as ItineraryDay)
        .sort((a, b) => a.dayNumber - b.dayNumber);
      callback(days);
    },
    (error) => {
      console.error('[Firestore] Error subscribing to itinerary days:', error);
      console.error('[Firestore] Error details:', error.code, error.message);
      callback([]);
    }
  );
}

export async function addItineraryItem(item: Omit<ItineraryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ItineraryItem> {
  const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newItem: ItineraryItem = {
    ...item,
    id: itemId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'itinerary_items', itemId), newItem);
  return newItem;
}

export async function updateItineraryItem(itemId: string, updates: Partial<ItineraryItem>): Promise<void> {
  const docRef = doc(db, 'itinerary_items', itemId);
  await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteItineraryItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'itinerary_items', itemId));
}

export function subscribeItineraryItems(tripId: string, callback: (items: ItineraryItem[]) => void): Unsubscribe {
  // 暫時移除 orderBy 來避免需要複合索引
  const q = query(
    collection(db, 'itinerary_items'),
    where('tripId', '==', tripId)
  );

  return onSnapshot(q,
    (snapshot) => {
      // 在前端排序資料
      const items = snapshot.docs
        .map(doc => doc.data() as ItineraryItem)
        .sort((a, b) => a.order - b.order);
      callback(items);
    },
    (error) => {
      console.error('[Firestore] Error subscribing to itinerary items:', error);
      console.error('[Firestore] Error details:', error.code, error.message);
      callback([]);
    }
  );
}

// ==================== 匯出/匯入 ====================

export interface ExportData {
  trip: Trip;
  expenses: Expense[];
  days: ItineraryDay[];
  items: ItineraryItem[];
}

export async function exportTripData(tripId: string): Promise<ExportData> {
  const trip = await getTrip(tripId);
  if (!trip) throw new Error('找不到旅程');

  const [expensesSnap, daysSnap, itemsSnap] = await Promise.all([
    getDocs(query(collection(db, 'expenses'), where('tripId', '==', tripId))),
    getDocs(query(collection(db, 'itinerary_days'), where('tripId', '==', tripId))),
    getDocs(query(collection(db, 'itinerary_items'), where('tripId', '==', tripId))),
  ]);

  return {
    trip,
    expenses: expensesSnap.docs.map(doc => doc.data() as Expense),
    days: daysSnap.docs.map(doc => doc.data() as ItineraryDay),
    items: itemsSnap.docs.map(doc => doc.data() as ItineraryItem),
  };
}

export async function importTripData(data: ExportData): Promise<string> {
  const { trip, expenses, days, items } = data;

  // 導入旅程
  await setDoc(doc(db, 'trips', trip.id), trip);

  // 導入費用
  await Promise.all(expenses.map(exp => setDoc(doc(db, 'expenses', exp.id), exp)));

  // 導入行程天數
  await Promise.all(days.map(day => setDoc(doc(db, 'itinerary_days', day.id), day)));

  // 導入行程項目
  await Promise.all(items.map(item => setDoc(doc(db, 'itinerary_items', item.id), item)));

  return trip.id;
}

// ==================== 購物清單相關 ====================

export async function addShoppingItem(data: Omit<ShoppingItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const id = `shopping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const shoppingItem: ShoppingItem = {
    ...data,
    id,
    isPurchased: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'shopping_items', id), shoppingItem);
}

export async function updateShoppingItem(id: string, updates: Partial<Omit<ShoppingItem, 'id' | 'createdAt'>>): Promise<void> {
  const itemRef = doc(db, 'shopping_items', id);
  await setDoc(itemRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteShoppingItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'shopping_items', id));
}

export function subscribeShoppingItems(tripId: string, callback: (items: ShoppingItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'shopping_items'), where('tripId', '==', tripId));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => doc.data() as ShoppingItem);
    callback(items);
  });
}
