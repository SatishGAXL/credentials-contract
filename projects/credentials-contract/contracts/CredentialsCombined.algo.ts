import { Contract } from '@algorandfoundation/tealscript';

/**
 * @typedef CertificateMetadata
 * @description Defines the structure for educational credential certificates stored on-chain
 * @property {Address} issuedAddress - The address that issued this certificate (institution)
 * @property {Address} owner - Current owner of the certificate (initially issuer, then student after claiming)
 * @property {uint64} assetId - Algorand Standard Asset ID for the NFT representation (0 if no NFT)
 * @property {boolean} hasClawback - Whether the certificate can be clawed back
 * @property {boolean} isGDPRcompliant - Indicates if the certificate meets GDPR requirements
 * @property {string} url - Web URL where certificate details can be viewed
 * @property {string} ipfs_hash - IPFS hash pointing to certificate data stored on IPFS
 * @property {string} studentEmail - Email address of the student receiving the credential
 * @property {string} studentName - Full name of the student
 * @property {string} instituteName - Name of the issuing institution
 * @property {string} eventName - Name of the event or program (if applicable)
 * @property {string} courseTitle - Title of the course or program completed
 * @property {string} courseStartDate - Start date of the course
 * @property {string} courseEndDate - End date/completion date of the course
 */
type CertificateMetadata = {
  issuedAddress: Address;
  owner: Address;
  assetId: uint64;
  hasClawback: boolean;
  isGDPRcompliant: boolean;
  url: string;
  ipfs_hash: string;
  studentEmail: string;
  studentName: string;
  instituteName: string;
  eventName: string;
  courseTitle: string;
  courseStartDate: string;
  courseEndDate: string;
}; // 14 fields - (1+1+32+32+8+74+74+74+74+74+74+74+74+74) = 740 bytes

/**
 * @class CredentialsCombined
 * @description A comprehensive contract for managing educational credentials on Algorand blockchain
 * This contract handles the entire lifecycle of credentials, from creation to claiming to revocation
 */
export class CredentialsCombined extends Contract {
  /**
   * @property {GlobalStateKey<uint64>} index - Global counter used as certificate index
   */
  index = GlobalStateKey<uint64>();
  
  /**
   * @property {BoxMap<uint64, CertificateMetadata>} certificates - Storage for all certificates
   * Maps certificate index to certificate metadata
   * Size calculation: 8 bytes for uint64 + 740 bytes for CertificateMetadata = 748 bytes
   * MBR cost = 2500 + (748*400) = 301700 microAlgos = 0.3017 Algos per certificate
   */
  certificates = BoxMap<uint64, CertificateMetadata>({ dynamicSize: true });

  /**
   * @property {EventLogger} NewCertificate - Logs when a new certificate is created
   */
  NewCertificate = new EventLogger<{ index: uint64; certificate: CertificateMetadata }>();
  
  /**
   * @property {EventLogger} ChangedCertificate - Logs when a certificate's metadata is modified
   */
  ChangedCertificate = new EventLogger<{ index: uint64; certificate: CertificateMetadata }>();
  
  /**
   * @property {EventLogger} CertificateClaimed - Logs when a certificate is claimed by a student
   */
  CertificateClaimed = new EventLogger<{ index: uint64; certificate: CertificateMetadata }>();
  
  /**
   * @property {EventLogger} CertificateClawbacked - Logs when a certificate is revoked
   */
  CertificateClawbacked = new EventLogger<{ index: uint64; certificate: CertificateMetadata }>();

  /**
   * @description Initializes the application by setting the certificate index to 0
   */
  createApplication(): void {
    this.index.value = 0;
  }

