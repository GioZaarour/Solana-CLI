import { Connection, PublicKey } from '@solana/web3.js';

export const mockRpcService = {
    getNextHealthyConnection: jest.fn().mockResolvedValue(new Connection('http://test-endpoint.test')),
};

export const mockCacheService = {
    getCachedDeployment: jest.fn(),
    cacheDeployment: jest.fn(),
    clearCache: jest.fn(),
    getCacheSize: jest.fn(),
};

export const mockConnection = {
    getParsedAccountInfo: jest.fn(),
    getSignaturesForAddress: jest.fn(),
    getParsedTransaction: jest.fn(),
}; 