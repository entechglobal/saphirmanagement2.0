# Product Management System (Gestion de Produits)

A complete admin dashboard for product management built with React, Vite, and Material UI.

## Tech Stack

- **React** (JSX) - UI framework
- **Vite.js** - Build tool
- **React Query** (TanStack Query) - Data fetching & state management
- **Axios** - HTTP client
- **Tailwind CSS v3** - Styling
- **Material UI** - Tables, dialogs, inputs, pagination
- **Recharts** - Charts and data visualization
- **React Router** - Routing

## Features

### Authentication & Authorization
- Role-based access control (Admin, Sub-Admin, Cashier)
- Protected routes with permission checks
- Demo credentials included for testing

### Dashboard
- Real-time statistics (products, categories, sales, revenue)
- Interactive charts (sales overview, category distribution)
- Recent sales tracking
- Growth indicators

### Product Management
- **Categories** - Organize products into categories
- **Articles** - Full product inventory management
- **Families** - Group related categories

### Sales & Management
- Purchase management (Achats)
- Sales tracking (Ventes)
- Reports and analytics (Situation)
- Point of Sale system (POS)

### User Management (Admin Only)
- Create, update, and delete users
- Role assignment and management
- User status tracking

### UI/UX Features
- Dark mode & Light mode toggle
- Language switcher (French/English)
- Fully responsive design
- Collapsible sidebar navigation
- Profile menu with user info

## Project Structure

```
src/
├── app/
│   ├── providers/          # Context providers (Query, Theme, Language)
│   ├── router/             # React Router configuration
│   └── App.jsx             # Main app component
│
├── features/               # Feature-based modules
│   ├── auth/               # Authentication
│   ├── dashboard/          # Dashboard stats & charts
│   ├── products/           # Product management
│   └── users/              # User management
│
├── shared/
│   ├── api/                # Axios config & query client
│   ├── components/         # Reusable components
│   └── utils/              # Utility functions (permissions)
│
├── pages/                  # Page components
└── main.jsx                # App entry point
```

## Role-Based Access Control

### Admin
- Full system access
- User management
- All permissions

### Sub-Admin
- Product management (categories, articles, families)
- Sales and purchase management
- Limited settings access
- Cannot manage users

### Cashier
- Point of Sale access only
- Sales viewing
- No administrative access

## Getting Started

### Installation

```bash
npm install
```

### Development and run the app 

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production

```bash
npm run preview
```

## Demo Credentials

```
Admin:
Email: admin@example.com
Password: admin123

Sub-Admin:
Email: subadmin@example.com
Password: subadmin123

Cashier:
Email: cashier@example.com
Password: cashier123
```

## Implementation Details

### Dark Mode
- Uses React Context for theme management
- Persists preference in localStorage
- Applies to all components with dark: Tailwind variants

### Language Switching
- React Context for language state
- Translation object with FR/EN support
- Easy to extend with more languages
- Persists selection in localStorage

### Sidebar Routing
- Parent menu items can expand/collapse
- Role-based visibility (items hidden if user lacks permission)
- Mobile responsive with overlay
- Active route highlighting

### Data Handling
- All API calls use React Query for caching & state management
- Mock data for demo (easily replaceable with real API)
- Optimistic updates with automatic cache invalidation
- Error handling built-in

## Switching from Mock to Real API

1. Update API base URL in `src/shared/api/axios.js`
2. Replace mock implementations in feature API files with real axios calls
3. All React Query hooks will work without changes
4. Add proper error handling as needed

## Color System

- **Primary**: #B12B89 (blue - logo, buttons)
- **Light Background**: White
- **Dark Background**: #222531
- **Semantic colors** for status indicators (success, warning, error)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

MIT
