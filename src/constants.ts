import { ChainConfig } from "./types";

// Plugin name
export const PLUGIN_NAME = "hardhat-contract-cloner";

// Subdirectory to save imported contracts when necessary
export const ImportedContractsPath = "etherscan-imported";

// New chains can be added here
// See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md#list-of-chain-ids
export const etherscanChainConfig: ChainConfig = {
    mainnet: {
        chainId: 1,
        urls: {
            apiURL: "https://api.etherscan.io/api",
            browserURL: "https://etherscan.io",
        },
    },
    ropsten: {
        chainId: 3,
        urls: {
            apiURL: "https://api-ropsten.etherscan.io/api",
            browserURL: "https://ropsten.etherscan.io",
        },
    },
    rinkeby: {
        chainId: 4,
        urls: {
            apiURL: "https://api-rinkeby.etherscan.io/api",
            browserURL: "https://rinkeby.etherscan.io",
        },
    },
    goerli: {
        chainId: 5,
        urls: {
            apiURL: "https://api-goerli.etherscan.io/api",
            browserURL: "https://goerli.etherscan.io",
        },
    },
    kovan: {
        chainId: 42,
        urls: {
            apiURL: "https://api-kovan.etherscan.io/api",
            browserURL: "https://kovan.etherscan.io",
        },
    },
};
