import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

describe('CLI Application Tests', () => {
    const CLI_COMMAND = 'ts-node src/cli.ts';
    const CACHE_DIR = path.join(process.cwd(), '.cache');
    const CACHE_FILE = path.join(CACHE_DIR, 'program-deployments.json');

    // Test program IDs
    const NATIVE_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    const NORMAL_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
    const NON_PROGRAM = 'A5frApbAMP6TfpMXhUyHmhn4VSJghwVNsKUYfLLmqxzz';

    beforeAll(() => {
        // Ensure environment variables are set
        expect(process.env.MAIN_RPC_URL).toBeDefined();
    });

    beforeEach(() => {
        // Clear cache before each test
        if (fs.existsSync(CACHE_FILE)) {
            fs.unlinkSync(CACHE_FILE);
        }
    });

    describe('Basic Commands', () => {
        test('should show help message', () => {
            const output = execSync(`${CLI_COMMAND} --help`).toString();
            expect(output).toContain('Usage:');
            expect(output).toContain('Options:');
        });

        test('should show version', () => {
            const output = execSync(`${CLI_COMMAND} --version`).toString();
            expect(output).toMatch(/\d+\.\d+\.\d+/);
        });
    });

    describe('Program Detection', () => {
        test('should identify native program', () => {
            const output = execSync(`${CLI_COMMAND} get-timestamp ${NATIVE_PROGRAM}`).toString();
            expect(output).toContain('This is a Solana Native Program');
        });

        test('should handle non-program account', () => {
            expect(() => {
                execSync(`${CLI_COMMAND} get-timestamp ${NON_PROGRAM}`);
            }).toThrow('Not a program account');
        });

        test('should get deployment info for normal program', () => {
            const output = execSync(`${CLI_COMMAND} get-timestamp ${NORMAL_PROGRAM}`).toString();
            expect(output).toContain('Program Deployment Information');
            expect(output).toContain('Deployment Transaction:');
            expect(output).toContain('Deployment Date:');
        });
    });

    describe('Cache Functionality', () => {
        test('should create and use cache', () => {
            // First call should create cache
            execSync(`${CLI_COMMAND} get-timestamp ${NORMAL_PROGRAM}`);
            expect(fs.existsSync(CACHE_FILE)).toBe(true);

            // Read cache content
            const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
            expect(JSON.parse(cacheContent)).toHaveProperty(NORMAL_PROGRAM);
        });

        test('should clear cache', () => {
            // Create cache first
            execSync(`${CLI_COMMAND} get-timestamp ${NORMAL_PROGRAM}`);
            expect(fs.existsSync(CACHE_FILE)).toBe(true);

            // Clear cache
            execSync(`${CLI_COMMAND} clear-cache`);
            expect(fs.existsSync(CACHE_FILE)).toBe(false);
        });

        test('should show cache stats', () => {
            // Create some cache entries
            execSync(`${CLI_COMMAND} get-timestamp ${NORMAL_PROGRAM}`);
            
            const output = execSync(`${CLI_COMMAND} cache-stats`).toString();
            expect(output).toContain('Cache Statistics');
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid program ID format', () => {
            expect(() => {
                execSync(`${CLI_COMMAND} get-timestamp invalid-id`);
            }).toThrow('Non-base58 character');
        });

        test('should handle missing program ID', () => {
            expect(() => {
                execSync(`${CLI_COMMAND} get-timestamp`);
            }).toThrow('missing required argument');
        });

        test('should handle RPC errors gracefully', () => {
            // Temporarily set invalid RPC URL
            const originalUrl = process.env.MAIN_RPC_URL;
            const originalFallback = process.env.FALLBACK_RPC_URL;
            
            // Set both URLs to invalid endpoints
            process.env.MAIN_RPC_URL = 'http://invalid.endpoint:1234';
            process.env.FALLBACK_RPC_URL = 'http://another.invalid:5678';

            expect(() => {
                execSync(`${CLI_COMMAND} get-timestamp ${NORMAL_PROGRAM}`, { timeout: 5000 });
            }).toThrow();

            // Restore RPC URLs
            process.env.MAIN_RPC_URL = originalUrl;
            process.env.FALLBACK_RPC_URL = originalFallback;
        });
    });

}); 