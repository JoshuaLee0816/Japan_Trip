# Technical Implementation Guide

[繁體中文](./TECHNIQUES.zh-TW.md) | English

This document outlines the technical architecture, implementation patterns, and key decisions made in building the Japan Trip Expense Tracker PWA.

## Architecture Overview

### Frontend Architecture

**Framework:** React 19 with TypeScript
**Build Tool:** Vite 7
**State Management:** React hooks (useState, useEffect)
**Styling:** Vanilla CSS with CSS variables

The application follows a component-based architecture with clear separation of concerns:
- UI components handle presentation
- Firebase library handles data operations
- Utility functions handle business logic
- TypeScript types ensure type safety

### Backend Architecture

**Database:** Firebase Firestore (NoSQL)
**Authentication:** None (room code-based access)
**Hosting:** Vercel (frontend), Firebase (database)

Data is structured in three main collections:
- `trips`: Trip metadata and participant information
- `expenses`: Individual expense records
- `itinerary`: Nested structure for days and items

### Data Flow

```
User Action → Component → Firestore Library → Firebase SDK → Firestore Database
                ↑                                                      ↓
                └──────────── Real-time Listener ←────────────────────┘
```

Real-time synchronization is achieved through Firestore listeners that update component state when database changes occur.

## Key Technical Decisions

### 1. Firebase Firestore over REST API

**Decision:** Use Firebase Firestore instead of building a custom REST API

**Rationale:**
- Built-in real-time synchronization
- Offline persistence out of the box
- No server maintenance required
- Automatic scaling
- Reduced development time

**Trade-offs:**
- Vendor lock-in to Firebase
- Limited complex query capabilities
- Cost scales with usage
- Less control over caching strategy

### 2. Room Code System for Access Control

**Decision:** Implement a simple 6-character room code instead of user authentication

**Rationale:**
- Minimal friction for users (no registration)
- Suitable for short-term trip collaboration
- Simple to implement and understand
- No password management required

**Implementation:**
```typescript
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**Security Considerations:**
- 6 characters from 32-character set = 1,073,741,824 combinations
- Sufficient for short-term use
- No brute-force protection implemented
- Codes are not encrypted in localStorage

### 3. Client-Side State Management

**Decision:** Use React hooks instead of Redux or other state management libraries

**Rationale:**
- Application state is simple and localized
- Firebase handles synchronization
- Reduced bundle size
- Simpler codebase

**State Structure:**
```typescript
const [currentTripId, setCurrentTripId] = useState<string | null>(null);
const [trip, setTrip] = useState<Trip | null>(null);
const [expenses, setExpenses] = useState<Expense[]>([]);
const [activeTab, setActiveTab] = useState<Tab>('expenses');
```

### 4. Settlement Algorithm

**Decision:** Implement greedy algorithm for debt settlement

**Algorithm:**
```typescript
function calculateSettlement(expenses: Expense[], participants: Participant[]): Settlement {
  // Calculate net balance for each participant
  const balances = calculateBalances(expenses, participants);

  // Separate debtors and creditors
  const debtors = balances.filter(b => b.balance < 0);
  const creditors = balances.filter(b => b.balance > 0);

  // Match largest debts with largest credits
  const transactions = [];
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
    transactions.push({ from: debtor.id, to: creditor.id, amount });

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.01) debtors.shift();
    if (Math.abs(creditor.balance) < 0.01) creditors.shift();
  }

  return { transactions, balances };
}
```

**Time Complexity:** O(n log n) for sorting + O(n) for matching = O(n log n)

**Alternative Considered:** Min-cost max-flow algorithm
- More complex implementation
- Marginal improvement in transaction count
- Not worth the complexity for typical use case (4-8 participants)

### 5. Mobile-First Responsive Design

**Decision:** Build mobile-first with progressive enhancement

**Breakpoints:**
```css
/* Base styles: Mobile (375px+) */
/* Tablet: max-width: 768px */
/* Desktop: min-width: 769px */
```

**iPhone-Specific Optimizations:**
```css
/* Safe area support for notch */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);

/* Prevent zoom on input focus */
input {
  font-size: 16px;
}

