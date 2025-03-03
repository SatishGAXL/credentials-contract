import { Contract } from '@algorandfoundation/tealscript';

/**
 * @typedef CertificateMetadata
 * @description Defines the structure for educational credential certificates stored on-chain
 * This is a simplified version without ASA-related properties
 * @property {Address} issuedAddress - The address that issued this certificate (institution)
 * @property {Address} owner - Current owner of the certificate (initially issuer, then student)
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
  url: string;
  ipfs_hash: string;
  studentEmail: string;
  studentName: string;
  instituteName: string;
  eventName: string;
  courseTitle: string;
  courseStartDate: string;
  courseEndDate: string;
};

/**
 * @class CredentialsWithoutAsa
 * @description A simplified certificate management contract without ASA integration
 * This contract provides basic certificate creation and management functionality
 * but doesn't use Algorand Standard Assets (ASAs) to represent certificates
 */
export class CredentialsWithoutAsa extends Contract {
  /**
   * @property {GlobalStateKey<uint64>} index - Global counter used as certificate index
   */
  index = GlobalStateKey<uint64>();
  
  /**
   * @property {BoxMap<uint64, CertificateMetadata>} certificates - Storage for all certificates
   * Maps certificate index to certificate metadata
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
  ): uint64 {
    const issuedAddress = this.txn.sender;
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
    this.certificates(index).replace(32, rawBytes(newOwner));
    this.ChangedCertificate.log({ index: index, certificate: this.certificates(index).value });
  }

  /**
   * @description Updates the metadata of an existing certificate
   * Only the original issuer can perform this operation
   * @param {uint64} index - The index of the certificate to update
   * @param {string} url - Web URL where certificate details can be viewed
   * @param {string} ipfs_hash - IPFS hash pointing to certificate data stored on IPFS
   * @param {string} studentEmail - Email address of the student receiving the credential
   * @param {string} studentName - Full name of the student
   * @param {string} instituteName - Name of the issuing institution
   * @param {string} eventName - Name of the event or program (if applicable)
   * @param {string} courseTitle - Title of the course or program completed
   * @param {string} courseStartDate - Start date of the course
   * @param {string} courseEndDate - End date/completion date of the course
   * @throws {string} "Invalid Index" if the certificate doesn't exist
   * @throws {string} "Only issuedAddress Can Update this field" if sender isn't the issuer
   */
  changeMetadata(
    index: uint64,
    url: string,
    ipfs_hash: string,
    studentEmail: string,
    studentName: string,
    instituteName: string,
    eventName: string,
    courseTitle: string,
    courseStartDate: string,
    courseEndDate: string,
  ) {
    assert(this.certificates(index).exists, 'Invalid Index');
    const issuedAddress = this.certificates(index).value.issuedAddress;
    assert(issuedAddress == this.txn.sender, 'Only issuedAddress Can Update this field');
    // this.certificates(index).replace(
    //   64,
    //   rawBytes({
    //     url: url,
    //     ipfs_hash: ipfs_hash,
    //     studentEmail: studentEmail,
    //     name: name,
    //     instituteName: instituteName,
    //     eventName: eventName,
    //   })
    // );
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
    };
    this.certificates(index).value = newMetadata;
  }
}
