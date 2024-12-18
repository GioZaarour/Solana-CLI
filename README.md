# Solana Program CLI

A command-line tool to fetch info about Solana programs (smart contracts). Currently is capable of fetching the initial deployment transaction and timestamp of any program. Has features like caching and RPC fallback for reliablity.

## Features

- Get deployment timestamp for any Solana program (Native programs or Sysvar accounts excluded)
- Local caching system for faster subsequent queries
- Multiple RPC endpoint support with automatic fallback
- Verbose mode for detailed operation information
- Cache management commands
- Integration testing
- Docker support

## Prerequisites

- Node.js
- npm
- A Solana RPC endpoint URL (e.g., from Helius)

## Installation

### Option 1: Local Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file from the template and configure your RPC endpoint(s)

3. Build the project:
   ```bash
   npm run build
   ```

6. Install globally:
   ```bash
   npm install -g .
   ```

### Option 2: Docker Installation

1. Create a `.env` file from the template and configure your RPC endpoint(s)

3. Build the Docker image:
   ```bash
   docker build -t solana-deploy-time .
   ```

4. Run the container and start an interactive shell:

    ```bash
    # Start interactive shell (container will be removed when you exit)
    docker run -it --env-file .env solana-deploy-time

    # Once inside the container, you can run commands:
    solana-deploy-time --help
    solana-deploy-time get-timestamp <program-id>
    solana-deploy-time cache-stats

    # To exit the container (this will also remove it)
    exit
    ```

    Note: 
    - The cache persists within the container. If you need to clear the cache between runs, use the clear-cache command.

## Usage/Commands

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

## Testing

The project includes an application test that verifies the CLI functionality:
```bash
npm test
```

This test covers:
- Program detection (native and deployed programs)
- Cache operations (creation, clearing, stats)
- Error handling (invalid inputs, RPC errors)


## Code Architecture

### Core Components

1. **CLI Interface** (`src/cli.ts`)
   - Handles command-line argument parsing
   - Provides user interface and output formatting
   - Manages command routing and execution

2. **Program Service** (`src/services/program-service.ts`)
   - Core logic for program (smart contract) identification and RPC calls
   - Sifts through transactions of a program's Program Executable Data Account to identify the deployment transaction
   - Differentiates between non-programs, Native Programs or Sysvar Accounts, and custom programs (the ones users are interested in)
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
   - Maintains a list of known native programs and sysvar accounts
   - Identifies custom programs and the addresses of their `Program Executable Data Account` through the account data (see [Solana Account Model](https://solana.com/docs/core/accounts))

2. **Deployment Detection**
   - Analyzes transaction history of the `Program Executable Data Account`
   - Identifies deployment transactions through log messages
   - Handles all inputs (non-programs, native programs, custom programs)

3. **RPC Management**
   - Primary and backup RPC endpoint support
   - Automatic health checks
   - Graceful error handling

4. **Caching System**
   - JSON-based local cache
   - 24-hour cache validity
   - Cache statistics tracking
