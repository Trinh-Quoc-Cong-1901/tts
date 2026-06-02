/**
 * Audio Merger Utility for combining multiple MP3 files
 *
 * Uses FFmpeg to merge audio chunks created from long text processing
 * into a single, seamless MP3 file. Handles memory management and
 * temporary file cleanup automatically.
 *
 * @author TTS Development Team
 * @version 2.0.0
 */
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

// Set ffmpeg path to the static binary
ffmpeg.setFfmpegPath(ffmpegStatic);

class AudioMerger {
    constructor(tempDir = './temp') {
        this.tempDir = tempDir;
        this.ensureTempDir();
    }

    /**
     * Ensure temp directory exists
     */
    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Merge multiple audio buffers into a single MP3 file
     * @param {Array} audioChunks - Array of {buffer: Buffer, index: number}
     * @param {Object} options - Merge options
     * @returns {Promise<Buffer>} Merged audio buffer
     */
    async mergeAudioBuffers(audioChunks, options = {}) {
        if (!Array.isArray(audioChunks) || audioChunks.length === 0) {
            throw new Error('No audio chunks provided');
        }

        if (audioChunks.length === 1) {
            // Single chunk, return as-is
            return audioChunks[0].buffer;
        }

        const timestamp = Date.now();
        const tempFiles = [];
        const outputPath = path.join(this.tempDir, `merged_${timestamp}.mp3`);

        try {
            // Step 1: Save all chunks as temporary files
            console.log(`Merging ${audioChunks.length} audio chunks...`);

            for (let i = 0; i < audioChunks.length; i++) {
                const chunk = audioChunks[i];
                if (!chunk.buffer || !Buffer.isBuffer(chunk.buffer)) {
                    throw new Error(`Invalid audio buffer at chunk ${i}`);
                }

                const tempFilePath = path.join(this.tempDir, `chunk_${timestamp}_${i}.mp3`);
                fs.writeFileSync(tempFilePath, chunk.buffer);
                tempFiles.push(tempFilePath);

                console.log(`  Saved chunk ${i} (${chunk.buffer.length} bytes) to ${path.basename(tempFilePath)}`);
            }

            // Step 2: Merge using ffmpeg
            await this.mergeFiles(tempFiles, outputPath, options);

            // Step 3: Read merged file
            const mergedBuffer = fs.readFileSync(outputPath);
            console.log(`Audio merge completed: ${mergedBuffer.length} bytes`);

            return mergedBuffer;

        } finally {
            // Cleanup temporary files
            this.cleanupFiles([...tempFiles, outputPath]);
        }
    }

