import { Contract } from '@algorandfoundation/tealscript';

export class Credentials extends Contract {
  admin = GlobalStateKey<Address>({ key: 'a' });

  createApplication(): void {
    this.admin.value = this.app.creator;
  }

  changeAdmin(newAdmin: Address): void {
    assert(this.txn.sender == this.admin.value);
    this.admin.value = newAdmin;
  }

  clawbackCertificate(assetId: AssetID, holdingAddress: Address, amount: uint64) {
    assert(assetId.clawback == this.app.address);
    sendAssetTransfer({
      xferAsset: assetId,
      assetSender: holdingAddress,
      assetAmount: amount,
      assetReceiver: assetId.reserve,
      fee: 0,
    });
  }
}
