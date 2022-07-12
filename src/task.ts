import fs from "fs";
import { ActionType } from "hardhat/types";
import { HardhatPluginError } from "hardhat/plugins";
import { isAddress } from "@ethersproject/address";
import {
    EtherscanNetworkEntry,
    sourceCodeItem,
    AssociativeArray
} from "./types";
import {
    printSupportedNetworks,
    verifyAllowedChains,
    getEtherscanApiKey,
    getEtherscanEndpoints,
    callAPI
} from "./helpers";
import {
    PLUGIN_NAME,
    ImportedContractsPath,
    etherscanChainConfig
} from "./constants";

interface CloneArgs {
    // --address
    address?: string;
    
    // --list-networks flag
    listNetworks: boolean;
}

interface CloneSubtaskArgs {
    address: string;
}

export const clone: ActionType<CloneArgs> = async (
    { address, listNetworks },
    { config, run }
) => {
    // "List networks" flag
    if (listNetworks) {
        await printSupportedNetworks();
        return;
    }

    // Address is not defined
    if (address === undefined) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            "You didn’t provide any address. Please re-run the 'clone' task with the address of the contract you want to clone."
        );
    }

    // Verification of configured api keys
    verifyAllowedChains(config.etherscan);

    return run("cloneSubtask", { address });
};


