// # Royalty split calculation
//
// Pure function: takes a gross amount in cents and a platform fee rate,
// returns {grossCents, platformFeeCents, netCents}. Used wherever we need to
// know "who gets what" — sale records, refunds, payout previews, the admin
// dashboard. Keeping it pure means it's trivially testable and the same
// answer regardless of whether the caller is a Stripe webhook or a manual
// adjustment.

// Default 90/10 split — the platform keeps 10% of every paid sale.
const DEFAULT_PLATFORM_FEE_RATE = 0.10;

// External-marketplace fee rates. Apple App Store, Google Play, and Amazon
// all take 30% of the listed price; we have to gross up the listed price so
// the author's take-home is unchanged. Numbers here are the marketplace's
// cut as a fraction of the listed price.
const MARKETPLACE_FEE_RATES = {
    web: 0,        // direct Stripe/PayPal — no marketplace fee
    apple: 0.30,
    google: 0.30,
    amazon: 0.30
};

/**
 * @param {Object} args
 * @param {number} args.grossCents      total the buyer paid, in the smallest currency unit
 * @param {number} [args.feeRate=0.10]  platform fee as a fraction (0.10 = 10%)
 * @param {number} [args.minFeeCents]   optional floor on the platform fee
 * @returns {{grossCents: number, platformFeeCents: number, netCents: number}}
 */
function calculateSplit({grossCents, feeRate = DEFAULT_PLATFORM_FEE_RATE, minFeeCents = 0}) {
    if (!Number.isFinite(grossCents)) {
        throw new Error('grossCents must be a finite number');
    }
    if (feeRate < 0 || feeRate > 1) {
        throw new Error('feeRate must be between 0 and 1');
    }

    // Round half-up so we don't quietly lose a cent on the platform side.
    let platformFeeCents = Math.round(grossCents * feeRate);
    if (minFeeCents > 0 && platformFeeCents < minFeeCents) {
        platformFeeCents = Math.min(minFeeCents, grossCents);
    }

    const netCents = grossCents - platformFeeCents;
    return {grossCents, platformFeeCents, netCents};
}

/**
 * Invert a split for a refund — produces negative values so the ledger sum
 * stays correct after a refund row is added.
 *
 * @param {{grossCents: number, platformFeeCents: number, netCents: number}} split
 */
function invertForRefund(split) {
    return {
        grossCents: -split.grossCents,
        platformFeeCents: -split.platformFeeCents,
        netCents: -split.netCents
    };
}

/**
 * Gross up a price so that, after a marketplace fee is taken, the platform
 * still receives the requested base amount.
 *
 *   listedPrice * (1 - marketplaceFeeRate) = basePriceCents
 *
 * Apple at 30%: ceil(basePrice / 0.70). The caller should round the result
 * up to the nearest tier the marketplace actually supports (App Store tier
 * pricing is discrete, e.g. $0.99 / $1.99 / $2.99). This function returns
 * the raw value — tier rounding lives in the marketplace adapter.
 *
 * @param {number} basePriceCents
 * @param {number} marketplaceFeeRate
 * @returns {number} the price to display in the marketplace, in cents
 */
function grossUpForMarketplace(basePriceCents, marketplaceFeeRate) {
    if (!Number.isFinite(basePriceCents) || basePriceCents < 0) {
        throw new Error('basePriceCents must be a non-negative finite number');
    }
    if (marketplaceFeeRate < 0 || marketplaceFeeRate >= 1) {
        throw new Error('marketplaceFeeRate must be in [0, 1)');
    }
    if (marketplaceFeeRate === 0) {
        return basePriceCents;
    }
    return Math.ceil(basePriceCents / (1 - marketplaceFeeRate));
}

/**
 * Full breakdown for a sale that goes through a marketplace.
 *
 * basePriceCents — what the platform wants to receive (before platform fee)
 * marketplaceFeeRate — what the marketplace takes (Apple 30%, etc.)
 * platformFeeRate — Garamond's cut of what comes through (default 10%)
 *
 * @returns {{
 *   marketplaceGrossCents: number,
 *   marketplaceFeeCents: number,
 *   grossCents: number,
 *   platformFeeCents: number,
 *   netCents: number
 * }}
 */
function calculateMarketplaceSplit({
    basePriceCents,
    marketplaceFeeRate = 0,
    platformFeeRate = DEFAULT_PLATFORM_FEE_RATE
}) {
    const marketplaceGrossCents = grossUpForMarketplace(basePriceCents, marketplaceFeeRate);
    const marketplaceFeeCents = marketplaceGrossCents - basePriceCents;
    const split = calculateSplit({grossCents: basePriceCents, feeRate: platformFeeRate});
    return {
        marketplaceGrossCents,
        marketplaceFeeCents,
        ...split
    };
}

module.exports = {
    DEFAULT_PLATFORM_FEE_RATE,
    MARKETPLACE_FEE_RATES,
    calculateSplit,
    invertForRefund,
    grossUpForMarketplace,
    calculateMarketplaceSplit
};
