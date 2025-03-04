import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import { CredentialsClient } from '../contracts/clients/CredentialsClient';
import { buildPasswordAccount, getAssetHolding, transferTestTokens, uploadCertificateAsMutableNFT } from './helper';
import algosdk, { makePaymentTxnWithSuggestedParamsFromObject } from 'algosdk';
import { Clients } from 'algonft';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: CredentialsClient;
let appId: number | bigint;
let appAddress: string;
let certificateAssetId: number | bigint;
let universityAccount: algosdk.Account;
let studentAccount: algosdk.Account;
let studentEmail: string = 'satish@gmail.com';
let clients: { algodClient: algosdk.Algodv2; indexerClient: algosdk.Indexer };

describe('Credentials', () => {
  beforeAll(async () => {
    // Generate accounts for university and student
    universityAccount = algosdk.generateAccount();
    studentAccount = algosdk.generateAccount();
    clients = new Clients({ activeNetwork: 'testnet' }).getClients();
    console.log(universityAccount.addr, studentAccount.addr);

    // Generate a test account and fund it with test tokens
    const testAccount = algosdk.generateAccount();
    await transferTestTokens(testAccount.addr, algokit.algos(0.5));
    await transferTestTokens(studentAccount.addr, algokit.algos(0.5));
    await transferTestTokens(universityAccount.addr, algokit.algos(0.5));

    // Initialize the CredentialsClient
    appClient = new CredentialsClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      clients.algodClient
    );

    // Deploy the contract
    await appClient.create.createApplication({});

    // Get the application ID and address
    const ref = await appClient.appClient.getAppReference();
    appId = ref.appId;
    appAddress = ref.appAddress;

    // Upload a certificate as a mutable NFT
    const res = await uploadCertificateAsMutableNFT(
      universityAccount,
      './building.jpg',
      'building.jpg',
      studentEmail,
      'satish',
      'mic',
      'graduation',
      'grad cert',
      'gc',
      true,
      appAddress
    );

    if (res) {
      const { assetId, transactionId } = res;
      certificateAssetId = assetId;
    }
  });

  test('beforeClaim', async () => {
    // Check asset holdings before claiming the certificate
    const universityHolding = await getAssetHolding(universityAccount.addr, Number(certificateAssetId));
    expect(universityHolding).toBe(1);
    const studentHolding = await getAssetHolding(studentAccount.addr, Number(certificateAssetId));
    expect(studentHolding).toBe(0);
  });

  test('afterClaim', async () => {
    // Opt-in the student account to the asset
    const optin = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: studentAccount.addr,
      to: studentAccount.addr,
      assetIndex: Number(certificateAssetId),
      amount: 0,
      suggestedParams: await Clients.getClients('testnet').algodClient.getTransactionParams().do(),
    });
    const signedoptinTxn = optin.signTxn(studentAccount.sk);
    const { txId } = await Clients.getClients('testnet').algodClient.sendRawTransaction(signedoptinTxn).do();
    const optinres = await algosdk.waitForConfirmation(Clients.getClients('testnet').algodClient, txId, 3);

    // Create a payment transaction for verification
    const authAccount = buildPasswordAccount(studentEmail);
    const sp = await Clients.getClients('testnet').algodClient.getTransactionParams().do();
    sp.flatFee = true;
    sp.fee = 0;
    const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: authAccount.addr,
      to: authAccount.addr,
      amount: 0,
      suggestedParams: sp,
    });
    const signedTxn = payTxn.signTxn(authAccount.sk);

    // Claim the certificate
    const res = await appClient.claimCertificate(
      {
        assetId: certificateAssetId,
        verifyTxn: { transaction: payTxn, signer: authAccount },
      },
      {
        sender: studentAccount,
        assets: [Number(certificateAssetId)],
        accounts: [studentAccount.addr, universityAccount.addr],
        sendParams: { fee: algokit.algos(0.003) },
      }
    );

    // Check asset holdings after claiming the certificate
    const universityHolding = await getAssetHolding(universityAccount.addr, Number(certificateAssetId));
    expect(universityHolding).toBe(0);
    const studentHolding = await getAssetHolding(studentAccount.addr, Number(certificateAssetId));
    expect(studentHolding).toBe(1);
  });

  test('clawbackCertificate', async () => {
    // Clawback the certificate from the student account
    const res = await appClient.clawbackCertificate(
      {
        assetId: certificateAssetId,
        holdingAddress: studentAccount.addr,
      },
      {
        sender: universityAccount,
        assets: [Number(certificateAssetId)],
        accounts: [studentAccount.addr, universityAccount.addr],
        sendParams: { fee: algokit.algos(0.002) },
      }
    );

    // Check asset holdings after clawback
    const universityHolding = await getAssetHolding(universityAccount.addr, Number(certificateAssetId));
    expect(universityHolding).toBe(1);
    const studentHolding = await getAssetHolding(studentAccount.addr, Number(certificateAssetId));
    expect(studentHolding).toBe(0);
  });
});
