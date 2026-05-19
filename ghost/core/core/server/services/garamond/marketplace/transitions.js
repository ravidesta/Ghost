// # Marketplace state transitions
//
// Pure: who can move an offer between which states. Every lifecycle
// step in the orchestrator goes through `assertTransition` first so the
// rules live in one place and are exhaustively testable.
//
// Lifecycle:
//
//   draft  ─post→ posted  ─claim→ claimed  ─start→ in_progress
//                                                       │
//                                                       ▼
//                                                  delivered
//                                                       │
//                                       ┌────────accept─┤
//                                       ▼               ▼
//                                   accepted        disputed
//
//   Any non-terminal state can also be canceled by the right party.

const ROLES = ['author', 'provider', 'admin'];
const TERMINAL = new Set(['accepted', 'disputed', 'canceled']);

// {from: {action: {to, who: ['author'|'provider'|'admin']}}}
const TRANSITIONS = {
    draft: {
        post:   {to: 'posted',     who: ['author', 'admin']},
        cancel: {to: 'canceled',   who: ['author', 'admin']}
    },
    posted: {
        claim:  {to: 'claimed',    who: ['provider', 'admin']},
        cancel: {to: 'canceled',   who: ['author', 'admin']}
    },
    claimed: {
        start:  {to: 'in_progress', who: ['provider', 'admin']},
        cancel: {to: 'canceled',   who: ['author', 'admin']}
    },
    in_progress: {
        deliver: {to: 'delivered', who: ['provider', 'admin']},
        dispute: {to: 'disputed',  who: ['author', 'provider', 'admin']},
        cancel:  {to: 'canceled',  who: ['author', 'admin']}
    },
    delivered: {
        accept:  {to: 'accepted',  who: ['author', 'admin']},
        dispute: {to: 'disputed',  who: ['author', 'provider', 'admin']}
    }
};

function isTerminal(status) {
    return TERMINAL.has(status);
}

/**
 * Determine the result of an action.
 *
 * @param {string} from   current status
 * @param {string} action e.g. 'post', 'claim', 'deliver'
 * @param {string} who    'author'|'provider'|'admin'
 * @returns {{to: string}}
 * @throws  if `from` is terminal, `action` is unknown for this state, or
 *          `who` is not authorised to take it
 */
function assertTransition(from, action, who) {
    if (!ROLES.includes(who)) {
        throw new Error(`Unknown actor "${who}"`);
    }
    if (isTerminal(from)) {
        throw new Error(`Offer is in a terminal state (${from}) and cannot transition`);
    }
    const fromRules = TRANSITIONS[from];
    if (!fromRules) {
        throw new Error(`Unknown source status "${from}"`);
    }
    const rule = fromRules[action];
    if (!rule) {
        throw new Error(`Action "${action}" is not allowed from status "${from}"`);
    }
    if (!rule.who.includes(who)) {
        throw new Error(`Actor "${who}" cannot ${action} an offer in status "${from}"`);
    }
    return {to: rule.to};
}

module.exports = {
    TRANSITIONS,
    TERMINAL,
    ROLES,
    isTerminal,
    assertTransition
};
