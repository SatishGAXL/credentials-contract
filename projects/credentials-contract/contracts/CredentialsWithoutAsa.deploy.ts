import * as algosdk from 'algosdk';
import * as algokit from '@algorandfoundation/algokit-utils';
import { CredentialsWithoutAsaClient } from './clients/CredentialsWithoutAsaClient';

const algodClient = new algosdk.Algodv2('a'.repeat(64), 'https://testnet-api.algonode.cloud', 443);

const mastet_private =
  'step fury fatigue brick recall more level ignore explain figure diary van opinion antique grief when wild hockey breeze enforce cherry buffalo now ability upset';
const sender = algosdk.mnemonicToSecretKey(mastet_private);

(async () => {
  const Caller = new CredentialsWithoutAsaClient(
    {
      sender,
      resolveBy: 'id',
      id: 0,
    },
    algodClient
  );

  await Caller.create.createApplication({});

  const { appId, appAddress } = await Caller.appClient.getAppReference();
  console.log('APP ID : ', appId);
})();
