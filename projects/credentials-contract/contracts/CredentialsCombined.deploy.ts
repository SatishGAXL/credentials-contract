import {Algodv2,mnemonicToSecretKey} from 'algosdk';
import { CredentialsCombinedClient } from './clients/CredentialsCombinedClient';
import { ALGOD_PORT, ALGOD_TOKEN, ALGOD_URL, WALLET_MNEMONIC } from './config';

// Initialize connection to Algorand node
const algodClient = new Algodv2(ALGOD_TOKEN, ALGOD_URL, ALGOD_PORT);

// Generate account from mnemonic for transaction signing
const sender = mnemonicToSecretKey(WALLET_MNEMONIC);

// Self-executing async function to deploy the contract
(async () => {
  // Initialize the client for CredentialsCombined contract
  const Caller = new CredentialsCombinedClient(
    {
      sender,      // Account that will deploy and pay for the contract
      resolveBy: 'id',  // Reference contract by ID
      id: 0,       // Initial ID (will be replaced with actual ID after deployment)
    },
    algodClient    // Algorand node client
  );

  // Deploy the contract by calling the createApplication method
  await Caller.create.createApplication({});

  // Retrieve the deployed application's ID and address
  const { appId, appAddress } = await Caller.appClient.getAppReference();
  console.log('APP ID : ', appId);
})();
