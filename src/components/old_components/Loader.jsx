import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';
import { particleOptions } from './particleOptions'; // Make sure this is correctly imported
import YouTube from 'react-youtube';
import GameText from './GameText'
// Keyframes for the loading bar width
const loadAnimation = keyframes`
  from { width: 0%; }
  to { width: 100%; }
`;

// Keyframes for the color cycling effect
const cycleColors = keyframes`
  0% {background-position: 0% 50%}
  50% {background-position: 100% 50%}
  100% {background-position: 0% 50%}
`;
const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
`;

const zoomOutAnimation = keyframes`
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.6);
  }
`;

const LoaderContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: black;
  z-index: 10; // Ensure the background is below the loading bar and image
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 1;
  transition: opacity 0.5s ease;
`;

const LoaderBarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 5px;
  background: linear-gradient(to right, violet, indigo, blue, green, yellow, orange, red);
  background-size: 200% 200%;
  animation: ${cycleColors} 5s ease infinite; // Adjust time as needed for the cycling effect
  z-index: 30; // Highest z-index to ensure it's above everything
`;

const LoaderBar = styled.div`
  height: 100%;
  background-color: transparent;
  width: 0%;
  animation: ${loadAnimation} 90s linear forwards; // 90 seconds to complete
`;

const img = ['logo.png', 'visage.webp', 'lovelace.jpg', 'visfaces.webp','visfaces.webp','visfaces.webp', 'lol.webp'][Math.floor(Math.random() * 7)]
const vid = ["MG-kyulvO_c","YF_fu6HCloQ", "VWtEP3Uc8A8", "BUYJyVubL6w", "HgH_LsBHTPw", "ANArGmr74u4", "sK2v4GrASjw", "Fy1xQSiLx8U","K0HSD_i2DvA", "rQMtXDkF9q4","rQMtXDkF9q4"][Math.floor(Math.random() * 11)]
const ParticlesContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 20; // Ensure this is above the PosterImage but below the LoaderBarContainer
`;

// Ensure PosterImage has an appropriate z-index to sit below the Particles
const PosterImage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('${process.env.PUBLIC_URL}/images/${img}');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  opacity: 1;
  animation: ${zoomOutAnimation} 40s ease-out infinite alternate;
  z-index: -1; // Lower than ParticlesContainer
`;


const YoutubePlayerContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000; // Ensure it's above everything else
  width: 360px;
  height: 203px; // 16:9 aspect ratio for 360px width
`;

function Loader({ isLoading }) {
  const [loading, setLoading] = useState(isLoading);
  const youtubeRef = useRef(null);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);


  const particlesInit = async (main) => {
    await loadFull(main);
  };

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      start: 0, // Start at 64 seconds
    },
  };

  return (
    <>
      {loading && (
        <LoaderContainer>
          <LoaderBarContainer>
            <LoaderBar />
          </LoaderBarContainer>
          <Particles
            id="tsparticles"
            init={particlesInit}
            options={particleOptions("#ffffff")}
          />
          <GameText />
          <PosterImage />
          <YoutubePlayerContainer>
            <YouTube videoId={vid} opts={opts} ref={youtubeRef} />
          </YoutubePlayerContainer>
        </LoaderContainer>
      )}
    </>
  );
}

export default Loader;
