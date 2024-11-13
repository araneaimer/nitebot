import { HfInference } from '@huggingface/inference';
import fs from 'fs';
import { promisify } from 'util';
import fetch from 'node-fetch';
import path from 'path';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

class VoiceService {
    constructor() {
        if (!process.env.HUGGING_FACE_TOKEN) {
            throw new Error('HUGGING_FACE_TOKEN is not set in environment variables');
        }
        this.hf = new HfInference(process.env.HUGGING_FACE_TOKEN);
    }

    async downloadVoice(fileUrl) {
        try {
            console.log('Downloading voice from:', fileUrl);
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to download voice file: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const tempDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }
            
            const tempPath = path.join(tempDir, `voice_${Date.now()}.oga`);
            await writeFile(tempPath, buffer);
            console.log('Voice file saved to:', tempPath);
            return tempPath;
        } catch (error) {
            console.error('Error downloading voice:', error);
            throw error;
        }
    }

    async transcribeAudio(filePath) {
        try {
            console.log('Starting transcription of:', filePath);
            
            // Read file as buffer
            const audioBuffer = await readFile(filePath);
            
            // Use Hugging Face's Whisper model for transcription
            const result = await this.hf.automaticSpeechRecognition({
                model: 'openai/whisper-base',
                data: audioBuffer,
            });
            
            console.log('Transcription completed:', result.text);
            return result.text;

        } catch (error) {
            console.error('Error transcribing audio:', error);
            throw error;
        } finally {
            // Clean up the temporary file
            try {
                await unlink(filePath);
                console.log('Cleaned up temporary file:', filePath);
            } catch (error) {
                console.error('Error cleaning up file:', error);
            }
        }
    }
}

export const voiceService = new VoiceService(); 