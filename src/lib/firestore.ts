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
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Trip, Expense, ItineraryDay, ItineraryItem, Participant } from '../types';
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
  return onSnapshot(docRef, (doc) => {
    callback(doc.exists() ? (doc.data() as Trip) : null);
  });
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
  const q = query(
    collection(db, 'expenses'),
    where('tripId', '==', tripId),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => doc.data() as Expense);
    callback(expenses);
  });
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
  const q = query(
    collection(db, 'itinerary_days'),
    where('tripId', '==', tripId),
    orderBy('dayNumber', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const days = snapshot.docs.map(doc => doc.data() as ItineraryDay);
    callback(days);
  });
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
  const q = query(
    collection(db, 'itinerary_items'),
    where('tripId', '==', tripId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => doc.data() as ItineraryItem);
    callback(items);
  });
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
