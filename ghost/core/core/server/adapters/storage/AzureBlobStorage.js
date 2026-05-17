// # Azure Blob Storage adapter
//
// Stores images/media/files in an Azure Blob Storage container.
//
// Config (via `adapters.storage.AzureBlobStorage`):
//   - connectionString: full Azure Storage connection string (preferred)
//   - accountName + accountKey: shared-key auth
//   - accountName + sasToken: SAS auth
//   - container: target container name (required)
//   - pathPrefix: optional prefix prepended to every blob name
//   - cdnUrl: optional CDN base URL for serving (e.g. https://cdn.example.com)
//   - useManagedIdentity: true to use DefaultAzureCredential (BYO identity)
//
// BYO: users can point this adapter at their own Azure subscription simply by
// supplying their own credentials in config. A platform-default set of
// credentials can also be supplied — the same class serves both.
const path = require('path');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const StorageBase = require('ghost-storage-base');

const messages = {
    missingContainer: 'Azure Blob Storage adapter requires a `container` config value.',
    missingCredentials: 'Azure Blob Storage adapter requires a `connectionString`, account key, SAS token, or `useManagedIdentity`.',
    notFound: 'File not found',
    notFoundWithRef: 'File not found: {file}',
    uploadFailed: 'Could not upload file to Azure Blob Storage'
};

class AzureBlobStorage extends StorageBase {
    constructor(config = {}) {
        super();

        const {
            connectionString,
            accountName,
            accountKey,
            sasToken,
            container,
            pathPrefix = '',
            cdnUrl,
            useManagedIdentity = false
        } = config;

        if (!container) {
            throw new errors.IncorrectUsageError({message: tpl(messages.missingContainer)});
        }

        const hasCredentials = Boolean(
            connectionString ||
            (accountName && accountKey) ||
            (accountName && sasToken) ||
            useManagedIdentity
        );

        if (!hasCredentials) {
            throw new errors.IncorrectUsageError({message: tpl(messages.missingCredentials)});
        }

        this.container = container;
        this.pathPrefix = pathPrefix.replace(/^\/+|\/+$/g, '');
        this.cdnUrl = cdnUrl ? cdnUrl.replace(/\/+$/, '') : null;
        this.connectionString = connectionString;
        this.accountName = accountName;
        this.accountKey = accountKey;
        this.sasToken = sasToken;
        this.useManagedIdentity = useManagedIdentity;

        this.requiredFns = ['exists', 'save', 'serve', 'delete', 'read'];
    }

    _getContainerClient() {
        if (this._containerClient) {
            return this._containerClient;
        }

        // Lazy-require so the SDK is only needed when this adapter is active.
        const {
            BlobServiceClient,
            StorageSharedKeyCredential
        } = require('@azure/storage-blob');

        let serviceClient;
        if (this.connectionString) {
            serviceClient = BlobServiceClient.fromConnectionString(this.connectionString);
        } else if (this.accountName && this.accountKey) {
            const credential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
            serviceClient = new BlobServiceClient(`https://${this.accountName}.blob.core.windows.net`, credential);
        } else if (this.accountName && this.sasToken) {
            const sas = this.sasToken.startsWith('?') ? this.sasToken : `?${this.sasToken}`;
            serviceClient = new BlobServiceClient(`https://${this.accountName}.blob.core.windows.net${sas}`);
        } else {
            const {DefaultAzureCredential} = require('@azure/identity');
            serviceClient = new BlobServiceClient(
                `https://${this.accountName}.blob.core.windows.net`,
                new DefaultAzureCredential()
            );
        }

        this._containerClient = serviceClient.getContainerClient(this.container);
        return this._containerClient;
    }

    _blobName(targetDir, filename) {
        const joined = path.posix.join(this.pathPrefix, targetDir || '', filename);
        return joined.replace(/^\/+/, '');
    }

    _publicUrl(blobName) {
        if (this.cdnUrl) {
            return `${this.cdnUrl}/${blobName}`;
        }
        const client = this._getContainerClient();
        return client.getBlockBlobClient(blobName).url;
    }

    async exists(fileName, targetDir) {
        const blobName = this._blobName(targetDir || '', fileName);
        const blob = this._getContainerClient().getBlockBlobClient(blobName);
        return await blob.exists();
    }

    async save(file, targetDir) {
        const dir = targetDir || this.getTargetDir();
        const filename = await this.getUniqueFileName(file, dir);
        const blobName = this._blobName('', filename);

        const blob = this._getContainerClient().getBlockBlobClient(blobName);
        const fs = require('fs-extra');
        const buffer = await fs.readFile(file.path);

        try {
            await blob.uploadData(buffer, {
                blobHTTPHeaders: {
                    blobContentType: file.type,
                    blobCacheControl: 'public, max-age=31536000, immutable'
                }
            });
        } catch (err) {
            throw new errors.InternalServerError({err, message: tpl(messages.uploadFailed)});
        }

        return this._publicUrl(blobName);
    }

    /**
     * Upload a buffer directly, matching the LocalStorageBase API. Used by
     * the static site publisher and any other generator that already has
     * bytes in memory.
     *
     * @param {Buffer|string} buffer
     * @param {string} targetPath  path under the configured prefix (e.g. "authors/jane/index.html")
     * @param {Object} [options]
     * @param {string} [options.contentType]
     * @param {string} [options.cacheControl]
     * @returns {Promise<string>} the public URL the blob is served at
     */
    async saveRaw(buffer, targetPath, options = {}) {
        if (!targetPath) {
            throw new errors.BadRequestError({message: 'targetPath is required'});
        }
        const blobName = this._blobName('', targetPath);
        const blob = this._getContainerClient().getBlockBlobClient(blobName);

        try {
            await blob.uploadData(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer), {
                blobHTTPHeaders: {
                    blobContentType: options.contentType,
                    blobCacheControl: options.cacheControl || 'public, max-age=300'
                }
            });
        } catch (err) {
            throw new errors.InternalServerError({err, message: tpl(messages.uploadFailed)});
        }

        return this._publicUrl(blobName);
    }

    serve() {
        // Blobs are served directly from Azure (or the configured CDN);
        // Ghost only needs a pass-through middleware here.
        return function azureBlobServe(req, res, next) {
            next();
        };
    }

    async delete(fileName, targetDir) {
        const blobName = this._blobName(targetDir || '', fileName);
        const blob = this._getContainerClient().getBlockBlobClient(blobName);
        const response = await blob.deleteIfExists();
        return response.succeeded;
    }

    async read(options = {}) {
        if (!options.path) {
            throw new errors.BadRequestError({message: 'path is required'});
        }

        let blobName = options.path;
        if (this.cdnUrl && blobName.startsWith(this.cdnUrl)) {
            blobName = blobName.slice(this.cdnUrl.length).replace(/^\/+/, '');
        } else {
            const accountPrefix = `https://${this.accountName || ''}.blob.core.windows.net/${this.container}/`;
            if (blobName.startsWith(accountPrefix)) {
                blobName = blobName.slice(accountPrefix.length);
            }
        }

        const blob = this._getContainerClient().getBlockBlobClient(blobName);
        try {
            const buffer = await blob.downloadToBuffer();
            return buffer;
        } catch (err) {
            if (err.statusCode === 404) {
                throw new errors.NotFoundError({
                    err,
                    message: tpl(messages.notFoundWithRef, {file: options.path})
                });
            }
            throw err;
        }
    }
}

module.exports = AzureBlobStorage;
