import { Connection, PublicKey } from '@solana/web3.js';
import { RpcService } from './rpc-service';
import { CacheService } from './cache-service';

interface DeploymentInfo {
    signature: string;
    slot: number;
    timestamp: number;
    programDataAccount?: string;
}

// List of known native programs
const NATIVE_PROGRAMS = new Set([
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',     // Token Program
    'ComputeBudget111111111111111111111111111111',      // Compute Budget
    'BPFLoader2111111111111111111111111111111111',      // BPFLoader2
    'BPFLoader1111111111111111111111111111111111',      // BPFLoader1
    'Feature111111111111111111111111111111111111',      // Feature Program
    'NativeLoader1111111111111111111111111111111',      // Native Loader
    'Sysvar1111111111111111111111111111111111111',     // Sysvar
    '11111111111111111111111111111111',       
    'Config1111111111111111111111111111111111111',
    'Stake11111111111111111111111111111111111111',
    'Vote111111111111111111111111111111111111111',
    'AddressLookupTab1e1111111111111111111111111',
    'BPFLoaderUpgradeab1e11111111111111111111111',
    'Ed25519SigVerify111111111111111111111111111',
    'KeccakSecp256k11111111111111111111111111111',
    'Secp256r1SigVerify1111111111111111111111111'
]);

// List of BPFLoader program IDs that can own program accounts
const BPF_LOADER_PROGRAMS = new Set([
    'BPFLoader2111111111111111111111111111111111',      // BPFLoader2
    'BPFLoader1111111111111111111111111111111111',      // BPFLoader1
    'BPFLoaderUpgradeab1e11111111111111111111111',      // BPFLoaderUpgradeable
]);

export class ProgramService {
    private rpcService: RpcService;
    private cacheService: CacheService;

    constructor() {
        this.rpcService = new RpcService();
        this.cacheService = new CacheService();
    }

    private isNativeProgram(programId: string): boolean {
        return NATIVE_PROGRAMS.has(programId);
    }

    private isProgramAccount(owner: string): boolean {
        return BPF_LOADER_PROGRAMS.has(owner);
    }

    private async findDeploymentTransaction(
        connection: Connection,
        targetAccount: PublicKey,
        programId: string,
        verbose: boolean
    ): Promise<DeploymentInfo | null> {
        try {
            const signatures = await connection.getSignaturesForAddress(targetAccount);
            
            if (signatures.length === 0) {
                return null;
            }

            // Sort by slot to get the earliest first
            signatures.sort((a, b) => (a.slot || 0) - (b.slot || 0));

            for (const sig of signatures) {
                if (verbose) {
                    console.log(`Checking signature: ${sig.signature}`);
                }

                const tx = await connection.getParsedTransaction(sig.signature, {
                    maxSupportedTransactionVersion: 0
                });

                if (!tx?.meta?.logMessages) {
                    continue;
                }

                if (verbose) {
                    console.log('Transaction logs:');
                    tx.meta.logMessages.forEach(log => console.log(log));
                }

                const isDeployment = tx.meta.logMessages.some(log => 
                    log.includes('Deployed program') || 
                    log.includes('Deploy with ID') ||
                    (log.includes(programId) && log.includes('success'))
                );

                if (isDeployment) {
                    return {
                        signature: sig.signature,
                        slot: sig.slot || 0,
                        timestamp: sig.blockTime || 0
                    };
                }
            }

            return null;
        } catch (error) {
            if (verbose) {
                console.error('Error in findDeploymentTransaction:', error instanceof Error ? error.message : 'Unknown error');
            }
            return null;
        }
    }

    public async getDeploymentInfo(programId: string, verbose: boolean = false): Promise<DeploymentInfo | null> {
        // First check if this is a native program
        if (this.isNativeProgram(programId)) {
            return null;  // Indicate this is a native program
        }

        // Check cache for non-native programs
        const cachedInfo = this.cacheService.getCachedDeployment(programId);
        if (cachedInfo) {
            if (verbose) {
                console.log('Using cached deployment information');
            }
            return {
                signature: cachedInfo.deploymentSignature,
                slot: cachedInfo.deploymentSlot,
                timestamp: cachedInfo.deploymentTimestamp,
                programDataAccount: cachedInfo.programDataAccount
            };
        }

        let lastError: Error | null = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const connection = await this.rpcService.getNextHealthyConnection(verbose);
                
                // Get program account info
                const accountInfo = await connection.getParsedAccountInfo(new PublicKey(programId));
                
                if (!accountInfo.value) {
                    throw new Error('Account not found');
                }

                // Check if this is actually a program account
                if (!this.isProgramAccount(accountInfo.value.owner.toString())) {
                    throw new Error('Not a program account. This appears to be a regular account or token.');
                }

                // Get the program data account if it exists
                const programData = (accountInfo.value.data as any).parsed?.info?.programData;
                const targetAccount = programData ? new PublicKey(programData) : new PublicKey(programId);

                if (verbose && programData) {
                    console.log('Program Data Account:', programData);
                }

                // Find deployment transaction
                const deploymentInfo = await this.findDeploymentTransaction(
                    connection,
                    targetAccount,
                    programId,
                    verbose
                );

                if (!deploymentInfo) {
                    throw new Error('Could not find deployment transaction');
                }

                // Cache the result
                this.cacheService.cacheDeployment(
                    programId,
                    deploymentInfo.signature,
                    deploymentInfo.slot,
                    deploymentInfo.timestamp,
                    !!programData,
                    programData
                );

                return deploymentInfo;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                if (verbose) {
                    console.error(`Attempt ${attempts + 1} failed:`, lastError.message);
                }
                attempts++;
            }
        }

        throw lastError || new Error('Failed to get deployment information');
    }

    public clearCache(): void {
        this.cacheService.clearCache();
    }

    public getCacheStats(): { total: number; valid: number; expired: number } {
        return this.cacheService.getCacheStats();
    }
} 