import * as algosdk from 'algosdk';
import { CredentialsClient } from './clients/CredentialsClient';
import { ALGOD_PORT, ALGOD_TOKEN, ALGOD_URL, WALLET_MNEMONIC } from './config';

// Initialize Algod client
const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_URL, ALGOD_PORT);

// Recover account from mnemonic
const sender = algosdk.mnemonicToSecretKey(WALLET_MNEMONIC);

(async () => {
  // Create CredentialsClient instance
  const Caller = new CredentialsClient(
    {
      sender,
      resolveBy: 'id',
      id: 0,
    },
    algodClient
  );

  // Deploy the smart contract
  await Caller.create.createApplication({});

  // Get the application ID and address
  const { appId, appAddress } = await Caller.appClient.getAppReference();
  console.log('APP ID : ', appId);
})();
