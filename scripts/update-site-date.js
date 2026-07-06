#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT_PATH = path.join(ROOT, 'content.json');

const SKIP_PATTERNS = [
    /^misc\//,
    /\.(png|jpe?g|gif|webp|mp3|pdf|ico|svg)$/i,
    /^\.cursor\/hooks\//,
    /^scripts\/update-site-date\.js$/,
    /^\.git\//
];

function shouldSkip(editedFile) {
    if (!editedFile) {
        return false;
    }

    const normalized = editedFile.replace(/\\/g, '/').replace(/^\.\//, '');
    return SKIP_PATTERNS.some((pattern) => pattern.test(normalized));
}

function formatUpdatedLine(date) {
    const formatted = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return `Updated on ${formatted}.`;
}

function updateSiteDate(editedFile) {
    if (shouldSkip(editedFile)) {
        return false;
    }

    const updatedLine = formatUpdatedLine(new Date());
    const contentText = fs.readFileSync(CONTENT_PATH, 'utf8');
    const pattern = /"Updated on [^"]+\."/;

    if (!pattern.test(contentText)) {
        throw new Error('Could not find "Updated on ..." entry in content.json');
    }

    const nextText = contentText.replace(pattern, `"${updatedLine}"`);
    if (nextText === contentText) {
        return false;
    }

    fs.writeFileSync(CONTENT_PATH, nextText, 'utf8');
    return true;
}

const editedFile = process.argv[2] || '';
updateSiteDate(editedFile);
