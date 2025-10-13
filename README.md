# CommFlow - Commission Management Application

A Simple desktop app made for small artists looking to manage their art commissions, built with Tauri + React + TypeScript.

![CommFlow Version](https://img.shields.io/badge/version-0.6.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Quick Start

### Windows Installation
#### Deployment (Windows Portable Build)
#### Install / Update (Portable Build)

1. Download Latest Release from the release section
2. Extract the Zip files in any folder you find more comfy
3. Every Update you just replace the previous files with the new ones, without touching the data folder you already created !

#### Deployment (Windows Portable Build)

To generate a portable Windows build locally:

1. Ensure you've run `npm install` at least once (the script will do it automatically if `node_modules/` is missing).
2. Execute the PowerShell helper:

	```powershell
	./DeployScripts/Build-WindowsPortable.ps1
	```

	Use `-SkipRestore` to skip dependency restoration.
3. The script outputs `deploy-artifacts/CommFlow-portable/` containing the executable, license, and signature file, plus a `CommFlow-portable.zip` ready for use.

#### ⚠️ Please Read! - Why the Security Warning When launching the app?

Currently i cant afford any kind of license.. but that might change in the future but for now -->

- CommFlow is **open source** - you can verify the code yourself
- The App was made Mainly for my personal use but some friends found it useful, and i bet more will find it useful
- The app is **safe** - no viruses, malware, or sketchy stuff, like i mentioned before you can check the code yourself (i know its a mess qwq)
- Once im able to afford a license i promise i will for future apps n such nwn (ye im quite broke atm hehe)

### Features
-  Manage client information and commission details
-  Track pricing and payment status
-  Organize commission files and references
-  View commission history and statistics
-  Built specifically for digital artists
