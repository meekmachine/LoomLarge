import { DoubleMetaphone, WordTokenizer } from 'natural';

class PhonemeExtractor {
    constructor() {
        this.doubleMetaphone = new DoubleMetaphone();
        this.tokenizer = new WordTokenizer();
    }

    extractPhonemes(text) {
        const tokens = this.tokenizer.tokenize(text);
        const phonemes = [];

        tokens.forEach((token, index) => {
            if (token.match(/[\s,]/)) {
                phonemes.push(this.getPauseForChar(token));
            } else {
                const phoneticRepresentations = this.doubleMetaphone.process(token);
                phoneticRepresentations[0].split('').forEach(phoneme => phonemes.push(phoneme));
            }

            // Add a pause if the token is not the last one
            if (index < tokens.length - 1) {
                phonemes.push(this.getPauseForChar(' '));
            }
        });
        return phonemes;
    }

    getPauseForChar(char) {
        switch (char) {
            case ' ':
                return 'PAUSE_500'; // 500ms pause for space
            case ',':
                return 'PAUSE_300'; // 300ms pause for comma
            case '.':
            case '!':
            case '?':
                return 'PAUSE_700'; // 700ms pause for sentence end
            default:
                return 'PAUSE_100'; // 100ms for regular characters
        }
    }
}

export default PhonemeExtractor;
