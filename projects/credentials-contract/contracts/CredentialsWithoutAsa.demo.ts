import * as algosdk from 'algosdk';
import * as algokit from '@algorandfoundation/algokit-utils';
import { CredentialsWithoutAsaClient } from './clients/CredentialsWithoutAsaClient';
import appspec from './artifacts/CredentialsWithoutAsa.arc56_draft.json';

const algodClient = new algosdk.Algodv2('a'.repeat(64), 'http://localhost', 4001);
const indexerClient = new algosdk.Indexer('a'.repeat(64), 'http://localhost', 8980);
const kmdClient = new algosdk.Kmd('a'.repeat(64), 'http://localhost', 4002);

type CertificateMetadata = {
  url: string;
  ipfs_hash: string;
  studentEmail: string;
  name: string;
  instituteName: string;
  eventName: string;
  issuedAddress: string;
};

async function getCurrentIndex(caller: CredentialsWithoutAsaClient): Promise<number> {
  const globalState = await caller.getGlobalState();
  return globalState.index?.asNumber()!;
}

const getCertificateByIndex = async (
  caller: CredentialsWithoutAsaClient,
  index: number
): Promise<CertificateMetadata> => {
  const box: any = await caller.appClient.getBoxValueFromABIType(
    algosdk.bigIntToBytes(index, 8),
    algosdk.ABIType.from('(string,string,string,string,string,string,address)')
  );
  return {
    url: box[0],
    ipfs_hash: box[1],
    studentEmail: box[2],
    name: box[3],
    instituteName: box[4],
    eventName: box[5],
    issuedAddress: box[6],
  };
};

const transferTestTokens = async (
  algodClient: algosdk.Algodv2,
  sender: algosdk.Account,
  reciever: string,
  amount: number
) => {
  const suggestedParams = await algodClient.getTransactionParams().do();
  const xferTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: sender.addr,
    to: reciever,
    suggestedParams,
    amount: algokit.algos(amount).microAlgos,
  });
  const signedXferTxn = xferTxn.signTxn(sender.sk);
  try {
    await algodClient.sendRawTransaction(signedXferTxn).do();
    const result = await algosdk.waitForConfirmation(algodClient, xferTxn.txID().toString(), 3);
    var confirmedRound = result['confirmed-round'];
    return true;
  } catch (e: any) {
    return false;
  }
};

(async () => {
  const sender = await algokit.getLocalNetDispenserAccount(algodClient, kmdClient);

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

  await transferTestTokens(algodClient, sender, appAddress, 10);

  const certificate1 = {
    url: 'https://google.com',
    ipfs_hash: 'bafkreia3fqtbi3btfy6u5pjfcjivst72gqaqgtibqj5bcniwwtnnl2atx4',
    studentEmail: 'satish@gmail.com',
    name: 'Satish',
    instituteName: 'MIC College',
    eventName: 'Graduation',
  };

  const result1 = await Caller.uploadCertificate(
    {
      url: certificate1.url,
      ipfs_hash: certificate1.ipfs_hash,
      studentEmail: certificate1.studentEmail,
      name: certificate1.name,
      instituteName: certificate1.instituteName,
      eventName: certificate1.eventName,
    },
    { boxes: [{ appId: 0, name: algosdk.bigIntToBytes(await getCurrentIndex(Caller), 8) }] }
  );

  console.log('Uploaded certificate with ID: ', Number(result1.return));

  console.log(
    'Certificate Metadata: ',
    (
      await Caller.getCertificate(
        { index: (await getCurrentIndex(Caller)) - 1 },
        { boxes: [{ appId: 0, name: algosdk.bigIntToBytes((await getCurrentIndex(Caller)) - 1, 8) }] }
      )
    ).return
  );

  const box: any = await Caller.appClient.getBoxValueFromABIType(
    algosdk.bigIntToBytes((await getCurrentIndex(Caller)) - 1, 8),
    algosdk.ABIType.from('(string,string,string,string,string,string,address)')
  );

  console.log(box);
})();
