/**
 * Text Chunking Utility for Long Text Processing
 *
 * This module provides intelligent text chunking for texts exceeding the TTS limit.
 * It splits text at natural boundaries (sentences, punctuation) to maintain
 * speech quality and meaning.
 *
 * @author TTS Development Team
 * @version 2.0.0
 */

class TextChunker {
    constructor(maxChunkSize = 4500) {
        this.maxChunkSize = maxChunkSize; // Leave buffer from 5000 limit

        // Priority order for splitting (best to worst)
        this.splitPatterns = [
            { pattern: /\.\s+/g, name: 'sentence_end' },           // Period + space - Tốt nhất
            { pattern: /[!?]\s+/g, name: 'exclamation_question' }, // ! or ? + space - Rất tốt
            { pattern: /[;:]\s+/g, name: 'semicolon_colon' },      // ; or : + space - Tốt
            { pattern: /,\s+/g, name: 'comma' },                   // Comma + space - Chấp nhận được
            { pattern: /\n\n+/g, name: 'paragraph_break' },        // Paragraph breaks - Tốt cho đoạn văn
            { pattern: /\n/g, name: 'line_break' },                // Line breaks - Chấp nhận được
            { pattern: /\s+/g, name: 'word_boundary' }             // Any whitespace - Cuối cùng
        ];
    }

    /**
     * Split text into chunks while preserving sentence structure
     * @param {string} text - The text to split
     * @returns {Array} Array of chunk objects with text and metadata
     */
    chunkText(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('Invalid text input');
        }

        // Clean text (remove extra spaces but preserve structure)
        text = text.trim();

        // If text is already within limit, return as single chunk
        if (text.length <= this.maxChunkSize) {
            return [{
                text: text,
                index: 0,
                length: text.length,
                splitMethod: 'no_split'
            }];
        }

        const chunks = [];
        let remaining = text;
        let chunkIndex = 0;

        while (remaining.length > 0) {
            if (remaining.length <= this.maxChunkSize) {
                // Last chunk
                chunks.push({
                    text: remaining.trim(),
                    index: chunkIndex,
                    length: remaining.trim().length,
                    splitMethod: 'last_chunk'
                });
                break;
            }

            const chunk = this.findBestChunk(remaining);
            const chunkText = chunk.text.trim();

            if (chunkText.length > 0) {
                chunks.push({
                    text: chunkText,
                    index: chunkIndex,
                    length: chunkText.length,
                    splitMethod: chunk.splitMethod
                });
                chunkIndex++;
            }

            remaining = remaining.substring(chunk.splitIndex).trim();
        }

