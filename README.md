# Localization Manager

A lightweight and efficient tool for managing i18n JSON files. Supports loading, editing, deleting, and creating keys directly in the file system, with bulk-saving and search functionality. Changes are made directly to JSON files without relying on external data sources.

## Features

- Load and modify locale files from a selected directory.
- Create, edit, delete, and bulk-save translations.
- Built-in safeguards for unsaved changes with confirmation dialogs.
- Simple and intuitive UI for streamlined localization management.

## Prerequisites

- [asdf](https://asdf-vm.com/)
- [Bun](https://bun.sh)

## Setup

```sh
asdf install       # Install tools defined in .tool-versions
bun install        # Install dependencies
```

## Development

```sh
bun run dev        # Start FE server
bunx tauri dev     # Start Tauri BE server
```

## Compile from source

```sh
bun run build      # Build FE assets
bunx tauri build   # Compile app
```
