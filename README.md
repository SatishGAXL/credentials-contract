# SafeCred Project - Smart Contracts

This repository contains the smart contracts for the SafeCred project, a credentialing platform using the Algorand blockchain. The platform leverages blockchain features to issue, manage, and revoke educational certificates securely and transparently.

## Features

### Blockchain Features

1. **Storing Certificate Data in a Box**: Certificate data is stored on-chain in a box, ensuring immutability and security.
2. **Issuing Certificates as NFTs**: Certificates are issued as NFTs, allowing students to claim their certificates and universities to revoke them using the clawback feature.

### Contracts

Initially, we implemented the functionality using two separate contracts:

1. **Credentials.algo.ts**: This contract handles the claiming and clawback of certificate NFTs.
2. **CredentialsWithAsa.algo.ts**: This contract stores certificate data in a box.

Later, we combined these functionalities into a single contract:

3. **CredentialsCombined.algo.ts**: This comprehensive contract manages the entire lifecycle of credentials, from creation to claiming to revocation.

### GDPR Compliance

To comply with GDPR laws, we have implemented a feature where sensitive data is hashed off-chain and stored in the box or NFT metadata if the GDPR boolean is enabled. This ensures that sensitive information is protected while still leveraging the benefits of blockchain technology.

## Contracts Overview

### Credentials.algo.ts

This contract focuses on the claiming and clawback functionality for ASA-based certificates.

- **claimCertificate**: Allows a student to claim their certificate NFT.
- **clawbackCertificate**: Allows the certificate issuer to revoke a certificate.

### CredentialsWithAsa.algo.ts

This contract stores certificate data in a box on the blockchain.

- **uploadCertificate**: Uploads a new certificate to the blockchain.
- **getCertificate**: Retrieves a certificate's metadata by its index.
- **changeOwner**: Changes the owner of an existing certificate.
- **changeMetadata**: Updates the metadata of an existing certificate.

### CredentialsCombined.algo.ts

This contract combines the functionalities of the previous two contracts, managing the entire lifecycle of credentials.

- **createApplication**: Initializes the application by setting the certificate index to 0.
- **uploadCertificate**: Uploads a new certificate to the blockchain.
- **getCertificate**: Retrieves a certificate's metadata by its index.
- **changeOwner**: Changes the owner of an existing certificate.
- **changeMetadata**: Updates the metadata of an existing certificate.
- **claimCertificate**: Allows a student to claim their certificate.
- **clawbackCertificate**: Allows an issuer to revoke a certificate they issued.

## Getting Started

To get started with the Safe Cred project, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/SatishGAXL/credentials-contract.git
   cd credentials-contract\projects\credentials-contract
   ```

2. Install dependencies:
    ```bash
   npm install
   ```

3. Set up environment variables: 
    ```bash
   cp .env.sample .env
   ```
   Replace the placeholders with real values in `.env`

4. Compilation (Optional):
    ```bash
   npm run build
   ```

5. Contract Deployment:
    
    To Deploy a Specific Contract you can use the `{contractName}.deploy.ts` scripts. You can execute the script like this:
    ```bash
   npx tsx .\contracts\CredentialsCombined.deploy.ts
   ```