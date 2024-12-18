import { ProgramService } from '../../src/services/program-service';
import { mockRpcService, mockCacheService, mockConnection } from '../mocks/services';
import { Connection, PublicKey } from '@solana/web3.js';

// Mock the service dependencies
jest.mock('../../src/services/rpc-service', () => ({
    RpcService: jest.fn().mockImplementation(() => mockRpcService)
}));

jest.mock('../../src/services/cache-service', () => ({
    CacheService: jest.fn().mockImplementation(() => mockCacheService)
}));

// Increase timeout for all tests in this file
jest.setTimeout(10000);

describe('ProgramService', () => {
    let programService: ProgramService;

    beforeEach(() => {
        programService = new ProgramService();
        jest.clearAllMocks();
    });

    describe('Native Program Detection', () => {
        test('should identify Token Program as native', async () => {
            const result = await programService.getDeploymentInfo('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
            expect(result).toBeNull();
            expect(mockRpcService.getNextHealthyConnection).not.toHaveBeenCalled();
        });

        test('should identify System Program as native', async () => {
            const result = await programService.getDeploymentInfo('11111111111111111111111111111111');
            expect(result).toBeNull();
            expect(mockRpcService.getNextHealthyConnection).not.toHaveBeenCalled();
        });
    });

    describe('Program Account Detection', () => {
        const TEST_PUBKEY = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

        beforeEach(() => {
            // Reset all mocks before each test
            mockConnection.getParsedAccountInfo.mockReset();
            mockRpcService.getNextHealthyConnection.mockReset();
            mockCacheService.getCachedDeployment.mockReset();
        });

        test('should handle non-program accounts', async () => {
            mockConnection.getParsedAccountInfo.mockResolvedValue({
                value: {
                    owner: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
                    data: { parsed: {} }
                }
            });
            mockRpcService.getNextHealthyConnection.mockResolvedValue(mockConnection as unknown as Connection);

            await expect(programService.getDeploymentInfo(TEST_PUBKEY)).rejects.toThrow('Not a program account');
        });

        test('should handle non-existent accounts', async () => {
            mockConnection.getParsedAccountInfo.mockResolvedValue({ value: null });
            mockRpcService.getNextHealthyConnection.mockResolvedValue(mockConnection as unknown as Connection);

            await expect(programService.getDeploymentInfo(TEST_PUBKEY)).rejects.toThrow('Account not found');
        });

        test('should use cached deployment info when available', async () => {
            const cachedInfo = {
                deploymentSignature: 'test-signature',
                deploymentSlot: 1000,
                deploymentTimestamp: 1600000000,
                programDataAccount: 'test-program-data'
            };

            mockCacheService.getCachedDeployment.mockReturnValue(cachedInfo);

            const result = await programService.getDeploymentInfo(TEST_PUBKEY);

            expect(result).toEqual({
                signature: cachedInfo.deploymentSignature,
                slot: cachedInfo.deploymentSlot,
                timestamp: cachedInfo.deploymentTimestamp,
                programDataAccount: cachedInfo.programDataAccount
            });
            expect(mockRpcService.getNextHealthyConnection).not.toHaveBeenCalled();
        });
    });
}); 