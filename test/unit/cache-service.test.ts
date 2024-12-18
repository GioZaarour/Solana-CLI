import { CacheService } from '../../src/services/cache-service';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

// Suppress console output during tests
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('CacheService', () => {
    let cacheService: CacheService;
    const mockCacheDir = '/mock/cache/dir';
    const mockCachePath = '/mock/cache/dir/program-deployments.json';
    const NOW = 1600000000000; // Fixed timestamp for tests
    const HOUR = 60 * 60 * 1000;
    const CACHE_TTL = 24 * HOUR;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock path.join to return our mock cache path
        (path.join as jest.Mock).mockImplementation((...args) => {
            if (args.includes('program-deployments.json')) {
                return mockCachePath;
            }
            return mockCacheDir;
        });

        // Mock fs.existsSync for cache directory and file
        (fs.existsSync as jest.Mock).mockImplementation((path) => {
            return path === mockCacheDir || path === mockCachePath;
        });

        // Mock fs.mkdirSync
        (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);

        // Mock fs.writeFileSync
        (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);

        // Mock Date.now
        jest.spyOn(Date, 'now').mockImplementation(() => NOW);

        // Initialize service with empty cache by default
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({}));
        cacheService = new CacheService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Cache Operations', () => {
        test('should initialize empty cache when no file exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const newCacheService = new CacheService();
            expect(newCacheService.getCacheStats().total).toBe(0);
        });

        test('should cache new deployment info', () => {
            const programId = 'test-program';
            const signature = 'test-signature';
            const slot = 1000;
            const timestamp = NOW - HOUR; // Recent timestamp
            
            cacheService.cacheDeployment(
                programId,
                signature,
                slot,
                timestamp,
                false
            );

            const cachedInfo = cacheService.getCachedDeployment(programId);
            expect(cachedInfo).toBeDefined();
            expect(cachedInfo?.deploymentSignature).toBe(signature);
            expect(cachedInfo?.deploymentSlot).toBe(slot);
            expect(cachedInfo?.deploymentTimestamp).toBe(timestamp);
            expect(cachedInfo?.programDataAccount).toBeUndefined();
        });

        test('should handle programs with program data', () => {
            const programId = 'test-program';
            const programData = 'test-program-data';
            
            cacheService.cacheDeployment(
                programId,
                'signature',
                1000,
                NOW - HOUR,
                true,
                programData
            );

            const cachedInfo = cacheService.getCachedDeployment(programId);
            expect(cachedInfo?.programDataAccount).toBe(programData);
        });

        test('should clear cache', () => {
            // Setup initial cache state
            const mockCache = {
                'program1': {
                    deploymentSignature: 'sig1',
                    deploymentSlot: 1000,
                    deploymentTimestamp: NOW - HOUR,
                    lastChecked: NOW,
                    programId: 'program1'
                },
                'program2': {
                    deploymentSignature: 'sig2',
                    deploymentSlot: 1001,
                    deploymentTimestamp: NOW - HOUR,
                    lastChecked: NOW,
                    programId: 'program2'
                }
            };
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockCache));
            cacheService = new CacheService();
            
            expect(cacheService.getCacheStats().total).toBe(2);
            cacheService.clearCache();
            expect(cacheService.getCacheStats().total).toBe(0);
        });

        test('should get correct cache statistics', () => {
            // Setup cache with fresh and expired entries
            const mockCache = {
                'fresh-program': {
                    deploymentSignature: 'sig1',
                    deploymentSlot: 1000,
                    deploymentTimestamp: NOW - HOUR,
                    lastChecked: NOW,
                    programId: 'fresh-program'
                },
                'expired-program': {
                    deploymentSignature: 'sig2',
                    deploymentSlot: 1001,
                    deploymentTimestamp: NOW - (CACHE_TTL + HOUR),
                    lastChecked: NOW - (CACHE_TTL + HOUR),
                    programId: 'expired-program'
                }
            };

            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockCache));
            const newCacheService = new CacheService();
            
            const stats = newCacheService.getCacheStats();
            expect(stats.total).toBe(2);
            expect(stats.valid).toBe(1);
            expect(stats.expired).toBe(1);
        });

        test('should not return expired entries', () => {
            // Setup cache with expired entry
            const mockCache = {
                'test-program': {
                    deploymentSignature: 'signature',
                    deploymentSlot: 1000,
                    deploymentTimestamp: NOW - (CACHE_TTL + HOUR),
                    lastChecked: NOW - (CACHE_TTL + HOUR),
                    programId: 'test-program'
                }
            };

            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockCache));
            const newCacheService = new CacheService();
            const cachedInfo = newCacheService.getCachedDeployment('test-program');
            expect(cachedInfo).toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('should handle file system errors gracefully', () => {
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('Write failed');
            });

            expect(() => {
                cacheService.cacheDeployment('test', 'sig', 1000, NOW - HOUR, false);
            }).not.toThrow();
        });

        test('should handle corrupted cache file', () => {
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
            const newCacheService = new CacheService();
            expect(newCacheService.getCacheStats().total).toBe(0);
        });
    });
}); 