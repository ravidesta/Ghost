// # Garamond AI task router
//
// Maps task names to providers. Configurable per-task so a deploy can say
// "copyedit goes to Claude, marketing copy to GPT-4o-mini, cover art to
// OpenAI's image model." If a task has no explicit mapping, a sensible
// default picks the right provider given what's actually configured.
const config = require('../../../../shared/config');
const ai = require('../../ai');

const TEXT_TASK_DEFAULTS = ['anthropic', 'openai', 'azure'];
const IMAGE_TASK_DEFAULTS = ['openai', 'azure'];

const KNOWN_TASKS = {
    copyedit:        {kind: 'text'},
    summary:         {kind: 'text'},
    marketingCopy:   {kind: 'text'},
    seriesAnalysis:  {kind: 'text'},
    coverImage:      {kind: 'image'},
    seriesCovers:    {kind: 'image'},
    watercolorAccent:{kind: 'image'}
};

function _taskConfig() {
    return (config.get('ai') && config.get('ai').tasks) || {};
}

function _pickFirstAvailable(candidates, kind) {
    for (const name of candidates) {
        let provider;
        try {
            provider = ai.getProvider(name);
        } catch {
            continue;
        }
        if (!provider.isAvailable()) {
            continue;
        }
        if (kind === 'image' && !provider.supportsImages()) {
            continue;
        }
        return provider;
    }
    return null;
}

/**
 * Resolve which provider handles a task.
 *
 * @param {string} taskName
 * @returns {{provider: import('../../ai/AIProviderBase')|null, kind: string}}
 */
function resolveProvider(taskName) {
    const task = KNOWN_TASKS[taskName];
    if (!task) {
        throw new Error(`Unknown AI task: ${taskName}`);
    }

    const mapping = _taskConfig();
    const explicit = mapping[taskName];
    if (explicit) {
        try {
            const provider = ai.getProvider(explicit);
            if (provider.isAvailable() && (task.kind !== 'image' || provider.supportsImages())) {
                return {provider, kind: task.kind};
            }
        } catch {
            // configured provider unknown — fall through to defaults
        }
    }

    const defaults = task.kind === 'image' ? IMAGE_TASK_DEFAULTS : TEXT_TASK_DEFAULTS;
    return {provider: _pickFirstAvailable(defaults, task.kind), kind: task.kind};
}

module.exports = {
    KNOWN_TASKS,
    resolveProvider
};
