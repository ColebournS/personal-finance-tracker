# Personal Finance Tracker

Visit http://finance.samcolebourn.com/ to use!

A simple and free personal finance tracking app that helps users manage their salary, set monthly budgets, log purchases, and visualize their spending with interactive charts. Built with React, Supabase, and hosted on GitHub Pages.

## Features

### Core Functionality
- **Income Management**: Input salary information and automatically calculate take-home pay with tax deductions
- **Budget Planning**: Create budget groups and items with custom amounts
- **Purchase Tracking**: Log purchases and link them to budget categories
- **Real-time Updates**: Live data synchronization across all views
- **Bulk Import**: Import multiple purchases at once via CSV/TSV data

## Tech Stack

- **Frontend**: React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL Database)
- **Authentication**: Supabase Authentication
- **Charts**: Chart.js with react-chartjs-2
- **Icons**: Lucide React
- **Hosting**: GitHub Pages (Frontend) and Supabase (Backend)
- **State Management**: React Context API with optimized hooks

## Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/colebourns/personal-finance-tracker.git
   cd personal-finance-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

### Deploy to GitHub Pages

```bash
npm run deploy
```

## Project Structure

```
personal-finance-tracker/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   │   ├── Charts/      # Chart components
│   │   ├── AddPurchase.js
│   │   ├── Budget.js
│   │   ├── Income.js
│   │   ├── Purchases.js
│   │   └── ...
│   ├── App.js          # Main app component with routing
│   ├── DataContext.js  # Centralized data management
│   ├── AuthContext.js  # Authentication context
│   └── supabaseClient.js
└── package.json
```
