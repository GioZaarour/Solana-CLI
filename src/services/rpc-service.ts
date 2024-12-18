import { Connection } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

interface RpcEndpoint {
    url: string;
    name: string;
    priority: number;
    isHealthy: boolean;
    lastHealthCheck: number;
}

export class RpcService {
    private endpoints: RpcEndpoint[] = [];
    private healthCheckInterval: number = 5 * 60 * 1000; // 5 minutes
    private currentEndpointIndex: number = 0;

    constructor() {
        // Primary endpoint from environment variable
        const primaryUrl = process.env.MAIN_RPC_URL;
        if (!primaryUrl) {
            throw new Error('MAIN_RPC_URL environment variable is not set');
        }

        // Add primary endpoint
        this.endpoints.push({
            url: primaryUrl,
            name: 'Primary',
            priority: 1,
            isHealthy: true,
            lastHealthCheck: 0  // Force immediate health check
        });

        // Add backup endpoints if provided
        const backupUrls = process.env.BACKUP_RPC_URLS?.split(',') || [];
        const backupNames = process.env.BACKUP_RPC_NAMES?.split(',') || [];

        backupUrls.forEach((url, index) => {
            if (url.trim()) {
                this.endpoints.push({
                    url: url.trim(),
                    name: backupNames[index]?.trim() || `Backup ${index + 1}`,
                    priority: index + 2,
                    isHealthy: true,
                    lastHealthCheck: 0  // Force immediate health check
                });
            }
        });

        // Sort endpoints by priority
        this.endpoints.sort((a, b) => a.priority - b.priority);
    }

    private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<boolean> {
        try {
            const connection = new Connection(endpoint.url, 'confirmed');
            
            // Make a simple RPC call to verify the endpoint
            const response = await connection.getSlot();
            
            // ensure we got a valid slot number
            if (typeof response !== 'number' || response <= 0) {
                console.error(`Invalid response from ${endpoint.name}: Expected slot number, got ${response}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`Health check failed for ${endpoint.name}:`, error);
            return false;
        }
    }

    private async updateEndpointHealth(endpoint: RpcEndpoint): Promise<void> {
        const now = Date.now();
        if (now - endpoint.lastHealthCheck > this.healthCheckInterval) {
            endpoint.isHealthy = await this.checkEndpointHealth(endpoint);
            endpoint.lastHealthCheck = now;
            
            if (!endpoint.isHealthy) {
                console.log(`${endpoint.name} endpoint is unhealthy, will try next endpoint`);
            }
        }
    }

    public async getHealthyConnection(verbose: boolean = false): Promise<Connection> {
        // Try endpoints in order of priority
        for (let i = 0; i < this.endpoints.length; i++) {
            const endpoint = this.endpoints[i];
            await this.updateEndpointHealth(endpoint);

            if (endpoint.isHealthy) {
                if (verbose) {
                    console.log(`Using RPC endpoint: ${endpoint.name}`);
                }
                return new Connection(endpoint.url, 'confirmed');
            } else if (verbose) {
                console.log(`Skipping unhealthy endpoint: ${endpoint.name}`);
            }
        }

        throw new Error('No healthy RPC endpoints available');
    }

    public async getNextHealthyConnection(verbose: boolean = false): Promise<Connection> {
        const startIndex = this.currentEndpointIndex;
        let tried = 0;

        while (tried < this.endpoints.length) {
            const endpoint = this.endpoints[this.currentEndpointIndex];
            await this.updateEndpointHealth(endpoint);

            if (endpoint.isHealthy) {
                if (verbose) {
                    console.log(`Using RPC endpoint: ${endpoint.name}`);
                }
                return new Connection(endpoint.url, 'confirmed');
            } else if (verbose) {
                console.log(`Skipping unhealthy endpoint: ${endpoint.name}`);
            }

            // Move to next endpoint
            this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
            tried++;
        }

        throw new Error('No healthy RPC endpoints available');
    }
} 