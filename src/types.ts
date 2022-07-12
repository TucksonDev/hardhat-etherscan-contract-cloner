import { IncomingHttpHeaders } from "http";

// Configuration for Etherscan chain URLs
export interface EtherscanURLs {
    apiURL: string;
    browserURL: string;
}

interface EtherscanChainConfig {
    chainId: number;
    urls: EtherscanURLs;
}

export type ChainConfig = Record<string, EtherscanChainConfig>;

// Etherscan network entry
export interface EtherscanNetworkEntry {
    network: string;
    urls: EtherscanURLs;
  }

// Interfaces for extended Hardhat configuration
// We only need an API Key
export interface EtherscanUserConfig {
    apiKey?: string | Record<string, string>;
}

export interface EtherscanConfig {
    apiKey?: string | Record<string, string>;
}

// API Response
export type ApiResponse = {
    statusCode: number;
    headers: IncomingHttpHeaders;
    response: string;
};

// Sources handling
export type sourceCodeItem = {
    filePath: string;
    fileContents: {
        content: string;
    }
}
export interface AssociativeArray {
    [key: string]: string;
}