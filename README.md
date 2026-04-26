# Modern E-commerce Platform with Integrated Inventory & Order Tracking
### A Full-Stack Retail Solution with Real-time Intelligence
This project is a high-performance web application combining a premium consumer shopping experience with a robust, data-driven administrative backend for inventory and logistics management.

> [!IMPORTANT]
> **Admin Access for All:** For demonstration purposes, the current version of the application grants **administrative privileges to any signed-in user**. This allows everyone to explore the Command Center and manage products/orders.

## Project Overview
This project is a complete e-commerce ecosystem designed for modern brands. It bridges the gap between customer-facing storefronts and internal operations. Customers enjoy a fluid, animated shopping experience with secure checkout, while business owners gain a powerful "Command Center" to manage global stock, analyze sales trends, and track order fulfillment in real-time.

## Problem Statement & Goals
Traditional e-commerce platforms often have a "blind spot" between sales and inventory. This system solves that by providing absolute synchronicity between a customer's purchase and the warehouse's stock levels.

**Key Objectives:**
- **Customer Side:** Offer a premium discoverability experience with smooth transitions, category filtering, and real-time cart updates.
- **Inventory Control:** Monitor "Healthy," "Low," and "Out of Stock" levels with automated net availability calculations.
- **Logistics Visibility:** Track every order through its lifecycle—from "Awaiting Dispatch" to "Settled" with custom location tracking.
- **Business Intelligence:** Transform raw transaction data into visual KPIs (Revenue, Profit, Sales Velocity).

## Domain Concept Explanation
**Real-time Stock Reconciliation** is the core philosophy. Every time an order is placed, the system automatically decrements inventory. If an order is returned, stock is incremented. This ensures that the admin always sees the "True Remaining Product" count, eliminating human error in inventory reporting.

## Solution Approach
The platform uses a "Reactive Single Source of Truth" architecture:
- **Frontend (React + Tailwind + Motion):** A professional-grade UI that feels native and responsive.
- **Backend (Firebase Firestore):** A NoSQL database that pushes real-time updates to all connected clients.
- **Full-Stack Analytics:** Custom logic layers that aggregate Firestore data into Recharts visualizations.
- **Auth (Firebase Authentication):** Secure multi-role access control (Customer vs. Admin).

## Technical Architecture
```
+-------------------+       +-------------------+
|   Customer UI     | <---> |   Cart Service    |
+-------------------+       +-------------------+
          ^                         |
          | (Real-time Sync)        v
+-------------------+       +-------------------+
|  Firestore DB     | <---> |  Admin Intelligence|
+-------------------+       +-------------------+
          ^                         |
          | (CRUD Operations)       v
+-------------------+       +-------------------+
|  Inventory Mgmt   | <---  |  Visual Analytics |
+-------------------+       +-------------------+
```

## Key Components & Implementation Details
- **Storefront Home:** Features a dynamic hero section and a category-filtered product grid with real-time "Skeleton" loading states.
- **Admin Dashboard:** A massive, information-dense hub featuring:
    - **Inventory Health Donut Chart:** Visual stock categorization.
    - **Weekly Revenue Area Chart:** 7-day sales performance tracking.
    - **Category Revenue Pie Chart:** Diversity of sales across product types.
- **Checkout Service:** Integrated with Firebase to create persistence orders and update global product inventory atomically.
- **Order Tracking:** Allows admins to set "Estimated Delivery" and "Current Location" for individual items within an order.

## System Logic / Analytics Insights
The system uses a combination of Firestore listeners and `useMemo` hooks to provide instant insights:
- **Inventory Capacity:** `Total Catalog Count - (Net Sold - Returns)`.
- **Sales Velocity:** Aggregates total revenue from the last 7 days.
- **Order Mix:** Visualizes the distribution of fulfillment statuses (Pending vs. Shipped vs. Delivered).
- **Runway Analysis:** Predicts how many days of stock are left based on current sales speed.

## Usage / Workflow
1. **Shopper Workflow:** Discovery -> Persistent Cart -> Sign-In -> Secure Checkout -> Order History Tracking.
2. **Admin Workflow:** Login with **any account** -> Access the **Admin Panel** button in the header -> View Intelligence Overview -> Adjust Catalog -> Process Orders.

## Security & Secret Management (GitHub Users)
If you have received GitHub alerts regarding exposed secrets (e.g., "Google API Key detected"), follow these steps to secure your repository:

### 1. The Alert Cause
GitHub scans for the **Firebase Web API Key** (starting with `AIza...`). While this key is technically **public by design** in web applications, it is best practice to keep your repository history clean.

### 2. How to Fix "Secrets Detected"

**A. Clean your repository history**
If a secret was committed, it remains in the Git history even if the file is deleted. Purge it using these commands:
```bash
git rm --cached firebase-applet-config.json
git commit -m "chore: remove config file from history and ensure it stays ignored"
git push origin main
```

**B. Ignore the config file**
The `.gitignore` has been updated to include `firebase-applet-config.json`. This ensures your unique database credentials are never uploaded to GitHub again.

**C. Rotation**
If you suspect your key has been compromised (even if it's a web key), you can rotate it in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

## Installation & Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Firebase account](https://console.firebase.google.com/)

### 2. Local Setup
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd ecommerce-inventory-system
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. **Configure Firebase:**
   Since `firebase-applet-config.json` is ignored by git, you must provide your own configuration. You can do this in two ways:
   
   - **Method A (Config File):** Create a file named `firebase-applet-config.json` in the root directory with the following structure:
     ```json
     {
       "apiKey": "YOUR_API_KEY",
       "authDomain": "YOUR_PROJECT.firebaseapp.com",
       "projectId": "YOUR_PROJECT_ID",
       "storageBucket": "YOUR_PROJECT.appspot.com",
       "messagingSenderId": "YOUR_SENDER_ID",
       "appId": "YOUR_APP_ID",
       "firestoreDatabaseId": "(default)"
     }
     ```
   - **Method B (Environment Variables):** Create a `.env` file and add the variables listed in `.env.example`.

4. Start the development server:
   ```bash
   npm run dev
   ```

## Folder Structure
```
ecommerce-inventory-system/
|-- src/
|   |-- components/      
|   |-- contexts/       
|   |-- services/        
|   |-- constants.ts     
|   |-- types.ts         
|   |-- App.tsx         
|-- public/              
|-- firestore.rules     
|-- firebase-blueprint.json 
|-- security_spec.md     
```

## Real-World Applications
- **Direct-to-Consumer (D2C) Brands:** Needing a custom storefront with high-performance back-office.
- **Electronic/Gadget Retailers:** Requiring precise serial number and stock health tracking.
- **Warehouse Management Hubs:** For small businesses transitioning from offline to online operations.

## Future Enhancements
- **AI Forecasting:** Predicting seasonal trends using Gemini AI.
- **Multi-Vendor Dashboard:** Allowing multiple sellers to manage their individual inventories.
- **QR/Barcode Integration:** For scanning physical shipments directly into the tracking system.
