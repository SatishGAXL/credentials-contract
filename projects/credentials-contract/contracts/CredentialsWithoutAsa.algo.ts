import { Contract } from '@algorandfoundation/tealscript';

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

export class CredentialsWithoutAsa extends Contract {
  index = GlobalStateKey<uint64>();
  certificates = BoxMap<uint64, CertificateMetadata>({ dynamicSize: true });

  NewCertificate = new EventLogger<{ index: uint64; certificate: CertificateMetadata }>();
  ChangedCertificate = new EventLogger<{ index: uint64; certificate: CertificateMetadata }>();

  createApplication(): void {
    this.index.value = 0;
  }

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

  getCertificate(index: uint64): CertificateMetadata {
    assert(this.certificates(index).exists, 'Invalid Index');
    return this.certificates(index).value;
  }

  changeOwner(index: uint64, newOwner: Address) {
    assert(this.certificates(index).exists, 'Invalid Index');
    const issuedAddress = this.certificates(index).value.issuedAddress;
    assert(issuedAddress == this.txn.sender, 'Only issuedAddress Can Update this field');
    this.certificates(index).replace(32, rawBytes(newOwner));
    this.ChangedCertificate.log({ index: index, certificate: this.certificates(index).value });
  }

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
