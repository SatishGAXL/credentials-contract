import { Contract } from '@algorandfoundation/tealscript';

/**
 * @class Credentials
 * @description A simplified version of the credentials contract that focuses only on
 * claiming and clawback functionality for ASA-based certificates
 */
export class Credentials extends Contract {
  /**
   * @description Allows a student to claim their certificate NFT
   * @param {AssetID} assetId - The asset ID of the certificate NFT to claim
   * @param {PayTxn} verifyTxn - The verification transaction proving authority to claim
   * 
   * The verification process works as follows:
   * 1. Verifies the payment transaction comes from the freeze address (password account)
   * 2. Ensures the contract has clawback authority over the asset
   * 3. Checks that the certificate hasn't already been claimed
   * 4. Verifies the receiver has opted in to the asset
   * 5. Transfers the asset from the manager (issuer) to the student
   */
  claimCertificate(assetId: AssetID, verifyTxn: PayTxn): void {
    verifyPayTxn(verifyTxn, {
      sender: assetId.freeze,
      receiver: assetId.freeze,
      amount: 0,
    });
    assert(assetId.clawback == this.app.address, 'Clawback Not Set to Contract');
    assert(assetId.manager.assetBalance(assetId) > 0, 'Already Claimed');
    assert(this.txn.sender.isOptedInToAsset(assetId), 'Receiver Not Opted to Asset');
    sendAssetTransfer({
      xferAsset: assetId,
      assetAmount: 1,
      assetSender: assetId.manager,
      assetReceiver: this.txn.sender,
      fee: 0,
    });
  }

  /**
   * @description Allows the certificate issuer to revoke a certificate
   * @param {AssetID} assetId - The asset ID of the certificate NFT to clawback
   * @param {Address} holdingAddress - The address currently holding the certificate NFT
   * 
   * The clawback process works as follows:
   * 1. Ensures the contract has clawback authority over the asset
   * 2. Verifies that only the asset manager (issuer) can initiate the clawback
   * 3. Confirms the holding address actually has the certificate
   * 4. Verifies the receiver (manager) has opted in to the asset
   * 5. Transfers the asset from the current holder back to the manager (issuer)
   */
  clawbackCertificate(assetId: AssetID, holdingAddress: Address) {
    assert(assetId.clawback == this.app.address, 'Clawback Not Set to Contract');
    assert(assetId.manager == this.txn.sender, 'Only Manager can Clawback');
    assert(holdingAddress.assetBalance(assetId) > 0, 'Holding Address does not hold certificate');
    assert(this.txn.sender.isOptedInToAsset(assetId), 'Receiver Not Opted to Asset');
    sendAssetTransfer({
      xferAsset: assetId,
      assetSender: holdingAddress,
      assetAmount: 1,
      assetReceiver: this.txn.sender,
      fee: 0,
    });
  }
}
