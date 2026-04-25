# Vantage

A premium service management and monitoring dashboard, built with Electron, React, and Vite. Vantage empowers you to manage multiple microservices, repositories, and environments in a centralized, highly-visual workspace.

## 🚀 Recent Developments

- **Single Executable & Portable Mode**: Built a robust packaging pipeline with NSIS to generate both a single-file installer and a 100% portable `.exe`.
- **GitHub Actions Integration**: Automated CI/CD pipelines to build Windows executables directly from GitHub Actions on push to `main`.
- **Git Plugin Integrations**: Fully functional Git integration for multi-repo status tracking, cloning, checkout, and Git persona profiles.
- **Environment Management**: Create, switch, and visualize different `.env` profiles (e.g., dev, prod, staging) per service without modifying files manually.
- **Project Clusters**: Group related microservices into logical clusters and start/stop them simultaneously.
- **Archiving System**: Safely archive inactive services to reduce dashboard clutter and easily restore them from the vault.

## ⬇️ Download

[**Download for Windows (Portable & Installer)**](https://github.com/koushikreddy22/workbench-manager-desktop/actions/runs/24227492581/artifacts/6364683220)

## 🛠️ Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## 📦 Project Setup

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
# For Windows Installer & Portable EXE
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```