        return chunks;
    }

    /**
     * Find the best place to split text within size limit
     * @param {string} text - Text to analyze
     * @returns {Object} Chunk information with text, split index, and method
     */
    findBestChunk(text) {
        // Try each split pattern in priority order
        for (const splitPattern of this.splitPatterns) {
            const chunk = this.trySplitPattern(text, splitPattern);
            if (chunk) {
                return chunk;
            }
        }

        // Fallback: hard cut at maxChunkSize (should rarely happen)
        console.warn('Using hard cut for text chunking - this may break sentence structure');
        return {
            text: text.substring(0, this.maxChunkSize),
            splitIndex: this.maxChunkSize,
            splitMethod: 'hard_cut'
        };
    }

    /**
     * Try to split text using a specific pattern
     * @param {string} text - Text to split
     * @param {Object} splitPattern - Pattern object with regex and name
     * @returns {Object|null} Chunk information or null if no good split found
     */
    trySplitPattern(text, splitPattern) {
        const { pattern, name } = splitPattern;

        // Reset regex to start from beginning
        pattern.lastIndex = 0;

        const matches = [];
        let match;

        // Find all matches within our size limit
        while ((match = pattern.exec(text)) !== null) {
            const splitPoint = match.index + match[0].length;

            if (splitPoint <= this.maxChunkSize) {
                matches.push({
                    index: match.index,
                    length: match[0].length,
                    splitPoint: splitPoint
                });
            } else {
                break; // We've exceeded our limit
            }
        }

        if (matches.length === 0) {
            return null;
        }

        // Use the last valid match (furthest point within limit)
        const bestMatch = matches[matches.length - 1];

        return {
            text: text.substring(0, bestMatch.splitPoint),
            splitIndex: bestMatch.splitPoint,
            splitMethod: name
        };
    }

    /**
     * Analyze text and provide chunking statistics
     * @param {string} text - Text to analyze
     * @returns {Object} Analysis results
     */
    analyzeText(text) {
        if (!text || typeof text !== 'string') {
            return {
                totalLength: 0,
                estimatedChunks: 0,
                wouldBeSplit: false,
                recommendations: ['Text is empty or invalid']
            };
        }

        const totalLength = text.length;
        const estimatedChunks = Math.ceil(totalLength / this.maxChunkSize);
        const wouldBeSplit = totalLength > this.maxChunkSize;

        const recommendations = [];

        if (!wouldBeSplit) {
            recommendations.push('Text is within single chunk limit');
        } else {
            recommendations.push(`Text will be split into approximately ${estimatedChunks} chunks`);

            // Check for potential splitting quality
            const sentences = text.match(/[.!?]+\s+/g);
            const paragraphs = text.match(/\n\n+/g);

            const sentenceCount = sentences ? sentences.length : 0;
            const paragraphCount = paragraphs ? paragraphs.length + 1 : 1;

            if (sentenceCount < estimatedChunks) {
                recommendations.push('Warning: Very long sentences may result in mid-sentence cuts');
            } else {
                recommendations.push('Good sentence structure - splitting should be clean');
            }

            if (paragraphCount > 1) {
                recommendations.push('Multiple paragraphs detected - good for natural splitting');
            }
        }

        return {
            totalLength,
            estimatedChunks,
            wouldBeSplit,
            recommendations,
            avgChunkSize: Math.round(totalLength / estimatedChunks),
            sentenceCount: text.match(/[.!?]+\s+/g)?.length || 0,
            paragraphCount: text.match(/\n\n+/g)?.length + 1 || 1
        };
    }

    /**
     * Preview how text would be split (for debugging)
     * @param {string} text - Text to preview
     * @param {number} maxPreviewChunks - Maximum chunks to show in preview
     * @returns {Array} Preview of chunks with split information
     */
    previewSplit(text, maxPreviewChunks = 3) {
        try {
            const chunks = this.chunkText(text);
            const preview = chunks.slice(0, maxPreviewChunks).map(chunk => ({
                index: chunk.index,
                length: chunk.length,
                splitMethod: chunk.splitMethod,
                textPreview: chunk.text.length > 100
                    ? chunk.text.substring(0, 100) + '...'
                    : chunk.text,
                endsWithPunctuation: /[.!?;:]$/.test(chunk.text.trim())
            }));

            return {
                totalChunks: chunks.length,
                preview: preview,
                hasMore: chunks.length > maxPreviewChunks
            };
        } catch (error) {
            return {
                error: error.message,
                totalChunks: 0,
                preview: [],
                hasMore: false
            };
        }
    }
}

// Export class
module.exports = TextChunker;

// For testing - example usage
if (require.main === module) {
    const chunker = new TextChunker();

    // Test with sample text
    const sampleText = `Đây là câu đầu tiên. Đây là câu thứ hai với nội dung dài hơn một chút để kiểm tra.

Đây là đoạn văn thứ hai. Nó có nhiều câu: câu này, câu kia; và câu cuối cùng!

Đoạn cuối cùng với text rất dài `.repeat(100);

    console.log('=== Text Analysis ===');
    console.log(chunker.analyzeText(sampleText));

    console.log('\n=== Split Preview ===');
    console.log(chunker.previewSplit(sampleText));
}