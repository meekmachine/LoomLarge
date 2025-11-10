import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
    Button, Input, FormControl, FormLabel, NumberInput, NumberInputField, Textarea, Switch, Select
} from '@chakra-ui/react';

const ConfigModal = ({ isOpen, onClose, onSave, module, settings, handleInputChange, handleNumberInputChange }) => {
    const [localSettings, setLocalSettings] = useState({});

    // Load the settings when the modal opens
    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const parsedValue = tryParseValue(value);
        setLocalSettings(prev => ({
            ...prev,
            [name]: parsedValue,
        }));
        handleInputChange(e);  // Update the parent's state
    };

    const handleBooleanChange = (key, checked) => {
        setLocalSettings(prev => ({
            ...prev,
            [key]: checked,
        }));
    };

    const handleArrayChange = (e, key) => {
        const options = Array.from(e.target.selectedOptions, option => option.value); // Extract selected options
        setLocalSettings(prev => ({
            ...prev,
            [key]: options, // Update the selected voices
        }));
    };

    // Helper function to parse JSON or return the value directly for inputs
    const tryParseValue = (value) => {
        try {
            return JSON.parse(value); // Try to parse if it's an object
        } catch (e) {
            return value; // Otherwise, return it as a string
        }
    };

    const renderInputField = (key, field) => {
        switch (field.type) {
            case 'number':
                return (
                    <NumberInput
                        value={localSettings[key]}
                        min={field.min}
                        max={field.max}
                        onChange={(val) => handleNumberInputChange(key, parseFloat(val))}
                    >
                        <NumberInputField name={key} />
                    </NumberInput>
                );
            case 'boolean':
                return (
                    <Switch
                        isChecked={localSettings[key]}
                        onChange={(e) => handleBooleanChange(key, e.target.checked)}
                    />
                );
            case 'array':
                return (
                    <Select
                        multiple
                        placeholder="Select Voices"
                        value={localSettings[key] || []}
                        onChange={(e) => handleArrayChange(e, key)} // Handle multi-select changes
                    >
                        {field.options.map((option, idx) => (
                            <option key={idx} value={option}>
                                {option}
                            </option>
                        ))}
                    </Select>
                );
            default:
                return (
                    <Input
                        name={key}
                        value={localSettings[key]}
                        onChange={handleChange}
                    />
                );
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Configure {module.name}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    {module.settings && Object.keys(module.settings).map((key) => {
                        const field = module.settings[key]; // Get the field config
                        return (
                            <FormControl key={key} mb={4}>
                                <FormLabel>{field.description || key}</FormLabel>
                                {renderInputField(key, field)}
                            </FormControl>
                        );
                    })}
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" mr={3} onClick={() => onSave(localSettings)}>
                        Save
                    </Button>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ConfigModal;