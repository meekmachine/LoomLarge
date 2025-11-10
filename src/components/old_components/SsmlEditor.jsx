import React, { useState, useRef } from 'react';
import { Box, Button, Input, Select, Stack, Textarea } from '@chakra-ui/react';

const SsmlEditor = ({ text, setText }) => {
    const [selectedTag, setSelectedTag] = useState('');
    const [attributes, setAttributes] = useState({});
    const textAreaRef = useRef();

    const ssmlElements = [
        {
            tag: 'voice',
            description: 'Specify the voice',
            attributes: { name: 'Custom input (voice name)' },
        },
        {
            tag: 'prosody',
            description: 'Modify pitch, rate, and volume',
            attributes: {
                pitch: ['default', 'high', 'low', 'medium', '+10%', '-10%'],
                rate: ['default', 'slow', 'medium', 'fast', '+10%', '-10%'],
                volume: ['default', 'silent', 'x-soft', 'soft', 'medium', 'loud', 'x-loud', '+5dB', '-5dB'],
            },
        },
        {
            tag: 'break',
            description: 'Add a pause',
            attributes: {
                time: 'Custom input (e.g., 500ms, 2s)',
                strength: ['none', 'x-weak', 'weak', 'medium', 'strong', 'x-strong'],
            },
        },
        {
            tag: 'emphasis',
            description: 'Emphasize text',
            attributes: { level: ['strong', 'moderate', 'reduced', 'none'] },
        },
        {
            tag: 'say-as',
            description: 'Specify how text is spoken',
            attributes: {
                'interpret-as': ['date', 'time', 'telephone', 'currency', 'spell-out', 'characters', 'ordinal', 'cardinal', 'fraction', 'unit', 'address'],
                format: 'Custom input (based on interpret-as)',
            },
        },
        {
            tag: 'audio',
            description: 'Embed an audio file',
            attributes: {
                src: 'Custom input (audio URL)',
                repeatCount: 'Custom input (e.g., 1, 3)',
                soundLevel: ['+10dB', '+5dB', 'default', '-5dB', '-10dB'],
            },
        },
        {
            tag: 'lang',
            description: 'Specify the language',
            attributes: { 'xml:lang': ['en-US', 'fr-FR', 'de-DE', 'ja-JP'] },
        },
        {
            tag: 'phoneme',
            description: 'Provide phonetic pronunciation',
            attributes: {
                alphabet: ['ipa', 'x-sampa'],
                ph: 'Custom input (phoneme value)',
            },
        },
        {
            tag: 'mark',
            description: 'Mark a point in text',
            attributes: { name: 'Custom input (mark name)' },
        },
    ];

    const handleAddElement = () => {
        if (!selectedTag) return;

        const start = textAreaRef.current.selectionStart;
        const end = textAreaRef.current.selectionEnd;
        const selectedText = text.slice(start, end) || '';

        let newElement = `<${selectedTag}`;

        for (const [key, value] of Object.entries(attributes)) {
            if (value) newElement += ` ${key}="${value}"`;
        }

        newElement += selectedTag === 'break' ? ' />' : `>${selectedText}</${selectedTag}>`;

        const updatedText = text.slice(0, start) + newElement + text.slice(end);
        setText(updatedText);

        setAttributes({});
    };

    const handleAttributeChange = (key, value) => {
        setAttributes((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <Box>
            <Select
                placeholder="Select SSML Element"
                onChange={(e) => {
                    setSelectedTag(e.target.value);
                    setAttributes({});
                }}
                mb={4}
            >
                {ssmlElements.map((el) => (
                    <option key={el.tag} value={el.tag}>
                        {el.tag} - {el.description}
                    </option>
                ))}
            </Select>

            {selectedTag && (
                <Stack spacing={2} mb={4}>
                    {Object.entries(
                        ssmlElements.find((el) => el.tag === selectedTag)?.attributes || {}
                    ).map(([attr, options]) => (
                        <Box key={attr}>
                            {Array.isArray(options) ? (
                                <Select
                                    placeholder={`Select ${attr}`}
                                    onChange={(e) => handleAttributeChange(attr, e.target.value)}
                                    value={attributes[attr] || ''}
                                >
                                    {options.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <Input
                                    placeholder={options}
                                    onChange={(e) => handleAttributeChange(attr, e.target.value)}
                                    value={attributes[attr] || ''}
                                />
                            )}
                        </Box>
                    ))}
                </Stack>
            )}

            <Button onClick={handleAddElement} colorScheme="blue" mb={4}>
                Add Element
            </Button>

            <Textarea
                ref={textAreaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Edit SSML here..."
                rows={6}
            />
        </Box>
    );
};

export default SsmlEditor;