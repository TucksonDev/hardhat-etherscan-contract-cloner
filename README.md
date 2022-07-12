# hardhat-contract-cloner

[Hardhat](https://hardhat.org) plugin for cloning verified contracts from any supported network using [Etherscan](https://etherscan.io/)'s API.

## What

This plugin will help you clone any verified contract with its source code available in Etherscan to your local project.

The main contract will be copied in your `contracts` folder. Any imported contract will be copied to `contracts/etherscan-imported` folder.

## Installation

```bash
npm install --save-dev TucksonDev/hardhat-contract-cloner
```

Import the plugin in your `hardhat.config.js`:

```js
require("hardhat-contract-cloner");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "hardhat-contract-cloner";
```

## Tasks

This plugin adds the `clone` task to Hardhat, which allows you to clone any contract from the supported networks.

## Environment extensions

This plugin does not extend the environment.

## Configuration

This plugin extends the Hardhat configuration object to add Etherscan config to it. In your `hardhat.config.js` file add:

```js
module.exports = {
  networks: {
    mainnet: { ... }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: "YOUR_ETHERSCAN_API_KEY"
  }
};
```
This is the same configuration used in [Hardhat etherscan verification plugin](https://raw.githubusercontent.com/NomicFoundation/hardhat/master/packages/hardhat-etherscan), so it does not conflict with it.

### Multiple API keys

To configure different API keys for different networks, add an object under the configuration option like this:

```js
module.exports = {
  etherscan: {
    apiKey: {
        mainnet: "YOUR_ETHERSCAN_API_KEY",
        rinkeby: "YOUR_RINKEBY_ETHERSCAN_API_KEY",
        ropsten: "YOUR_ROPSTEN_API_KEY",
    }
  }
};
```

## Usage

First add an Etherscan's Api Key to the configuration as explained in the previous section.

Then, run the `clone` task, passing the address of the contract and the network where it's deployed.
```bash
npx hardhat clone --network mainnet DEPLOYED_CONTRACT_ADDRESS
```

To list the supported networks, use the --list-networks flag
```bash
npx hardhat clone --list-networks
```

## How it works

The plugin uses Etherscan [_getsourcecode_](https://docs.etherscan.io/api-endpoints/contracts#get-contract-source-code-for-verified-contract-source-codes) endpoint to download the source code of a contract. It then creates one or several files depending on how the contract was uploaded.

## Supported networks
- mainnet
- rinkeby
- kovan
- ropsten

Other networks will be added in the future


## Final note
The development of this plugin has been inspired by the plugin [hardhat-etherscan](https://raw.githubusercontent.com/NomicFoundation/hardhat/master/packages/hardhat-etherscan), and some parts of the code regarding the connection to etherscan have been influenced by its code. Big thanks to the developers.

Also, this is the first npm package and plugin I create. Please, do not hesitate in reaching out with any kind of feedback to improve this plugin and make it as useful as possible.

Thanks !