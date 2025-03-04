import algosdk from 'algosdk';
import { Arc19 } from 'algonft/nft/arc19';
import { Arc76 } from 'algonft/arc76';
import { ipfsUploader } from 'algonft/nft/ipfsUploader';
import { Clients } from 'algonft/clients';
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';
import { PINATA_JWT, WALLET_MNEMONIC } from '../contracts/config';

/**
 * @description Initialize IPFS uploader using Pinata service
 */
const ipfs = new ipfsUploader('pinata', { pinataJwt: PINATA_JWT });

/**
 * @description Initialize Algorand clients for interacting with the blockchain
 */
const clients = new Clients({ activeNetwork: 'testnet' });

/**
 * @function uploadCertificateAsMutableNFT
 * @description Uploads a certificate as a mutable NFT to the Algorand blockchain
 * @param {algosdk.Account} account - The account that will create the NFT
 * @param {string} filePath - The file path of the certificate to upload
 * @param {string} fileName - The file name of the certificate to upload
 * @param {string} studentEmail - The email of the student receiving the certificate
 * @param {string} name - The name of the student
 * @param {string} instituteName - The name of the issuing institution
 * @param {string} eventName - The name of the event or program
 * @param {string} assetName - The name of the asset
 * @param {string} unitName - The unit name of the asset
 * @param {boolean} hasClawback - Whether the asset has clawback enabled
 * @param {string} appAddress - The address of the application managing the asset
 * @returns {Promise<any>} The result of the NFT creation
 */
export const uploadCertificateAsMutableNFT = async (
  account: algosdk.Account,
  filePath: string,
  fileName: string,
  studentEmail: string,
  name: string,
  instituteName: string,
  eventName: string,
  assetName: string,
  unitName: string,
  hasClawback: boolean,
  appAddress: string
) => {
  try {
    // Create a password-based account for the student using their email
    const studentAccount = Arc76.passwordAccount(studentEmail);
    console.log('studentAccount', studentAccount.addr);

    // Create the NFT using Arc19 standard
    const res = await Arc19.createNFT({
      clients,
      path: filePath,
      filename: fileName,
      ipfsUploader: ipfs,
      creator: account,
      name: assetName,
      unitName,
      manager: account.addr,
      freeze: studentAccount.addr,
      clawback: hasClawback ? appAddress : undefined,
      properties: { studentEmail, name, instituteName, eventName },
    });
    return res;
  } catch (error) {
    console.error(error);
  }
};

/**
 * @function getAssetHolding
 * @description Retrieves the asset holding for a specific account and asset ID
 * @param {string} account - The account address to check
 * @param {number} assetId - The asset ID to check
 * @returns {Promise<number>} The amount of the asset held by the account
 */
export const getAssetHolding = async (account: string, assetId: number): Promise<number> => {
  const { indexerClient } = clients.getClients();
  
  // Retrieve asset information
  const assetInfo = await indexerClient.lookupAssetByID(assetId).do();
  console.log('assetInfo', assetInfo);
  
  let decimals = 0;
  if (assetInfo['asset']) {
    decimals = assetInfo['asset']['params']['decimals'];
  } else {
    throw new Error('Asset not found');
  }
  
  // Retrieve account information
  const r = await indexerClient.lookupAccountByID(account).do();
  console.log('r', r);
  console.log(r.account['assets']);
  
  // Retrieve asset holding information
  const res = await indexerClient.lookupAccountAssets(account).assetId(assetId).do();
  console.log(res);
  
  if (res['assets'].length > 0) {
    const assetHolding = res['assets'][0];
    return assetHolding['amount'];
  } else {
    return 0;
  }
};

/**
 * @function buildPasswordAccount
 * @description Builds a password-based account using the Arc76 standard
 * @param {string} email - The email to use for generating the password account
 * @returns {algosdk.Account} The generated password account
 */
export const buildPasswordAccount = (email: string) => {
  return Arc76.passwordAccount(email);
};

/**
 * @function transferTestTokens
 * @description Transfers test tokens (Algos) from a master account to a receiver
 * @param {string} receiver - The receiver address
 * @param {AlgoAmount} amount - The amount of Algos to transfer
 * @returns {Promise<boolean>} Success status of the transfer
 */
export const transferTestTokens = async (receiver: string, amount: AlgoAmount) => {
  const { algodClient, indexerClient } = clients.getClients();
  
  // Master account mnemonic for testnet
  const account = algosdk.mnemonicToSecretKey(WALLET_MNEMONIC);
  const algod_client = algodClient;
  
  // Get network parameters
  const suggestedParams = await algod_client.getTransactionParams().do();
  
  // Create payment transaction
  const xferTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: account.addr,
    to: receiver,
    suggestedParams,
    amount: amount.microAlgos,
  });
  
  // Sign the transaction with master account's private key
  const signedXferTxn = xferTxn.signTxn(account.sk);
  
  try {
    // Submit transaction to network
    await algod_client.sendRawTransaction(signedXferTxn).do();
    
    // Wait for confirmation
    const result = await algosdk.waitForConfirmation(algod_client, xferTxn.txID().toString(), 3);
    var confirmedRound = result['confirmed-round'];
    return true;
  } catch (e: any) {
    return false;
  }
};
