import * as algosdk from 'algosdk';
import * as algokit from '@algorandfoundation/algokit-utils';
import { CredentialsWithoutAsaClient } from './clients/CredentialsWithoutAsaClient';
import appspec from './artifacts/CredentialsWithoutAsa.arc56_draft.json';

/**
 * @description Initialize Algorand clients for local development environment
 * These are placeholders with dummy authentication tokens for local testing
 */
const algodClient = new algosdk.Algodv2('a'.repeat(64), 'http://localhost', 4001);
const indexerClient = new algosdk.Indexer('a'.repeat(64), 'http://localhost', 8980);
const kmdClient = new algosdk.Kmd('a'.repeat(64), 'http://localhost', 4002);

/**
 * @typedef CertificateMetadata
 * @description Type definition for the simplified certificate metadata structure
 * Used for processing and displaying certificate data
 */
type CertificateMetadata = {
  url: string;
  ipfs_hash: string;
  studentEmail: string;
  name: string;
  instituteName: string;
  eventName: string;
  issuedAddress: string;
};

/**
 * @function getCurrentIndex
 * @description Retrieves the current certificate index from the contract's global state
 * This represents the number of certificates created so far
 * @param {CredentialsWithoutAsaClient} caller - The contract client instance
 * @returns {Promise<number>} The current certificate index
 */
async function getCurrentIndex(caller: CredentialsWithoutAsaClient): Promise<number> {
  const globalState = await caller.getGlobalState();
  return globalState.index?.asNumber()!;
}

/**
 * @function getCertificateByIndex
 * @description Retrieves certificate data from the contract's box storage by index
 * @param {CredentialsWithoutAsaClient} caller - The contract client instance
 * @param {number} index - The index of the certificate to retrieve
 * @returns {Promise<CertificateMetadata>} The retrieved certificate metadata
 */
const getCertificateByIndex = async (
  caller: CredentialsWithoutAsaClient,
  index: number
): Promise<CertificateMetadata> => {
  // Retrieve box value using ABI type for correct deserialization
  const box: any = await caller.appClient.getBoxValueFromABIType(
    algosdk.bigIntToBytes(index, 8),
    algosdk.ABIType.from('(string,string,string,string,string,string,address)')
  );
  
  // Format the response into the CertificateMetadata type
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

/**
 * @function transferTestTokens
 * @description Utility function to transfer Algos between accounts
 * Used primarily for funding the application address with minimum balance
 * @param {algosdk.Algodv2} algodClient - Algorand client instance
 * @param {algosdk.Account} sender - Sender account
 * @param {string} receiver - Receiver address
 * @param {number} amount - Amount of Algos to transfer
 * @returns {Promise<boolean>} Success status of the transfer
 */
const transferTestTokens = async (
  algodClient: algosdk.Algodv2,
  sender: algosdk.Account,
  reciever: string,
  amount: number
) => {
  // Get network parameters
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  // Create payment transaction
  const xferTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: sender.addr,
    to: reciever,
    suggestedParams,
    amount: algokit.algos(amount).microAlgos,
  });
  
  // Sign the transaction with sender's private key
  const signedXferTxn = xferTxn.signTxn(sender.sk);
  
  try {
    // Submit transaction to network
    await algodClient.sendRawTransaction(signedXferTxn).do();
    
    // Wait for confirmation
    const result = await algosdk.waitForConfirmation(algodClient, xferTxn.txID().toString(), 3);
    var confirmedRound = result['confirmed-round'];
    return true;
  } catch (e: any) {
    return false;
  }
};

/**
 * @description Main demo script execution
 * Demonstrates the full lifecycle of certificate creation and retrieval
 */
(async () => {
  // Get local network testing account
  const sender = await algokit.getLocalNetDispenserAccount(algodClient, kmdClient);

  // Initialize the contract client
  const Caller = new CredentialsWithoutAsaClient(
    {
      sender,
      resolveBy: 'id',
      id: 0,
    },
    algodClient
  );

  // Deploy the contract to the local network
  await Caller.create.createApplication({});

  // Get the application ID and address
  const { appId, appAddress } = await Caller.appClient.getAppReference();
  console.log('APP ID : ', appId);

  // Fund the application with minimum balance requirement
  await transferTestTokens(algodClient, sender, appAddress, 10);

  // Create sample certificate data
  const certificate1 = {
    url: 'https://google.com',
    ipfs_hash: 'bafkreia3fqtbi3btfy6u5pjfcjivst72gqaqgtibqj5bcniwwtnnl2atx4',
    studentEmail: 'satish@gmail.com',
    name: 'Satish',
    instituteName: 'MIC College',
    eventName: 'Graduation',
    courseTitle: "AI",
    courseStartDate: "29-08-2024",
    courseEndDate: "29-09-2025",
  };

  // Upload the certificate to the blockchain
  // Include box reference for the new certificate index
  const result1 = await Caller.uploadCertificate(
    {
      url: certificate1.url,
      ipfs_hash: certificate1.ipfs_hash,
      studentEmail: certificate1.studentEmail,
      studentName: certificate1.name,
      instituteName: certificate1.instituteName,
      eventName: certificate1.eventName,
      courseTitle: certificate1.courseTitle,
      courseStartDate: certificate1.courseStartDate,
      courseEndDate: certificate1.courseEndDate,
    },
    { boxes: [{ appId: 0, name: algosdk.bigIntToBytes(await getCurrentIndex(Caller), 8) }] }
  );

  // Display the certificate ID returned from the contract
  console.log('Uploaded certificate with ID: ', Number(result1.return));

  // Retrieve and display the certificate metadata using the contract method
  console.log(
    'Certificate Metadata: ',
    (
      await Caller.getCertificate(
        { index: (await getCurrentIndex(Caller)) - 1 },
        { boxes: [{ appId: 0, name: algosdk.bigIntToBytes((await getCurrentIndex(Caller)) - 1, 8) }] }
      )
    ).return
  );

  // Retrieve the raw box data for verification purposes
  // Shows the full tuple structure of the certificate's box storage
  const box: any = await Caller.appClient.getBoxValueFromABIType(
    algosdk.bigIntToBytes((await getCurrentIndex(Caller)) - 1, 8),
    algosdk.ABIType.from('(address,address,string,string,string,string,string,string,string,string,string)')
  );

  // Display the raw box data
  console.log(box);
})();