export const cloneSubtask: ActionType<CloneSubtaskArgs> = async (
    { address },
    { config, network, run }
) => {
    // Verification of address
    if (!isAddress(address)) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `${address} is an invalid address.`
        );
    }

    // Getting the etherscan and paths config
    const { etherscan } = config;
    const { paths } = config;

    // Obtaining the network configuration
    const {
        network: verificationNetwork,
        urls: etherscanAPIEndpoints,
    }: EtherscanNetworkEntry = await getEtherscanEndpoints(
        network.provider,
        network.name,
        etherscanChainConfig,
    );

    // And obtaining the api key
    const etherscanAPIKey = getEtherscanApiKey(
        etherscan.apiKey,
        verificationNetwork
    );

    // Creating the final URL
    let requestUri = etherscanAPIEndpoints.apiURL;
    requestUri += "?module=contract";
    requestUri += "&action=getsourcecode";
    requestUri += "&address=" + address;
    requestUri += "&apikey=" + etherscanAPIKey;

    // Calling the API to get the source code
    const apiResponse = await callAPI(requestUri);
    if (!apiResponse || !apiResponse.response) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `Error while fetching the contract code: response is empty.`
        );
    }

    // Transforming response to JSON
    let apiResponseJson = JSON.parse(apiResponse.response);

    // Getting the contract name
    let contractName = apiResponseJson['result'][0]['ContractName'];
    if (!contractName) {
        contractName = "Unnamed";
    }
    contractName+='.sol';

    // Getting source code information
    let sourceCodeJson = apiResponseJson['result'][0]['SourceCode'];
    if (sourceCodeJson == "") {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `Contract ${address} is not verified. Source code is not available on etherscan.`
        );
    }

    // We have two possibilities now:
    //  1.- Code is a single contract: The whole code is returned in this "SourceCode" field
    //  2.- Code is split into several imported contracts: "SourceCode" is an bad-formatted json object with the different pieces of code
    // TODO: Try to find a better way to differentiate between both possibilities
    if (sourceCodeJson[0] != '{') {
        // Code is a single contract
        //------------------------------
        const filePath = paths.sources + "/" + contractName;
        
        // Verification of file existence
        if (fs.existsSync(filePath)) {
            throw new HardhatPluginError(
                PLUGIN_NAME,
                `Can't create the new contract. A file with the same name already exists: ${filePath}`
            );
        }
        
        // We create this single contract
        fs.writeFileSync(filePath, sourceCodeJson);
        console.log(`Contract ${contractName} has been created in ${paths.sources}.`);
    } else {
        // Code is split into several imported contracts
        //-----------------------------------------------

        // sourceCode is not well formatted. It starts with 2 '{' and ends with 2 '}', breaking thus
        // the JSON object. To avoid errors, we will remove those 2 characters.
        sourceCodeJson = sourceCodeJson.substr(1, sourceCodeJson.length - 2);
        let sourceCodeInfo = JSON.parse(sourceCodeJson);

        // Checking needed variables
        if (!sourceCodeInfo['language']) {
            throw new HardhatPluginError(
                PLUGIN_NAME,
                `Can't create the new contract. Code language is not specified. This is an etherscan error.`
            );
        }

        if (sourceCodeInfo['language'] != 'Solidity') {
            throw new HardhatPluginError(
                PLUGIN_NAME,
                `Can't create the new contract. Code language is not Solidity, and ${sourceCodeInfo['language']} is not supported yet.`
            );
        }

        if (!sourceCodeInfo['sources']) {
            throw new HardhatPluginError(
                PLUGIN_NAME,
                `Can't create the new contract. Sources are not available. This is an etherscan error.`
            );
        }

        // We will have a main contract and several "imported" contracts:
        // - Main contract will be saved in the main "contracts" directory
        // - Imported contracts will be saved "contracts/${ImportedContractsPath}" directory
        const importedContractsPath = paths.sources + '/' + ImportedContractsPath;
        if (!fs.existsSync(importedContractsPath)){
            fs.mkdirSync(importedContractsPath);
        }

        // We first get all contracts' "imported paths" and create an array with that information
        // This process is done in two steps. First we get all keys of the "sources" array
        // which contains full paths to contracts.
        let importedContractsInformation : AssociativeArray = {};
        Object.keys(sourceCodeInfo['sources']).forEach( (key) => {
            let filepathArray = key.split('/');
            let filename = filepathArray.pop();
            if (!filename) {
                return;
            }

            importedContractsInformation[key] = filename;
        });

        // Then, we get all imports that have not been added to the array. These are usually
        // the ones that contain relatives paths. We do this by searching imports in the code.
        Object.entries(sourceCodeInfo['sources']).forEach( ([key, value]) => {
            let sourceItem = <sourceCodeItem>{
                filePath: key,
                fileContents: value
            };

            if ((!sourceItem.fileContents) || (!sourceItem.fileContents.content)) {
                return;
            }

            let importedContracts = sourceItem.fileContents.content.match(/import ".*"/ig);
            if (!importedContracts) {
                return;
            }

            importedContracts.forEach( (importedContract) => {
                let contractPath = importedContract.replace('import "', '').replace('"', '').trim();
                if (!Object.keys(importedContractsInformation).includes(contractPath)) {
                    let filepathArray = contractPath.split('/');
                    let filename = filepathArray.pop();
                    if (!filename) {
                        return;
                    }

                    importedContractsInformation[contractPath] = filename;
                }
            });
        });

        // We can now traverse all sources and create the contracts
        Object.entries(sourceCodeInfo['sources']).forEach( ([key, value]) => {
            let sourceItem = <sourceCodeItem>{
                filePath: key,
                fileContents: value
            };
            
            // "key" holds the filepath of the included smartcontract
            let filepathArray = sourceItem.filePath.split('/');
            let filename = filepathArray.pop();

            if (!sourceItem.fileContents || !sourceItem.fileContents.content) {
                console.info("Contract " + sourceItem.filePath + " does not seem to have any contents.");
                return;
            }

            // We replace all imported contracts paths with the new structure
            let contractSourceCode = sourceItem.fileContents.content;
            Object.entries(importedContractsInformation).forEach ( ([key, value]) => {
                if (filename == contractName) {
                    // Main contract
                    contractSourceCode = contractSourceCode.replace(key, './' + ImportedContractsPath + '/' + value);
                } else {
                    // Imported contract
                    contractSourceCode = contractSourceCode.replace(key, './' + value);
                }
            });

            // And we create the file
            if (filename == contractName) {
                // Main contract
                fs.writeFileSync(paths.sources + '/' + filename, contractSourceCode);
            } else {
                // Imported contract
                fs.writeFileSync(importedContractsPath + '/' + filename, contractSourceCode);
            }
        });

        console.log(`Contract ${contractName} has been created in ${paths.sources} and imported contracts have been created in ${importedContractsPath}.`);
    }
};