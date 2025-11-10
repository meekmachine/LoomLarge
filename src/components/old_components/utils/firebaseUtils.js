// firebaseUtils.js
import db from './firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

export const saveToFirebase = async (collectionName, data, toast) => {
    try {
        await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: new Date() // Timestamp for when the entry is created
        });
        toast({
            title: 'Data Saved',
            description: 'Your response for this expression has been recorded.',
            status: 'info',
            duration: 5000,
            isClosable: true
        });
    } catch (error) {
        console.error('Failed to save data to Firestore:', error);
        toast({
            title: 'Error',
            description: 'Failed to save data. Please try again.',
            status: 'error',
            duration: 5000,
            isClosable: true
        });
    }
};

