# HUBTender

A modern React application built with Vite and TypeScript.

## Features

- ⚡️ Fast development with Vite
- ⚛️ React 18
- 🎨 TypeScript support
- 📝 ESLint configuration
- 🎯 Modern folder structure

## Project Structure

```
HUBTender/
├── public/                 # Static files
├── src/                    # Source code
│   ├── assets/            # Images, fonts, etc
│   │   ├── icons/         # Icon files
│   │   └── images/        # Image files
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── styles/           # Global styles
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Main App component
│   ├── App.css           # App styles
│   ├── index.css         # Global styles
│   ├── main.tsx          # Application entry point
│   └── vite-env.d.ts     # Vite types
├── .eslintrc.cjs         # ESLint configuration
├── .gitignore            # Git ignore file
├── index.html            # HTML template
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
├── tsconfig.node.json    # TypeScript config for Vite
├── vite.config.ts        # Vite configuration
└── README.md             # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd HUBTender
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

### Build

Build for production:

```bash
npm run build
# or
yarn build
```

### Preview

Preview the production build:

```bash
npm run preview
# or
yarn preview
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
# or
yarn lint
```

## Technologies

- **React** - UI library
- **Vite** - Build tool and development server
- **TypeScript** - Type-safe JavaScript
- **ESLint** - Code linting
- **CSS** - Styling

## Development Guidelines

### Components

- Place reusable components in `src/components/`
- Use TypeScript for all component files
- Follow React best practices and hooks

### Styling

- Global styles go in `src/index.css`
- Component-specific styles can use CSS modules or styled-components
- Keep styles modular and maintainable

### Types

- Define TypeScript types in `src/types/`
- Use interfaces for object shapes
- Leverage TypeScript's type inference when possible

### Services

- API calls and external services go in `src/services/`
- Keep business logic separate from UI components

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

Project Link: [https://github.com/yourusername/HUBTender](https://github.com/yourusername/HUBTender)