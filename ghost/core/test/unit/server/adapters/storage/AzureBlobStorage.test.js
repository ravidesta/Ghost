const assert = require('node:assert/strict');

const AzureBlobStorage = require('../../../../../core/server/adapters/storage/AzureBlobStorage');

describe('AzureBlobStorage adapter', function () {
    it('throws when container is missing', function () {
        assert.throws(() => new AzureBlobStorage({connectionString: 'x'}), /container/);
    });

    it('throws when no credentials are provided', function () {
        assert.throws(() => new AzureBlobStorage({container: 'c'}), /connectionString|credentials/);
    });

    it('accepts a connection string', function () {
        const adapter = new AzureBlobStorage({
            container: 'c',
            connectionString: 'DefaultEndpointsProtocol=https;AccountName=a;AccountKey=b;EndpointSuffix=core.windows.net'
        });
        assert.deepEqual(adapter.requiredFns, ['exists', 'save', 'serve', 'delete', 'read']);
    });

    it('accepts account name + key', function () {
        const adapter = new AzureBlobStorage({
            container: 'c',
            accountName: 'a',
            accountKey: 'b'
        });
        assert.equal(adapter.accountName, 'a');
    });

    it('accepts account name + SAS token', function () {
        const adapter = new AzureBlobStorage({
            container: 'c',
            accountName: 'a',
            sasToken: 'sv=2022-11-02&sig=abc'
        });
        assert.equal(adapter.sasToken, 'sv=2022-11-02&sig=abc');
    });

    it('accepts managed identity (BYO)', function () {
        const adapter = new AzureBlobStorage({
            container: 'c',
            accountName: 'a',
            useManagedIdentity: true
        });
        assert.equal(adapter.useManagedIdentity, true);
    });

    it('normalises the path prefix', function () {
        const adapter = new AzureBlobStorage({
            container: 'c',
            connectionString: 'x',
            pathPrefix: '/books/'
        });
        assert.equal(adapter.pathPrefix, 'books');
    });

    it('strips trailing slashes from the CDN URL', function () {
        const adapter = new AzureBlobStorage({
            container: 'c',
            connectionString: 'x',
            cdnUrl: 'https://cdn.example.com/'
        });
        assert.equal(adapter.cdnUrl, 'https://cdn.example.com');
    });

    it('serve() returns a passthrough middleware', function () {
        const adapter = new AzureBlobStorage({
            container: 'c',
            connectionString: 'x'
        });
        const mw = adapter.serve();
        let called = false;
        mw({}, {}, () => {
            called = true;
        });
        assert.equal(called, true);
    });
});