/* Touch target optimization */
button {
  min-width: 44px;
  min-height: 44px;
}
```

### 6. PWA Implementation

**Service Worker Strategy:** Precache with runtime caching

**Configuration:**
```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/firestore\.googleapis\.com/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'firestore-cache',
          networkTimeoutSeconds: 10,
        }
      }
    ]
  }
})
```

**Rationale:**
- NetworkFirst for Firestore ensures fresh data
- Precaching for static assets ensures offline functionality
- Auto-update ensures users get latest version

## Component Implementation Details

### TripSetup Component

**Purpose:** Handle trip creation and joining

**Key Features:**
- Form validation
- Room code generation
- Participant management
- localStorage persistence

**Implementation Pattern:**
```typescript
const handleCreateTrip = async () => {
  const participants = parseParticipants(participantInput);
  const roomCode = generateRoomCode();

  const trip = await createTrip({
    participants,
    roomCode,
    createdAt: new Date()
  });

  localStorage.setItem('currentTripId', trip.id);
  onTripSelect(trip.id);
};
```

### ExpenseForm Component

**Purpose:** Add and edit expenses

**Validation:**
- Required fields: description, amount, paidBy
- Amount must be positive number
- At least one participant must be selected

**Split Calculation:**
```typescript
const splitAmount = totalAmount / selectedParticipants.length;
```

**Decimal Handling:**
- Store amounts as integers (cents/sen)
- Display with 2 decimal places
- Avoid floating-point errors

### ExpenseList Component

**Purpose:** Display and manage expense list

**Features:**
- Real-time updates via Firestore listener
- Grouped by date
- Filter and sort options
- Edit/delete actions

**Performance:**
```typescript
// Memoize expensive calculations
const groupedExpenses = useMemo(() => {
  return expenses.reduce((groups, expense) => {
    const date = formatDate(expense.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(expense);
    return groups;
  }, {});
}, [expenses]);
```

### Settlement Component

**Purpose:** Calculate and display debt settlement

**Calculation Flow:**
1. Aggregate all expenses
2. Calculate per-person totals
3. Calculate net balances
4. Generate minimal transaction set

**UI Considerations:**
- Color coding (green = receives, red = pays)
- Clear labeling
- Amount formatting with currency

### Itinerary Component

**Purpose:** Day-by-day trip planning

**Data Structure:**
```typescript
interface ItineraryDay {
  id: string;
  date: Date;
  tripId: string;
}

interface ItineraryItem {
  id: string;
  dayId: string;
  time: string;
  location: string;
  description: string;
  budget?: number;
  completed: boolean;
}
```

**Nested Collection Pattern:**
```
/itinerary/{dayId}
  /items/{itemId}
```

## Firebase Integration

### Firestore Library Structure

**File:** `src/lib/firestore.ts`

**Exports:**
- CRUD operations for each collection
- Real-time subscription functions
- Type-safe wrappers around Firebase SDK

**Example:**
```typescript
export async function createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  const docRef = await addDoc(collection(db, 'expenses'), {
    ...expense,
    createdAt: Timestamp.now()
  });

  return {
    id: docRef.id,
    ...expense
  };
}

export function subscribeExpenses(
  tripId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'expenses'),
    where('tripId', '==', tripId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[];
    callback(expenses);
  });
}
```

### Real-Time Synchronization

**Pattern:** Subscribe on mount, unsubscribe on unmount

```typescript
useEffect(() => {
  if (!currentTripId) return;

  const unsubscribe = subscribeExpenses(currentTripId, setExpenses);

  return () => unsubscribe();
}, [currentTripId]);
```

**Benefits:**
- Automatic UI updates
- No polling required
- Works across all connected clients

**Challenges:**
- Managing subscription lifecycle
- Handling connection drops
- Preventing memory leaks

## TypeScript Configuration

### verbatimModuleSyntax

**Configuration:**
```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

**Impact:**
- Requires explicit `import type` for type-only imports
- Prevents runtime imports of types
- Cleaner compiled output

**Pattern:**
```typescript
import { collection } from 'firebase/firestore';
import type { Expense, Participant } from './types';
```

### Type Definitions

**Location:** `src/types/index.ts`

**Key Types:**
```typescript
export interface Trip {
  id: string;
  participants: Participant[];
  roomCode: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  currency: 'JPY' | 'TWD';
  paidBy: string;
  splitBetween: string[];
  category: ExpenseCategory;
  createdAt: Date;
}

export type ExpenseCategory =
  | 'food'
  | 'transportation'
  | 'accommodation'
  | 'shopping'
  | 'entertainment'
  | 'other';
```

## Performance Optimizations

### Bundle Optimization

**Vite Configuration:**
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/firestore'],
          'react-vendor': ['react', 'react-dom']
        }
      }
    }
  }
});
```

**Results:**
- Main bundle: 545 KB (170 KB gzipped)
- Firebase chunk: ~300 KB
- React chunk: ~130 KB

### CSS Optimization

**Approach:**
- Single CSS file (no CSS-in-JS overhead)
- CSS variables for theming
- Media queries for responsive design
- No unused CSS (no framework)

**CSS Variables:**
```css
:root {
  --primary: #3b82f6;
  --text: #1f2937;
  --border: #e5e7eb;
  --error: #ef4444;
  --success: #10b981;
}
```

### Rendering Performance

**Techniques:**
- Avoid unnecessary re-renders with React.memo
- Use useMemo for expensive calculations
- Lazy load components (future enhancement)
- Virtualize long lists (future enhancement)

## Security Implementation

### Firestore Security Rules

**Development Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Production Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/{tripId} {
      allow read, write: if true;
      // Future: validate room code
      // allow read, write: if request.auth != null &&
      //   resource.data.roomCode == request.resource.data.roomCode;
    }

    match /expenses/{expenseId} {
      allow read, write: if true;
      // Future: validate tripId exists
    }

    match /itinerary/{dayId} {
      allow read, write: if true;
      match /items/{itemId} {
        allow read, write: if true;
      }
    }
  }
}
```