  /**
   * @description Uploads a new certificate to the blockchain
   * @param {string} url - Web URL where certificate details can be viewed
   * @param {string} ipfs_hash - IPFS hash pointing to certificate data stored on IPFS
   * @param {string} studentEmail - Email address of the student receiving the credential
   * @param {string} studentName - Full name of the student
   * @param {string} instituteName - Name of the issuing institution
   * @param {string} eventName - Name of the event or program (if applicable)
   * @param {string} courseTitle - Title of the course or program completed
   * @param {string} courseStartDate - Start date of the course
   * @param {string} courseEndDate - End date/completion date of the course
   * @param {boolean} hasClawback - Whether the certificate can be clawed back
   * @param {uint64} assetId - Algorand Standard Asset ID for the NFT representation (0 if no NFT)
   * @param {boolean} isGDPRcompliant - Indicates if the certificate meets GDPR requirements
   * @returns {uint64} Index of the newly created certificate
   */
  uploadCertificate(
    url: string,
    ipfs_hash: string,
    studentEmail: string,
    studentName: string,
    instituteName: string,
    eventName: string,
    courseTitle: string,
    courseStartDate: string,
    courseEndDate: string,
    hasClawback: boolean,
    assetId: uint64,
    isGDPRcompliant: boolean
  ): uint64 {
    const issuedAddress = this.txn.sender;
    const nftIndex = assetId === 0 ? 0 : assetId;
    const certificate: CertificateMetadata = {
      url: url,
      ipfs_hash: ipfs_hash,
      studentEmail: studentEmail,
      studentName: studentName,
      instituteName: instituteName,
      eventName: eventName,
      issuedAddress: issuedAddress,
      owner: issuedAddress,
      courseTitle: courseTitle,
      courseStartDate: courseStartDate,
      courseEndDate: courseEndDate,
      hasClawback: hasClawback,
      assetId: nftIndex,
      isGDPRcompliant: isGDPRcompliant,
    };
    this.certificates(this.index.value).value = certificate;
    this.index.value = this.index.value + 1;
    this.NewCertificate.log({ index: this.index.value - 1, certificate: certificate });
    return this.index.value - 1;
  }

  /**
   * @description Retrieves a certificate's metadata by its index
   * @param {uint64} index - The index of the certificate to retrieve
   * @returns {CertificateMetadata} Complete certificate metadata
   * @throws {string} "Invalid Index" if the certificate doesn't exist
   */
  getCertificate(index: uint64): CertificateMetadata {
    assert(this.certificates(index).exists, 'Invalid Index');
    return this.certificates(index).value;
  }

  /**
   * @description Changes the owner of an existing certificate
   * Only the original issuer can perform this operation
   * @param {uint64} index - The index of the certificate to update
   * @param {Address} newOwner - New owner address for the certificate
   * @throws {string} "Invalid Index" if the certificate doesn't exist
   * @throws {string} "Only issuedAddress Can Update this field" if sender isn't the issuer
   */
  changeOwner(index: uint64, newOwner: Address) {
    assert(this.certificates(index).exists, 'Invalid Index');
    const issuedAddress = this.certificates(index).value.issuedAddress;
    assert(issuedAddress == this.txn.sender, 'Only issuedAddress Can Update this field');
    this.certificates(index).replace(32, rawBytes(newOwner)); // replace owner address in certificate box
    this.ChangedCertificate.log({ index: index, certificate: this.certificates(index).value });
  }

  /**
   * @description Updates the metadata of an existing certificate
   * Only the original issuer can perform this operation
   * @param {uint64} index - The index of the certificate to update
   * @param {boolean} hasClawback - Whether the certificate can be clawed back
   * @param {string} url - Web URL where certificate details can be viewed
   * @param {string} ipfs_hash - IPFS hash pointing to certificate data stored on IPFS
   * @param {string} studentEmail - Email address of the student receiving the credential
   * @param {string} studentName - Full name of the student
   * @param {string} instituteName - Name of the issuing institution
   * @param {string} eventName - Name of the event or program (if applicable)
   * @param {string} courseTitle - Title of the course or program completed
   * @param {string} courseStartDate - Start date of the course
   * @param {string} courseEndDate - End date/completion date of the course
   * @param {boolean} isGDPRcompliant - Indicates if the certificate meets GDPR requirements
   * @throws {string} "Invalid Index" if the certificate doesn't exist
   * @throws {string} "Only issuedAddress Can Update this field" if sender isn't the issuer
   */
  changeMetadata(
    index: uint64,
    hasClawback: boolean,
    url: string,
    ipfs_hash: string,
    studentEmail: string,
    studentName: string,
    instituteName: string,
    eventName: string,
    courseTitle: string,
    courseStartDate: string,
    courseEndDate: string,
    isGDPRcompliant: boolean
  ) {
    assert(this.certificates(index).exists, 'Invalid Index');
    const issuedAddress = this.certificates(index).value.issuedAddress;
    assert(issuedAddress == this.txn.sender, 'Only issuedAddress Can Update this field');
    const oldMetadata = this.certificates(index).value;
    const newMetadata: CertificateMetadata = {
      url: url,
      ipfs_hash: ipfs_hash,
      studentEmail: studentEmail,
      studentName: studentName,
      instituteName: instituteName,
      eventName: eventName,
      issuedAddress: oldMetadata.issuedAddress,
      owner: oldMetadata.owner,
      courseTitle: courseTitle,
      courseStartDate: courseStartDate,
      courseEndDate: courseEndDate,
      assetId: oldMetadata.assetId,
      hasClawback: hasClawback,
      isGDPRcompliant: isGDPRcompliant,
    };
    this.certificates(index).value = newMetadata;
    this.ChangedCertificate.log({ index: index, certificate: this.certificates(index).value });
  }

