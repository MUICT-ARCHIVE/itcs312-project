# itcs312-project
"Digital Steganography" project for subject "ITCS312 - Computer and Communication Security"

## Prerequisites

Before running this project, ensure you have the following installed on your system:

### Required Software

1. **Node.js** (version 18.x or higher recommended)
   - Download from: [https://nodejs.org/](https://nodejs.org/)
   - Verify installation:
     ```bash
     node --version
     ```

2. **Package Manager** (choose one):
   - **npm** (comes bundled with Node.js)
     ```bash
     npm --version
     ```
   - **yarn** (optional, if you prefer yarn)
     ```bash
     npm install -g yarn
     yarn --version
     ```

### System Requirements
- Operating System: Windows, macOS, or Linux
- RAM: Minimum 4GB (8GB recommended)
- Disk Space: At least 500MB free space

## Installation

Follow these steps to set up and run the project:

### 1. Clone the Repository

```bash
git clone https://github.com/MUICT-ARCHIVE/itcs312-project.git
cd itcs312-project
```

### 2. Install Dependencies

Choose either **npm** or **yarn** (not both):

#### Using npm:
```bash
npm install
```

#### Using yarn:
```bash
yarn install
```

### 3. Run the Development Server

#### Using npm:
```bash
npm run dev
```

#### Using yarn:
```bash
yarn dev
```

The application will start on [http://localhost:3000](http://localhost:3000)

Open your browser and navigate to the URL above to see the application.

## Available Scripts

### Development Mode
Start the development server with hot-reload:
- **npm**: `npm run dev`
- **yarn**: `yarn dev`

### Production Build
Build the application for production:
- **npm**: `npm run build`
- **yarn**: `yarn build`

### Production Server
Start the production server (run build first):
- **npm**: `npm start`
- **yarn**: `yarn start`

### Linting
Check code quality with ESLint:
- **npm**: `npm run lint`
- **yarn**: `yarn lint`

## Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   - Solution: Kill the process using port 3000 or specify a different port:
     ```bash
     PORT=3001 npm run dev
     ```

2. **Module not found errors**
   - Solution: Delete `node_modules` and reinstall:
     ```bash
     rm -rf node_modules
     npm install  # or yarn install
     ```

3. **Permission errors (Linux/macOS)**
   - Solution: Don't use sudo. Fix npm permissions:
     ```bash
     mkdir ~/.npm-global
     npm config set prefix '~/.npm-global'
     ```

4. **Cache issues**
   - Clear npm cache: `npm cache clean --force`
   - Clear yarn cache: `yarn cache clean`

## Project Structure

```
itcs312-project/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes for steganography
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   └── ui/           # UI components
│   └── lib/              # Utility functions and steganography logic
├── public/               # Static assets
└── package.json          # Project dependencies
```

## Technologies Used

- **Next.js 15.5.3** - React framework with Turbopack
- **React 19.1.0** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **pngjs** - PNG image processing library
- **Radix UI** - Accessible component primitives

## Code Reference
- ["Hide Data in PNG Files Using JavaScript: A Step-by-Step Guide," JavaScript Development Space, 2024. https://jsdev.space/data-png-steganography-js/ (accessed Sep. 23, 2025).](https://jsdev.space/data-png-steganography-js/)