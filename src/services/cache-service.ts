import * as fs from 'fs';
import * as path from 'path';

interface CacheEntry {
    programId: string;
    deploymentSignature: string;
    deploymentSlot: number;
    deploymentTimestamp: number;
    lastChecked: number;
    isProgramData?: boolean;
    programDataAccount?: string;
}

export class CacheService {
    private cacheDir: string;
    private cacheFile: string;
    private cache: Map<string, CacheEntry>;
    private cacheValidityPeriod: number = 24 * 60 * 60 * 1000; // 24 hours

    constructor() {
        this.cacheDir = path.join(__dirname, '..', '..', '.cache');
        this.cacheFile = path.join(this.cacheDir, 'program-deployments.json');
        this.cache = new Map();
        this.loadCache();
    }

    private loadCache(): void {
        try {
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
            }

            if (fs.existsSync(this.cacheFile)) {
                const data = fs.readFileSync(this.cacheFile, 'utf8');
                const entries = JSON.parse(data);
                this.cache = new Map(Object.entries(entries));
            }
        } catch (error) {
            console.error('Error loading cache:', error instanceof Error ? error.message : 'Unknown error');
            // If cache loading fails, we'll start with an empty cache
            this.cache = new Map();
        }
    }

    private saveCache(): void {
        try {
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
            }
            const data = JSON.stringify(Object.fromEntries(this.cache), null, 2);
            fs.writeFileSync(this.cacheFile, data, 'utf8');
        } catch (error) {
            console.error('Error saving cache:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    public getCachedDeployment(programId: string): CacheEntry | null {
        const entry = this.cache.get(programId);
        
        if (!entry) {
            return null;
        }

        // Check if cache entry is still valid
        if (Date.now() - entry.lastChecked > this.cacheValidityPeriod) {
            this.cache.delete(programId);
            this.saveCache();
            return null;
        }

        return entry;
    }

    public cacheDeployment(
        programId: string,
        deploymentSignature: string,
        deploymentSlot: number,
        deploymentTimestamp: number,
        isProgramData: boolean = false,
        programDataAccount?: string
    ): void {
        const entry: CacheEntry = {
            programId,
            deploymentSignature,
            deploymentSlot,
            deploymentTimestamp,
            lastChecked: Date.now(),
            isProgramData,
            programDataAccount
        };

        this.cache.set(programId, entry);
        this.saveCache();
    }

    public clearCache(): void {
        this.cache.clear();
        this.saveCache();
        
        // Also remove the cache file and directory
        try {
            if (fs.existsSync(this.cacheFile)) {
                fs.unlinkSync(this.cacheFile);
            }
            if (fs.existsSync(this.cacheDir)) {
                fs.rmdirSync(this.cacheDir);
            }
        } catch (error) {
            console.error('Error removing cache files:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    public getCacheStats(): { total: number; valid: number; expired: number } {
        const now = Date.now();
        let valid = 0;
        let expired = 0;

        this.cache.forEach(entry => {
            if (now - entry.lastChecked <= this.cacheValidityPeriod) {
                valid++;
            } else {
                expired++;
            }
        });

        return {
            total: this.cache.size,
            valid,
            expired
        };
    }
} 