  /**
   * @description Allows a student to claim their certificate
   * For certificates with NFT representation, transfers the NFT to the student
   * For certificates without NFT, simply updates ownership in metadata
   * @param {uint64} index - The index of the certificate to claim
   * @param {PayTxn} verifyTxn - Payment transaction used for verification (sender must be freeze address)
   * @throws {string} "Invalid Index" if the certificate doesn't exist
   * @throws {string} "No NFT Minted for this Certificate" if hasClawback is true but assetId is 0
   * @throws {string} "Clawback Not Set to Contract" if contract doesn't have clawback authority
   * @throws {string} "Already Claimed" if the certificate has already been claimed
   * @throws {string} "Receiver Not Opted to Asset" if receiver hasn't opted in to the asset
   */
  claimCertificate(index: uint64, verifyTxn: PayTxn): void {
    const certificate = this.certificates(index).value;
    if (certificate.hasClawback) {
      const assetId = certificate.assetId;
      assert(assetId != 0, 'No NFT Minted for this Certificate');
      const asset = AssetID.fromUint64(certificate.assetId);
      verifyPayTxn(verifyTxn, {
        sender: asset.freeze, // Asset Freeze Address Is the arc76 password account constructed using student email, cause student doesn't need to have wallet while asset is being minted
        receiver: asset.freeze,
        amount: 0,
      });
      assert(asset.clawback == this.app.address, 'Clawback Not Set to Contract');
      assert(asset.manager.assetBalance(assetId) > 0, 'Already Claimed');
      assert(this.txn.sender.isOptedInToAsset(assetId), 'Receiver Not Opted to Asset');
      sendAssetTransfer({
        xferAsset: asset,
        assetAmount: 1,
        assetSender: asset.manager,
        assetReceiver: this.txn.sender,
        fee: 0,
      });
      this.certificates(index).replace(32, rawBytes(this.txn.sender)); // replace owner address in certificate box
    } else {
      this.certificates(index).replace(32, rawBytes(this.txn.sender)); // replace owner address in certificate box
    }
    this.CertificateClaimed.log({ index: index, certificate: this.certificates(index).value });
  }

  /**
   * @description Allows an issuer to revoke a certificate they issued
   * For certificates with NFT representation, transfers the NFT back to the issuer
   * For certificates without NFT, updates ownership in metadata back to the issuer
   * @param {uint64} index - The index of the certificate to claw back
   * @param {Address} holdingAddress - The address currently holding the certificate
   * @throws {string} "Invalid Index" if the certificate doesn't exist
   * @throws {string} "No NFT Minted for this Certificate" if hasClawback is true but assetId is 0
   * @throws {string} "Clawback Not Set to Contract" if contract doesn't have clawback authority
   * @throws {string} "Only Owner can Clawback" if sender is not the asset manager
   * @throws {string} "Holding Address does not hold certificate" if the address doesn't hold the certificate
   * @throws {string} "Receiver Not Opted to Asset" if receiver hasn't opted in to the asset
   * @throws {string} "Only Owner Can Clawback" if certificate doesn't have clawback and sender isn't the owner
   */
  clawbackCertificate(index: uint64, holdingAddress: Address) {
    const certificate = this.certificates(index).value;
    const assetId = certificate.assetId;
    if (certificate.hasClawback) {
      assert(assetId != 0, 'No NFT Minted for this Certificate');
      const asset = AssetID.fromUint64(certificate.assetId);
      assert(asset.clawback == this.app.address, 'Clawback Not Set to Contract');
      assert(asset.manager == this.txn.sender, 'Only Owner can Clawback');
      assert(holdingAddress.assetBalance(assetId) > 0, 'Holding Address does not hold certificate');
      assert(this.txn.sender.isOptedInToAsset(assetId), 'Receiver Not Opted to Asset');
      sendAssetTransfer({
        xferAsset: asset,
        assetSender: holdingAddress,
        assetAmount: 1,
        assetReceiver: this.txn.sender,
        fee: 0,
      });
      this.certificates(index).replace(32, rawBytes(this.txn.sender));
    } else {
      assert(certificate.owner == this.txn.sender, 'Only Owner Can Clawback');
      this.certificates(index).replace(32, rawBytes(this.txn.sender));
    }
    this.CertificateClawbacked.log({ index: index, certificate: this.certificates(index).value });
  }
}
