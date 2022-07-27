import { subtask, task, types } from "hardhat/config";

import { clone, cloneSubtask } from "./task";
import "./type-extensions";

///////////
// Tasks //
///////////
task("clone", "Clones a smartcontract from the blockchain")
    .addOptionalPositionalParam(
        "address",
        "Address of the smart contract to clone",
    )
    .addFlag("listNetworks", "Print the list of supported networks")
    .setAction(clone);

subtask("cloneSubtask")
    .addParam("address", undefined, undefined, types.string)
    .setAction(cloneSubtask);
