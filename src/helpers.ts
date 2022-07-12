import * as https from "node:https";
import { EthereumProvider } from "hardhat/types";
import { HardhatPluginError, HARDHAT_NETWORK_NAME } from "hardhat/plugins";
import { PLUGIN_NAME, etherscanChainConfig } from "./constants";
import {
    EtherscanConfig,
    ChainConfig,
    EtherscanNetworkEntry,
    ApiResponse
} from "./types";

export async function printSupportedNetworks() {
    // Get and sort supported networks
    const supportedNetworks = Object.entries(etherscanChainConfig)
        .map(([network, config]) => [network, config.chainId] as [string, number])
        .sort((a, b) => a[1] - b[1]);

    // Print them out
    Object.entries(supportedNetworks).forEach( ([networkName, chainId]) => {
        console.log(chainId);
    });
}

// Verifies whether any of the configured api keys belongs to an unsupported network
export const verifyAllowedChains = (etherscanConfig: EtherscanConfig) => {
    if (
      etherscanConfig.apiKey === null ||
      etherscanConfig.apiKey === undefined ||
      typeof etherscanConfig.apiKey !== "object"
    ) {
        // Key has not been specified
        return;
    }

    const allowedChains = Object.keys(etherscanChainConfig);
    const configKeys = Object.keys(etherscanConfig.apiKey);
    const invalidNetwork = configKeys.find((chain) => !allowedChains.includes(chain));
  
    if (invalidNetwork !== undefined) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `You set an Etherscan API token for the network "${invalidNetwork}" but the plugin doesn't support it, or it's spelled incorrectly.
To see the list of supported networks, run this command:
    npx hardhat clone --list-networks
            `
      );
    }
};

export const getEtherscanApiKey = (
    apiKey: EtherscanConfig["apiKey"],
    network: string
): string => {
    if (apiKey === undefined || apiKey === "") {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `You are trying to verify a contract in '${network}', but no API token was found for this network.`
        );
    }
  
    if (typeof apiKey === "string") {
        return apiKey;
    }
  
    const key = (apiKey as any)[network];
    if (key === undefined || key === "") {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `You are trying to verify a contract in '${network}', but no API token was found for this network.`
        );
    }
    return key;
};

export async function getEtherscanEndpoints(
    provider: EthereumProvider,
    networkName: string,
    chainConfig: ChainConfig
): Promise<EtherscanNetworkEntry> {
    if (networkName === HARDHAT_NETWORK_NAME) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `The selected network is ${networkName}. Please select a network supported by Etherscan.`
        );
    }
  
    // Getting the network name
    const chainIdsToNames = new Map(
        Object.entries(chainConfig).map(([chainName, config]) => [
            config.chainId,
            chainName,
        ])
    );
    const chainID = parseInt(await provider.send("eth_chainId"), 16);
    const network = chainIdsToNames.get(chainID);

    if (network === undefined) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `Network ${networkName} is not supported.`
        );
    }

    // Getting the chain configuration
    const chainConfigEntry = chainConfig[network];
    
    return { network, urls: chainConfigEntry.urls };
}

export async function callAPI(url: string): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let responseData = "";

            res.on('data', (chunk) => {
                if (chunk) {
                    responseData += chunk;
                }
            });
            res.on('end', () => {
                if (<number>res.statusCode >= 200 && <number>res.statusCode <= 299) {
                    resolve({statusCode: <number>res.statusCode, headers: res.headers, response: responseData});
                } else {
                    reject('Request failed. status: ' + res.statusCode + ', response: ' + responseData);
                }
            });

            res.on('error', reject);
        }).on('error', (error) => {
            throw new HardhatPluginError(
                PLUGIN_NAME,
                `Error while calling the API: ${error.message}.`
            );
        });
    });
}