    /**
     * Merge audio files using ffmpeg
     * @param {Array} inputFiles - Array of file paths
     * @param {string} outputPath - Output file path
     * @param {Object} options - FFmpeg options
     */
    async mergeFiles(inputFiles, outputPath, options = {}) {
        return new Promise((resolve, reject) => {
            let command = ffmpeg();

            // Add all input files
            inputFiles.forEach(file => {
                command = command.input(file);
            });

            // Configure merge settings
            const audioCodec = options.audioCodec || 'libmp3lame';
            const bitrate = options.bitrate || '128k';
            const sampleRate = options.sampleRate || 24000;

            command
                .audioCodec(audioCodec)
                .audioBitrate(bitrate)
                .audioFrequency(sampleRate)
                .format('mp3')
                .complexFilter([
                    `concat=n=${inputFiles.length}:v=0:a=1[out]`
                ], 'out')
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('FFmpeg process started:', commandLine);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`Merging progress: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log('Audio merging finished successfully');
                    resolve();
                })
                .on('error', (err, stdout, stderr) => {
                    console.error('FFmpeg error:', err.message);
                    console.error('FFmpeg stderr:', stderr);
                    reject(new Error(`Audio merging failed: ${err.message}`));
                })
                .run();
        });
    }

    /**
     * Validate audio chunks before merging
     * @param {Array} audioChunks - Array of audio chunks
     * @returns {Object} Validation result
     */
    validateAudioChunks(audioChunks) {
        const result = {
            isValid: true,
            issues: [],
            statistics: {
                totalChunks: 0,
                totalSize: 0,
                averageSize: 0
            }
        };

        if (!Array.isArray(audioChunks)) {
            result.isValid = false;
            result.issues.push('audioChunks must be an array');
            return result;
        }

        if (audioChunks.length === 0) {
            result.isValid = false;
            result.issues.push('No audio chunks provided');
            return result;
        }

        let totalSize = 0;

        for (let i = 0; i < audioChunks.length; i++) {
            const chunk = audioChunks[i];

            // Check chunk structure
            if (!chunk || typeof chunk !== 'object') {
                result.isValid = false;
                result.issues.push(`Chunk ${i}: Invalid chunk object`);
                continue;
            }

            // Check buffer
            if (!chunk.buffer || !Buffer.isBuffer(chunk.buffer)) {
                result.isValid = false;
                result.issues.push(`Chunk ${i}: Invalid or missing buffer`);
                continue;
            }

            // Check buffer size
            if (chunk.buffer.length === 0) {
                result.isValid = false;
                result.issues.push(`Chunk ${i}: Empty buffer`);
                continue;
            }

            // Check index
            if (typeof chunk.index !== 'number' || chunk.index < 0) {
                result.issues.push(`Chunk ${i}: Invalid index (should be non-negative number)`);
            }

            totalSize += chunk.buffer.length;
        }

        result.statistics.totalChunks = audioChunks.length;
        result.statistics.totalSize = totalSize;
        result.statistics.averageSize = Math.round(totalSize / audioChunks.length);

        // Additional checks
        if (totalSize > 50 * 1024 * 1024) { // 50MB limit
            result.issues.push('Total audio size exceeds 50MB - may cause memory issues');
        }

        if (audioChunks.length > 50) {
            result.issues.push('Too many chunks (>50) - may cause performance issues');
        }

        return result;
    }

    /**
     * Test audio chunk structure
     * @param {Buffer} audioBuffer - Audio buffer to test
     * @returns {boolean} True if buffer appears to be valid MP3
     */
    isValidMP3Buffer(audioBuffer) {
        if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length < 10) {
            return false;
        }

        // Check for MP3 frame header (simplified check)
        // MP3 frames start with 11 bits set to 1 (0xFFE)
        for (let i = 0; i < Math.min(audioBuffer.length - 1, 100); i++) {
            if ((audioBuffer[i] & 0xFF) === 0xFF && (audioBuffer[i + 1] & 0xE0) === 0xE0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Cleanup temporary files
     * @param {Array} filePaths - Array of file paths to delete
     */
    cleanupFiles(filePaths) {
        for (const filePath of filePaths) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up: ${path.basename(filePath)}`);
                }
            } catch (error) {
                console.warn(`Failed to cleanup ${filePath}:`, error.message);
            }
        }
    }

    /**
     * Get audio file info using ffprobe
     * @param {string} filePath - Path to audio file
     * @returns {Promise<Object>} Audio file information
     */
    async getAudioInfo(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Failed to get audio info: ${err.message}`));
                } else {
                    resolve(metadata);
                }
            });
        });
    }
}

module.exports = AudioMerger;

// For testing - example usage
if (require.main === module) {
    const merger = new AudioMerger();

    // Test validation with sample data
    const testChunks = [
        { buffer: Buffer.alloc(1000, 0xFF), index: 0 },
        { buffer: Buffer.alloc(1500, 0xAA), index: 1 },
        { buffer: Buffer.alloc(2000, 0x55), index: 2 }
    ];

    console.log('=== Audio Merger Test ===');
    console.log('Validation result:', merger.validateAudioChunks(testChunks));

    // Test single chunk (should return as-is)
    const singleChunk = [{ buffer: Buffer.from('test'), index: 0 }];
    merger.mergeAudioBuffers(singleChunk)
        .then(result => {
            console.log('Single chunk merge result:', result.toString());
        })
        .catch(err => {
            console.error('Test error:', err.message);
        });
}