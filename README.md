# Solana Program Deployment Timestamp CLI

A command-line tool to get the timestamp when a Solana program was first deployed. This tool supports both native and upgradeable programs, with features like caching and RPC fallback for reliable operation.

## Features

- Get deployment timestamp for any Solana program
- Instant response for native Solana programs
- Support for both native and upgradeable programs
- Local caching system for faster subsequent queries
- Multiple RPC endpoint support with automatic fallback
- Verbose mode for detailed operation information
- Cache management commands

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- A Solana RPC endpoint (e.g., from Helius)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/solana-cli.git
   cd solana-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

4. Configure your RPC endpoint in `.env`:
   ```
   MAIN_RPC_URL=https://your-rpc-endpoint
   BACKUP_RPC_URLS=https://backup1,https://backup2
   BACKUP_RPC_NAMES=Backup1,Backup2
   ```

5. Build the project:
   ```bash
   npm run build
   ```

6. Install globally:
   ```bash
   npm install -g .
   ```

## Usage

### Basic Commands

Get deployment timestamp for a program:
```bash
solana-deploy-time get-timestamp <program-id>
```

With verbose output:
```bash
solana-deploy-time get-timestamp <program-id> -v
```

### Cache Management

Show cache statistics:
```bash
solana-deploy-time cache-stats
```

Clear the cache:
```bash
solana-deploy-time clear-cache
```

### Examples

1. Check a native program:
```bash
solana-deploy-time get-timestamp TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```

2. Check a deployed program:
```bash
solana-deploy-time get-timestamp 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
```

3. Check with verbose output:
```bash
solana-deploy-time get-timestamp 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P -v
```

## System Architecture

### Core Components

1. **CLI Interface** (`src/cli.ts`)
   - Handles command-line argument parsing
   - Provides user interface and output formatting
   - Manages command routing and execution

2. **Program Service** (`src/services/program-service.ts`)
   - Core logic for program detection and analysis
   - Handles native program identification
   - Manages program deployment detection logic
   - Coordinates between RPC and cache services

3. **RPC Service** (`src/services/rpc-service.ts`)
   - Manages RPC endpoint connections
   - Implements health checks and fallback logic
   - Provides reliable connection handling

4. **Cache Service** (`src/services/cache-service.ts`)
   - Implements local caching system
   - Manages cache validity and cleanup
   - Provides cache statistics

### Key Features Implementation

1. **Program Type Detection**
   - Maintains a list of known native programs
   - Identifies upgradeable programs through account data
   - Handles program data account resolution

2. **Deployment Detection**
   - Analyzes transaction history
   - Identifies deployment transactions through log messages
   - Handles both native and upgradeable program cases

3. **RPC Management**
   - Primary and backup RPC endpoint support
   - Automatic health checks
   - Round-robin endpoint selection
   - Graceful error handling

4. **Caching System**
   - JSON-based local cache
   - 24-hour cache validity
   - Automatic cache cleanup
   - Cache statistics tracking

## Testing

The project includes an application test that verifies the CLI functionality:
```bash
npm test
```

This test covers:
- Basic CLI functionality (help, version)
- Program detection (native and deployed programs)
- Cache operations (creation, clearing, stats)
- Error handling (invalid inputs, RPC errors)
- Performance (caching benefits)

## Error Handling

The tool handles various error cases:
- Invalid program IDs
- Non-program accounts
- RPC connection failures
- Missing environment variables
- Cache read/write errors

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License. 