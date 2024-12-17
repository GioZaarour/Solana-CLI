#!/usr/bin/env node

import { Command } from 'commander';
import { Connection, PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.HELIUS_RPC_URL;

if (!RPC_URL) {
    console.error('Error: HELIUS_RPC_URL environment variable is not set');
    process.exit(1);
}

const connection = new Connection(RPC_URL as string, 'confirmed');

async function findProgramDeployment(programId: PublicKey, verbose: boolean = false): Promise<{ slot: number; timestamp: number; signature: string; } | null> {
    try {
        if (verbose) {
            console.log('\nFetching program info...');
            console.log(`Program ID: ${programId.toString()}`);
        }

        const programInfo = await connection.getParsedAccountInfo(programId);
        
        if (!programInfo.value) {
            throw new Error('Program account not found');
        }

        if (verbose) {
            console.log('\nProgram account found:');
            console.log(`Owner: ${programInfo.value.owner.toString()}`);
            console.log(`Executable: ${programInfo.value.executable}`);
        }

        const programData = (programInfo.value.data as any).parsed?.info?.programData;
        const targetAccount = programData ? new PublicKey(programData) : programId;
        
        if (verbose) {
            console.log('\nProgram analysis:');
            console.log('Program type:', programData ? 'Upgradeable' : 'Native');
            if (programData) console.log('Program Data Account:', programData);
        }

        if (verbose) {
            console.log(`\nFetching signatures for ${programData ? 'program data account' : 'program account'}...`);
        }
        
        const signatures = await connection.getSignaturesForAddress(targetAccount);
        
        if (verbose) {
            console.log(`Found ${signatures.length} signatures`);
        }

        if (signatures.length === 0) {
            return null;
        }

        signatures.sort((a, b) => (a.slot || 0) - (b.slot || 0));
        
        for (const sig of signatures) {
            if (verbose) {
                console.log(`\nChecking signature: ${sig.signature}`);
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
                (log.includes(programId.toString()) && log.includes('success'))
            );

            if (isDeployment) {
                return {
                    slot: sig.slot || 0,
                    timestamp: sig.blockTime || 0,
                    signature: sig.signature
                };
            }
        }

        return null;
    } catch (error) {
        console.error('\nError in findProgramDeployment:');
        if (error instanceof Error) {
            console.error(`Type: ${error.name}`);
            console.error(`Message: ${error.message}`);
            if (verbose) console.error(`Stack: ${error.stack}`);
        } else {
            console.error('Unknown error:', error);
        }
        throw error;
    }
}

async function getProgramDeploymentTimestamp(programId: string, verbose: boolean = false): Promise<void> {
    try {
        if (verbose) console.log('Initializing deployment search...');
        
        const pubkey = new PublicKey(programId);
        
        const deployment = await findProgramDeployment(pubkey, verbose);
        
        if (!deployment) {
            throw new Error('Could not determine deployment timestamp - No deployment transaction found');
        }

        console.log('\nProgram Deployment Information:');
        console.log('--------------------------------');
        console.log(`Program ID: ${programId}`);
        console.log(`Deployment Transaction: ${deployment.signature}`);
        console.log(`Deployment Slot: ${deployment.slot}`);
        
        if (deployment.timestamp) {
            const deploymentDate = new Date(deployment.timestamp * 1000);
            console.log(`Deployment Date: ${deploymentDate.toLocaleString()}`);
            console.log(`Unix Timestamp: ${deployment.timestamp}`);
        } else {
            console.log('Note: This appears to be a very old deployment (pre-timestamp era)');
        }
        
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error:', error.message);
            if (verbose) {
                console.error('\nFull error details:');
                console.error(`Type: ${error.name}`);
                console.error(`Stack: ${error.stack}`);
            }
        } else {
            console.error('Unknown error occurred');
        }
        process.exit(1);
    }
}

const program = new Command();

program
    .name('solana-deploy-time')
    .description('CLI tool to get the first deployment timestamp of a Solana program')
    .version('1.0.0');

program
    .command('get-timestamp')
    .description('Get the timestamp of when a Solana program was first deployed')
    .argument('<programId>', 'The program ID to check')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (programId: string, options: { verbose: boolean }) => {
        await getProgramDeploymentTimestamp(programId, options.verbose);
    });

program.parse(); 