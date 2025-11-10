// WikiTooltip.jsx
import React, { useState, useEffect } from 'react';
import { Tooltip, Box, Spinner, Link, Image } from '@chakra-ui/react';

/**
 * WikiTooltip:
 *   muscle: string, e.g. "orbicularis oculi"
 *   links: array of wiki links e.g. ["https://en.wikipedia.org/wiki/Orbicularis_oculi_muscle"]
 *   children: The text you show, e.g. "Eyes Closed (orbicularis oculi)"
 */
export default function WikiTooltip({ muscle = '', links = [], children }) {
  const [loading, setLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    if (!muscle || !links.length) return;
    setLoading(true);

    // Example: fetch from Wikipedia or parse the link => demonstration only
    // For real usage, you'd do a fetch to the MediaWiki API
    const t = setTimeout(() => {
      // Suppose we found an image:
      setImgUrl('https://upload.wikimedia.org/wikipedia/commons/2/2e/Orbicularis_oculi.png');
      setLoading(false);
    }, 1000);

    return () => clearTimeout(t);
  }, [muscle, links]);

  // If no muscle or links, just return children with no tooltip
  if (!muscle && !links.length) {
    return <>{children}</>;
  }

  const tooltipContent = (
    <Box>
      {loading && <Spinner size="sm" />}
      {!loading && imgUrl && (
        <Image src={imgUrl} alt={muscle} maxW="200px" mb={2} />
      )}
      {!loading && links.map((l) => (
        <Box key={l}>
          <Link href={l} isExternal color="blue.300">
            {muscle} on Wikipedia
          </Link>
        </Box>
      ))}
    </Box>
  );

  return (
    <Tooltip label={tooltipContent} hasArrow placement="top">
      <Box as="span" display="inline-block">
        {children}
      </Box>
    </Tooltip>
  );
}