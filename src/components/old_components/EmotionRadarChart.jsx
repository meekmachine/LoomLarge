import React from 'react';
import { Radar } from 'react-chartjs-2';
import { Box } from '@chakra-ui/react';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const EmotionRadarChart = ({ emotionIntensities }) => {
    const data = {
        labels: ['Joy', 'Anger', 'Disgust', 'Fear', 'Sadness', 'Surprise'],
        datasets: [
            {
                label: 'Emotion Intensities',
                data: [
                    emotionIntensities.joy,
                    emotionIntensities.anger,
                    emotionIntensities.disgust,
                    emotionIntensities.fear,
                    emotionIntensities.sadness,
                    emotionIntensities.surprise
                ],
                backgroundColor: 'rgba(34, 202, 236, 0.2)',
                borderColor: 'rgba(34, 202, 236, 1)',
                borderWidth: 2
            }
        ]
    };

    const options = {
        scale: {
            ticks: { beginAtZero: true, max: 1 },
            angleLines: { display: true }
        }
    };

    return (
        <Box width="400px" height="400px" p={4}>
            <Radar data={data} options={options} />
        </Box>
    );
};

export default EmotionRadarChart;