### Client-Side Validation

**Input Sanitization:**
```typescript
function sanitizeInput(input: string): string {
  return input.trim().substring(0, 100); // Limit length
}

function validateAmount(amount: string): number | null {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100) / 100; // Round to 2 decimals
}
```

### XSS Prevention

**Approach:**
- React automatically escapes JSX
- No dangerouslySetInnerHTML used
- All user input treated as plain text

## Testing Strategy

### Current State
- No automated tests implemented
- Manual testing on various devices

### Recommended Testing Approach

**Unit Tests:**
```typescript
describe('Settlement Algorithm', () => {
  it('should calculate correct balances', () => {
    const expenses = [/* test data */];
    const result = calculateSettlement(expenses);
    expect(result.balances[0].balance).toBe(expectedAmount);
  });

  it('should generate minimal transactions', () => {
    const result = calculateSettlement(expenses);
    expect(result.transactions.length).toBeLessThanOrEqual(n-1);
  });
});
```

**Integration Tests:**
```typescript
describe('Expense Flow', () => {
  it('should create expense and update all clients', async () => {
    await createExpense(testExpense);
    // Wait for Firestore propagation
    await waitFor(() => {
      expect(screen.getByText(testExpense.description)).toBeInTheDocument();
    });
  });
});
```

**E2E Tests:**
- Test complete user flows
- Multi-device synchronization
- Offline/online transitions

## Deployment Pipeline

### Build Process

```bash
npm run build
```

**Steps:**
1. TypeScript compilation
2. Vite bundling and minification
3. PWA manifest and service worker generation
4. Asset optimization

**Output:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── sw.js
├── workbox-[hash].js
├── manifest.webmanifest
└── icons/
```

### Vercel Deployment

**Configuration:** `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Environment Variables:**
- Set in Vercel Dashboard or via CLI
- Prefixed with `VITE_` to be exposed to client
- Never commit `.env` to version control

### CI/CD Considerations

**Future Enhancements:**
- GitHub Actions for automated testing
- Lighthouse CI for performance monitoring
- Automated security scanning
- Preview deployments for pull requests

## Monitoring and Analytics

### Current Implementation
- No analytics implemented
- No error tracking

### Recommended Tools

**Error Tracking:**
- Sentry for JavaScript errors
- Firebase Crashlytics

**Analytics:**
- Google Analytics 4
- Firebase Analytics

**Performance:**
- Lighthouse CI
- Web Vitals monitoring

**Implementation Example:**
```typescript
// Error boundary for React errors
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to error tracking service
    logErrorToService(error, errorInfo);
  }
}

// Performance monitoring
const reportWebVitals = (metric) => {
  // Send to analytics service
  sendToAnalytics(metric);
};
```

## Future Technical Enhancements

### Short Term
1. **Add automated tests**
   - Unit tests for utilities
   - Integration tests for components
   - E2E tests for critical flows

2. **Implement error boundaries**
   - Graceful error handling
   - User-friendly error messages
   - Error reporting

3. **Add loading states**
   - Skeleton screens
   - Loading indicators
   - Optimistic UI updates

### Medium Term
1. **Optimize bundle size**
   - Code splitting by route
   - Dynamic imports
   - Tree shaking analysis

2. **Add offline queue**
   - Queue writes when offline
   - Sync when connection restored
   - Conflict resolution

3. **Implement data export**
   - CSV export
   - PDF reports
   - Share functionality

### Long Term
1. **Add user authentication**
   - Firebase Authentication
   - Multiple trips per user
   - Trip permissions

2. **Implement push notifications**
   - New expense notifications
   - Settlement reminders
   - Trip updates

3. **Add advanced features**
   - Receipt photo upload
   - Currency conversion API
   - Budget tracking
   - Expense charts

## Lessons Learned

### What Worked Well
1. **Firebase Firestore** - Real-time sync worked flawlessly
2. **TypeScript** - Caught many bugs during development
3. **Vite** - Fast development experience
4. **Mobile-first design** - Ensured good mobile UX

### What Could Be Improved
1. **Testing** - Should have added tests from the start
2. **Error handling** - More robust error handling needed
3. **Documentation** - Should have documented while building
4. **State management** - Could benefit from more structured approach as app grows

### Key Takeaways
1. Start with strong TypeScript types
2. Consider offline-first from the beginning
3. Mobile optimization is crucial for PWAs
4. Real-time features add significant value
5. Simple solutions often work best (room codes vs full auth)

## Conclusion

This application demonstrates a practical implementation of a real-time collaborative PWA using modern web technologies. The architecture prioritizes simplicity and user experience while maintaining good technical practices. The room code approach proves that not all applications need complex authentication systems, and Firebase Firestore provides an excellent foundation for real-time collaborative features.

Future enhancements should focus on testing, error handling, and performance optimization while maintaining the simplicity that makes the application easy to use and maintain.
