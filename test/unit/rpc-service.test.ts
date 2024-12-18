import { RpcService } from '../../src/services/rpc-service';
import { Connection } from '@solana/web3.js';

// Mock environment variables
process.env.MAIN_RPC_URL = 'http://main-endpoint.test';
process.env.FALLBACK_RPC_URL = 'http://fallback-endpoint.test';

// Create mock functions outside the mock setup
const mockGetSlot = jest.fn();

// Mock the Connection class
jest.mock('@solana/web3.js', () => {
    return {
        Connection: jest.fn().mockImplementation((url) => ({
            rpcEndpoint: url,
            getSlot: mockGetSlot
        }))
    };
});

// Suppress console output during tests
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('RpcService', () => {
    let rpcService: RpcService;
    let MockConnection: jest.Mock;

    beforeEach(() => {
        // Clear all mocks and reset modules
        jest.clearAllMocks();
        jest.resetModules();
        
        // Reset the Connection mock
        MockConnection = Connection as unknown as jest.Mock;
        MockConnection.mockImplementation((url) => ({
            rpcEndpoint: url,
            getSlot: mockGetSlot
        }));
        
        // Reset the getSlot mock
        mockGetSlot.mockReset();
    });

    describe('Connection Management', () => {
        test('should initialize with correct endpoints', () => {
            // Create a new instance to ensure fresh Connection calls
            rpcService = new RpcService();
            
            // Get all Connection constructor calls
            const calls = MockConnection.mock.calls;
            
            // Verify the calls
            expect(calls.length).toBe(2);
            expect(calls[0][0]).toBe(process.env.MAIN_RPC_URL);
            expect(calls[1][0]).toBe(process.env.FALLBACK_RPC_URL);
        });
    });

    describe('getNextHealthyConnection', () => {
        beforeEach(() => {
            // Create a fresh instance for each test
            rpcService = new RpcService();
        });

        test('should return main connection when healthy', async () => {
            // Mock successful health check for main connection
            mockGetSlot.mockResolvedValueOnce(100);
            
            const connection = await rpcService.getNextHealthyConnection();
            expect(connection.rpcEndpoint).toBe(process.env.MAIN_RPC_URL);
            expect(mockGetSlot).toHaveBeenCalledTimes(1);
        });

        test('should fall back to secondary connection when main fails', async () => {
            // Mock main connection failure and fallback success
            mockGetSlot
                .mockRejectedValueOnce(new Error('Main connection failed'))
                .mockResolvedValueOnce(100);
            
            const connection = await rpcService.getNextHealthyConnection();
            expect(connection.rpcEndpoint).toBe(process.env.FALLBACK_RPC_URL);
            expect(mockGetSlot).toHaveBeenCalledTimes(2);
        });

        test('should throw error when all connections fail', async () => {
            // Mock both connections failing
            mockGetSlot
                .mockRejectedValueOnce(new Error('Main connection failed'))
                .mockRejectedValueOnce(new Error('Fallback connection failed'));
            
            await expect(rpcService.getNextHealthyConnection())
                .rejects
                .toThrow('No healthy RPC endpoints available');
            expect(mockGetSlot).toHaveBeenCalledTimes(2);
        });

        test('should handle missing fallback URL gracefully', async () => {
            // Save original fallback URL
            const originalFallback = process.env.FALLBACK_RPC_URL;
            delete process.env.FALLBACK_RPC_URL;
            
            // Create new instance with missing fallback
            rpcService = new RpcService();
            
            // Mock main connection failure
            mockGetSlot.mockRejectedValueOnce(new Error('Main connection failed'));
            
            await expect(rpcService.getNextHealthyConnection())
                .rejects
                .toThrow('No healthy RPC endpoints available');
            
            // Restore fallback URL
            process.env.FALLBACK_RPC_URL = originalFallback;
            expect(mockGetSlot).toHaveBeenCalledTimes(1);
        });
    });
}); 