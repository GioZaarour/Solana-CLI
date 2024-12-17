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
        try {
            const connection = new Connection(RPC_URL, 'confirmed');
            const pubkey = new PublicKey(programId);

            if (options.verbose) {
                console.log('Fetching program info...');
            }

            const accountInfo = await connection.getParsedAccountInfo(pubkey);
            
            if (!accountInfo.value) {
                throw new Error('Program account not found');
            }

            const programData = (accountInfo.value.data as any).parsed?.info?.programData;
            const targetAccount = programData ? new PublicKey(programData) : pubkey;

            if (options.verbose) {
                console.log('Program type:', programData ? 'Upgradeable' : 'Native');
                if (programData) console.log('Program Data Account:', programData);
            }

            const signatures = await connection.getSignaturesForAddress(targetAccount);
            
            if (signatures.length === 0) {
                throw new Error('No transactions found for this program');
            }

            signatures.sort((a, b) => (a.slot || 0) - (b.slot || 0));
            const firstSig = signatures[0];

            const tx = await connection.getParsedTransaction(firstSig.signature, {
                maxSupportedTransactionVersion: 0
            });

            if (!tx?.meta?.logMessages) {
                throw new Error('Could not fetch transaction details');
            }

            if (options.verbose) {
                console.log('\nTransaction logs:');
                tx.meta.logMessages.forEach(log => console.log(log));
            }

            console.log('\nProgram Deployment Information:');
            console.log('--------------------------------');
            console.log(`Program ID: ${programId}`);
            console.log(`Deployment Transaction: ${firstSig.signature}`);
            console.log(`Deployment Slot: ${firstSig.slot}`);
            
            if (firstSig.blockTime) {
                const deploymentDate = new Date(firstSig.blockTime * 1000);
                console.log(`Deployment Date: ${deploymentDate.toLocaleString()}`);
                console.log(`Unix Timestamp: ${firstSig.blockTime}`);
            } else {
                console.log('Note: This appears to be a very old deployment (pre-timestamp era)');
            }

        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
                if (options.verbose) {
                    console.error('\nFull error details:');
                    console.error(error.stack);
                }
            } else {
                console.error('Unknown error occurred');
            }
            process.exit(1);
        }
    });

program.parse(); 