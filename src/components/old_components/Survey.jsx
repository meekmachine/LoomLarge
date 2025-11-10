import React, { useState } from 'react';
import { Flex, Icon, Text, Tooltip, useToast } from '@chakra-ui/react';
import { StarIcon } from '@chakra-ui/icons';

const Survey = ({ questions, currentPromptB5T, onSurveyComplete, index }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState({});
    const [hoverIndex, setHoverIndex] = useState(-1);
    const toast = useToast();

    const handleResponse = (rating) => {
        const question = questions[currentQuestionIndex];
        const newResponses = { 
            ...responses, 
            [question.id]: {
                rating: rating,
                question: question.text,
                B5T:  question?.B5T
            }
        };
        setResponses(newResponses);

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            onSurveyComplete(newResponses);
            if (index){
              toast({
                title: "Section Completed",
                description: `You have completed the ${index} / 5 sections.`,
                status: "success",
                duration: 5000,
                isClosable: true,
              });
            }
        }
    };

    const renderStars = () => {
        const labels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
        const rating = responses[questions[currentQuestionIndex].id]?.rating || 0;
        return labels.map((label, index) => (
            <Tooltip label={label} key={index} hasArrow placement="top">
                <Icon
                    as={StarIcon}
                    boxSize={10}
                    m={1}
                    color={index <= (hoverIndex >= 0 ? hoverIndex : rating - 1) ? "orange.400" : "gray.300"}
                    onClick={() => handleResponse(index + 1)}
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(-1)}
                    _hover={{
                        color: "orange.600",
                        cursor: "pointer",
                        transform: "scale(1.1)",
                        transition: "transform 0.2s ease-in-out"
                    }}
                />
            </Tooltip>
        ));
    };

    return (
        <Flex justifyContent="center" alignItems="center" position="fixed" bottom="0" w="full" p={4} bgColor="gray.100">
            <Text fontSize="xl" fontFamily="Avenir" fontWeight="bold" mr={4}>
                {questions[currentQuestionIndex].text}
            </Text>
            {renderStars()}
        </Flex>
    );
};

export default Survey;
