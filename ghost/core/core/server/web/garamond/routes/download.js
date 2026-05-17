// # Member-facing gated download
//
// GET /garamond/books/:id/download
//
// Requires an authenticated member session. The storefront decides whether
// this member has paid for this book; if so, the packager produces a
// watermarked .garamond bundle in-memory and streams it to the response.
const logging = require('@tryghost/logging');

module.exports = async function handleMemberDownload(req, res, next) {
    try {
        if (!req.member || !req.member.id) {
            return res.status(401).json({error: 'sign_in_required'});
        }

        const bookId = req.params.id;
        const {storefront, packager} = require('../../../services/garamond');
        const models = require('../../../models');

        const access = await storefront.hasAccess({memberId: req.member.id, bookId});
        if (!access) {
            return res.status(403).json({error: 'forbidden'});
        }

        const book = await models.Book.findOne({id: bookId}, {withRelated: ['chapters']});
        if (!book) {
            return res.status(404).json({error: 'not_found'});
        }

        const bundle = packager.buildBundle({
            book: book.toJSON(),
            chapters: book.related('chapters').toJSON(),
            purchaserMemberId: req.member.id
        });

        res.setHeader('Content-Type', bundle.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${bundle.filename}"`);
        return res.status(200).send(bundle.body);
    } catch (err) {
        logging.error({err, message: 'garamond: member download failed'});
        return next(err);
    }
};
