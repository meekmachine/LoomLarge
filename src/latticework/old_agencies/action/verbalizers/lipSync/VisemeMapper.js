class VisemeMapper {
    constructor() {
        this.visemeMap = {
            'AE': 0, 'AX': 0, 'AH': 0,
            'AA': 1,
            'AO': 2,
            'EY': 3, 'EH': 3, 'UH': 3,
            'ER': 4,
            'Y': 5, 'IY': 5, 'IH': 5, 'IX': 5,
            'W': 6, 'UW': 6,
            'OW': 7,
            'AW': 8,
            'OY': 9,
            'AY': 10,
            'H': 11,
            'R': 12,
            'L': 13,
            'S': 14, 'Z': 14,
            'SH': 15, 'CH': 15, 'JH': 15, 'ZH': 15,
            'TH': 16, 'DH': 16,
            'F': 17, 'V': 17,
            'D': 18, 'T': 18, 'N': 18,
            'K': 19, 'G': 19, 'NG': 19,
            'P': 20, 'B': 20, 'M': 20,
            'PAUSE': 'PAUSE'
        };
    }

    getVisemeAndDuration(phoneme) {
        const viseme = this.visemeMap[phoneme.toUpperCase()] !== undefined ? this.visemeMap[phoneme.toUpperCase()] : 0;
        let duration = 100; // Default duration
        if (phoneme.startsWith("PAUSE")) {
            duration = parseInt(phoneme.split('_')[1], 10) || 500; // Default pause duration
        }
        return { viseme, duration };
    }

    mapPhonemesToVisemes(phonemes) {
        return phonemes.map(phoneme => this.getVisemeAndDuration(phoneme));
    }
}

export default VisemeMapper;

