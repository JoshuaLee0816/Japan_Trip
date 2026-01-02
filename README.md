# Japan Trip Expense Tracker

[繁體中文](./README.zh-TW.md) | English

A Progressive Web Application for tracking shared expenses during group travel in Japan. Built with React 19, TypeScript, and Firebase Firestore for real-time synchronization across multiple devices.

## Features

### Expense Management
- Real-time expense tracking synchronized across all participants
- Support for multiple currencies (JPY, TWD)
- Flexible expense splitting (all participants or selected individuals)
- Categorized expenses (meals, transportation, accommodation, shopping, etc.)

### Automatic Settlement
- Generates optimal settlement suggestions with minimum transactions
- Default display in TWD with quick toggle to JPY
- Clear visualization of who owes whom
- One-click copy settlement plan

### Itinerary Planning
- Day-by-day trip planning
- Add items with time, location, and budget information
- Mark items as completed
- Real-time synchronization across all devices

### Room Code System
- Simple 6-character room codes for joining trips
- Secure access control - only code holders can access trip data
- Support for multiple participants

### Progressive Web App
- Installable on device home screen
- Offline functionality with data persistence
- Full-screen experience without browser chrome
- Optimized for all iPhone models (SE through 15 Pro Max)

## Technology Stack

### Frontend
- React 19 with TypeScript
- Vite 7 for build tooling
- CSS with responsive design and mobile-first approach

### Backend
- Firebase Firestore for real-time database
- Cloud-hosted with global accessibility

### PWA Features
- Workbox service worker for caching
- Web App Manifest for installation
- Offline data access

### Deployment
- Vercel for production hosting
- Automatic HTTPS and global CDN

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher
- Firebase project with Firestore enabled

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd japan-trip-pwa
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:

Create a `.env` file in the project root:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Start development server:
```bash
npm run dev
```

5. Open browser at `http://localhost:5173`

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database (test mode for development)
3. Select region: `asia-northeast1` (Tokyo) for optimal Japan/Taiwan performance
4. Copy configuration values to `.env` file

### Firestore Security Rules

For development (test mode):
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

For production:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/{tripId} {
      allow read, write: if true;
    }
    match /expenses/{expenseId} {
      allow read, write: if true;
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

## Usage

### Creating a Trip

1. Open the application
2. Click "Create New Trip"
3. Enter participant names (comma-separated)
4. Click "Create Trip"
5. Note the generated room code

### Joining a Trip

1. Open the application
2. Click "Join Existing Trip"
3. Enter the room code shared by trip creator
4. Click "Join"

### Adding Expenses

1. Navigate to "Expenses" tab
2. Click "Add Expense"
3. Fill in details:
   - Description (e.g., "Dinner")
   - Amount and currency
   - Who paid
   - Who participated (all or specific people)
   - Category
4. Click "Add Expense"
5. Expense syncs immediately to all participants

### Viewing Settlement

1. Navigate to "Settlement" tab
2. View settlement suggestions for optimal payment flow
3. Toggle between TWD and JPY display
4. Click "Copy" to copy settlement plan to clipboard

### Planning Itinerary

1. Navigate to "Itinerary" tab
2. Click "Add Day" to create a new day
3. Add items for each day:
   - Time
   - Location
   - Description and budget
4. Mark items as completed during the trip

## Development

### Available Commands

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Project Structure

```
src/
├── components/       # React components
│   ├── TripSetup.tsx
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   ├── Settlement.tsx
│   └── Itinerary.tsx
├── lib/
│   └── firestore.ts  # Firebase operations
├── utils/
│   └── settlement.ts # Settlement algorithm
├── types/
│   └── index.ts      # TypeScript types
├── App.tsx           # Main application
├── App.css           # Styles
└── main.tsx          # Entry point
```

## Deployment

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Configure environment variables in Vercel Dashboard:
   - Navigate to Project Settings > Environment Variables
   - Add all `VITE_FIREBASE_*` variables
   - Select all environments (Production, Preview, Development)

### Environment Variables for Vercel

Required environment variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Browser Support

### Desktop
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile
- iOS Safari 14+ (all iPhone models)
- Chrome Android 90+

### PWA Installation

#### iOS (Safari)
1. Open app in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. App installs like a native application

#### Android (Chrome)
1. Open app in Chrome
2. Tap menu button
3. Select "Add to Home Screen" or "Install App"

## Performance Optimization

### iPhone Optimization
- Safe Area insets for notch and home indicator
- 44px minimum touch target sizes (Apple HIG compliance)
- 16px input font size to prevent auto-zoom
- Landscape mode support
- CSS hardware acceleration

### Bundle Optimization
- JavaScript: ~545 KB (gzipped: ~170 KB)
- CSS: ~15 KB (gzipped: ~3 KB)
- Service Worker caching: 23 entries (~551 KB)

## Security Considerations

### Data Privacy
- No personal identification data collection
- No third-party tracking
- All data stored in your Firebase project
- Room codes provide access control

### Firebase Security
- Room code system for basic privacy
- Firestore security rules restrict access
- Test mode expires after 30 days
- Production rules should be configured before public use

## Known Limitations

1. Single trip per device at a time
2. Room code security - anyone with code can access trip data
3. Offline edits may conflict when multiple users edit simultaneously
4. Recommended iOS 15+ for full feature support

## Contributing

Contributions are welcome. Please follow the existing code style and include tests for new features.

## License

MIT License

## Support

For issues and questions:
1. Check browser console for error messages
2. Verify Firebase configuration
3. Ensure Firestore Database is enabled
4. Check Firestore security rules

## Technical Documentation

For detailed technical implementation information, see [TECHNIQUES.md](./TECHNIQUES.md).

---

**Live Demo:** https://japan-trip-pwa-jade.vercel.app
