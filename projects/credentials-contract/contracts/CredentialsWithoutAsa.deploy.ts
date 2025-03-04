import * as algosdk from 'algosdk';
import * as algokit from '@algorandfoundation/algokit-utils';
import { CredentialsWithoutAsaClient } from './clients/CredentialsWithoutAsaClient';
import { ALGOD_PORT, ALGOD_TOKEN, ALGOD_URL, WALLET_MNEMONIC } from './config';

/**
 * @description Initialize connection to Algorand node using configuration
 * Creates a client that will be used to interact with the Algorand blockchain
 */
const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_URL, ALGOD_PORT);

/**
 * @description Create the deployer account from mnemonic phrase
 * This account will deploy the contract and pay for deployment fees
 */
const sender = algosdk.mnemonicToSecretKey(WALLET_MNEMONIC);

/**
 * @description Self-executing async function to deploy the simplified credentials contract
 * This contract version doesn't use ASAs (Algorand Standard Assets) for certificate representation
 */
(async () => {
  /**
   * @description Initialize the client for interacting with the CredentialsWithoutAsa contract
   * This client handles ABI encoding/decoding and transaction creation
   */
  const Caller = new CredentialsWithoutAsaClient(
    {
      sender,         // The account that will sign transactions
      resolveBy: 'id', // How to reference the contract (by ID)
      id: 0,          // Placeholder ID (will be updated after deployment)
    },
    algodClient       // The Algorand client instance
  );

  /**
   * @description Deploy the contract by calling its createApplication method
   * This initializes the contract's state and creates the application on-chain
   */
  await Caller.create.createApplication({});

  /**
   * @description Retrieve the application ID and address after deployment
   * The appId is needed for future interactions with the contract
   */
  const { appId, appAddress } = await Caller.appClient.getAppReference();
  console.log('APP ID : ', appId);
})();
