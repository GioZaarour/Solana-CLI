#!/usr/bin/env node

import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { ProgramService } from './services/program-service';

const program = new Command();
const programService = new ProgramService();

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
            // Validate program ID
            const pubkey = new PublicKey(programId);
            
            if (options.verbose) {
                console.log('Initializing deployment search...');
            }

            const deploymentInfo = await programService.getDeploymentInfo(programId, options.verbose);

            // If deploymentInfo is null, this is a native program
            if (!deploymentInfo) {
                console.log('\nProgram Information:');
                console.log('--------------------------------');
                console.log(`Program ID: ${programId}`);
                console.log('This is a Solana Native Program');
                return;
            }

            console.log('\nProgram Deployment Information:');
            console.log('--------------------------------');
            console.log(`Program ID: ${programId}`);
            console.log(`Deployment Transaction: ${deploymentInfo.signature}`);
            console.log(`Deployment Slot: ${deploymentInfo.slot}`);
            
            if (deploymentInfo.timestamp) {
                const deploymentDate = new Date(deploymentInfo.timestamp * 1000);
                console.log(`Deployment Date: ${deploymentDate.toLocaleString()}`);
                console.log(`Unix Timestamp: ${deploymentInfo.timestamp}`);
            } else {
                console.log('Note: This appears to be a very old deployment (pre-timestamp era)');
            }

            if (deploymentInfo.programDataAccount) {
                console.log(`Program Data Account: ${deploymentInfo.programDataAccount}`);
            }

        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
                if (options.verbose) {
                    console.error('\nFull error details:');
                    console.error(`Type: ${error.name}`);
                    console.error(`Stack: ${error.stack}`);
                }
            } else {
                console.error('Unknown error occurred');
            }
            process.exit(1);
        }
    });

program
    .command('clear-cache')
    .description('Clear the local cache of program deployment information')
    .action(() => {
        programService.clearCache();
        console.log('Cache cleared successfully');
    });

program
    .command('cache-stats')
    .description('Show statistics about the local cache')
    .action(() => {
        const stats = programService.getCacheStats();
        console.log('\nCache Statistics:');
        console.log('----------------');
        console.log(`Total entries: ${stats.total}`);
        console.log(`Valid entries: ${stats.valid}`);
        console.log(`Expired entries: ${stats.expired}`);
    });

program.parse(); 