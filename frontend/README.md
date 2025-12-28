# Vue 3 + Vite


# Frontend
## Project Overview
Frontend is a Vue 3 single-page application built using Vite. The system is designed to serve as a Point of Sale (POS) and Stock / Inventory Management system. It provides an interface for managing products, tracking inventory levels, handling sales transactions, and supporting pharmancy operations efficiently through a modern web interface.
The application is structured to support teamwork, scalability, and maintainability.
---
## Project Structure

src/
├── assets/
│ ├── images/
│ └── styles/
│ └── main.css
│
├── modules/
│ ├── auth/
│ │ ├── components/
│ │ ├── views/
│ │ ├── store.js
│ │ └── router.js
│ │
│ ├── dashboard/
│ │ ├── components/
│ │ ├── views/
│ │ └── store.js
│ │
│ └── shared/
│ ├── components/
│ │ └── BaseButton.vue
│ └── composables/
│ └── useFetch.js
│
├── router/
│ └── index.js
│
├── store/
│ └── index.js
│
├── App.vue
└── main.js

### Structure Explanation
• **assets/**: Contains global styles and images processed by Vite.
• **modules/**: Feature-based folders that group components, views, stores, and routes by application functionality.
• **shared/**: Contains reusable components and logic shared across multiple features.
• **router/**: Central routing configuration.
• **store/**: Global state management setup.
• **App.vue**: Root component that defines the global layout.
• **main.js**: Application entry point.
---
## Setup Instructions
### Prerequisites
• Node.js (version 16 or higher)
• npm or yarn

### Installation
```bash
npm install
Run the Development Server
npm run dev
The application will be available at:
http://localhost:5173
##Shared Components
Shared components are located in:
src/modules/shared/components/
These components are reusable UI elements designed to be used across different features such as authentication, sales, inventory, and dashboards.
Example: BaseButton
Location: src/modules/shared/components/BaseButton.vue
Purpose: Provides a consistent button design across the application.

Usage:
<BaseButton>Save</BaseButton>
Guidelines for Shared Components
Use clear and descriptive names (e.g., BaseButton, BaseInput)
Avoid feature-specific logic
Keep components flexible using props and slots
Document usage when adding new shared components
Shared logic (non-UI functionality) is placed in:
src/modules/shared/composabl

## Collaboration Guidelines

-Feature-specific code should stay within its module folder.
-Reusable components and logic must be placed in the shared module.
-All contributors should update documentation when adding major features or components.





