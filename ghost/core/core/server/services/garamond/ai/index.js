// # Garamond AI service
//
// Task-level facade over the AI provider abstraction. Callers (admin API
// handlers, background jobs) ask for high-level tasks like
//   ai.copyedit({text})
//   ai.coverImage({book, style: 'watercolor'})
// without caring which vendor or model actually ran.
const router = require('./router');
const copyedit = require('./tasks/copyedit');
const coverImage = require('./tasks/cover-image');

module.exports = {
    router,
    copyedit,
    coverImage
};
