import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, useToast } from '@chakra-ui/react';
import * as d3 from 'd3';

export default function AUCurveEditor({
  au = 'AU1',
  name = '',
  initialKeyframes = [],
  notes = '',
  maxTime = 5,
  timeIndicator = null,
  onImmediateAUChange,
  onChange
}) {
  const toast = useToast();
  // We'll keep a local copy of the frames for immediate D3 drawing
  const [keyframes, setKeyframes] = useState(initialKeyframes);
  const [selectedId, setSelectedId] = useState(null);

  // Domain can expand if user drags a keyframe beyond maxTime
  const [dynamicMax, setDynamicMax] = useState(
    Math.max(
      maxTime,
      initialKeyframes.length ? d3.max(initialKeyframes, (d) => d.time) : 0
    )
  );

  const svgRef = useRef(null);

  // Seed keyframes with stable IDs whenever initialKeyframes or maxTime changes
  useEffect(() => {
    const seeded = initialKeyframes.map((kf) => ({
      id: kf.id || crypto.randomUUID(),
      time: kf.time,
      intensity: kf.intensity
    }));
    setKeyframes(seeded);
    setSelectedId(null);
    const biggest = seeded.length ? d3.max(seeded, (d) => d.time) : 0;
    setDynamicMax(Math.max(maxTime, biggest));
  }, [initialKeyframes, maxTime]);

  // Each time our local keyframes changes, notify the parent
  useEffect(() => {
    onChange?.(keyframes);
  }, [keyframes, onChange]);

  /**
   * Core D3 drawing: axes, line, circles
   * Re-run whenever keyframes, dynamicMax, selectedId, or timeIndicator changes
   */
  useEffect(() => {
    if (!svgRef.current) return;

    const width = 340; // slightly wider so axes aren’t squashed
    const height = 180;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // 1) Determine final X domain
    const largestTime = keyframes.length ? d3.max(keyframes, (d) => d.time) : 0;
    const finalMax = Math.max(dynamicMax, largestTime);

    // 2) Build scales
    const xScale = d3
      .scaleLinear()
      .domain([0, finalMax])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100]) // intensities from 0..100
      .range([height - margin.bottom, margin.top]);

    // 3) Draw axes
    const xAxis = d3.axisBottom(xScale).ticks(6);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    svg
      .selectAll('g.x-axis')
      .data([0])
      .join('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis);

    svg
      .selectAll('g.y-axis')
      .data([0])
      .join('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis);

    // 4) Draw the line (sorted by time)
    const sortedKFs = [...keyframes].sort((a, b) => a.time - b.time);

    svg
      .selectAll('path.kf-line')
      .data([sortedKFs])
      .join('path')
      .attr('class', 'kf-line')
      .attr('fill', 'none')
      .attr('stroke', 'teal')
      .attr('stroke-width', 2)
      .attr(
        'd',
        d3
          .line()
          .x((d) => xScale(d.time))
          .y((d) => yScale(d.intensity))
          .curve(d3.curveMonotoneX)
      );

    // 5) Join circles
    const circleSel = svg.selectAll('circle.kf').data(keyframes, (d) => d.id);

    circleSel.exit().remove();

    const enterCircles = circleSel
      .enter()
      .append('circle')
      .attr('class', 'kf')
      .attr('r', 5)
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('fill', 'teal')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedId(d.id);
      })
      // D3 Drag
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            // Mark selected
            event.sourceEvent.stopPropagation();
            setSelectedId(d.id);
          })
          .on('drag', (event, d) => {
            const [mx, my] = [event.x, event.y];
            // Convert from pixel to data
            const newTime = xScale.invert(mx);
            const clampedY = Math.max(
              margin.top,
              Math.min(height - margin.bottom, my)
            );
            const newIntensity = yScale.invert(clampedY);

            // Possibly expand domain if user drags beyond boundary
            if (newTime > dynamicMax) {
              setDynamicMax(newTime + 1);
            }

            // Update local React state => triggers re-draw
            setKeyframes((old) =>
              old
                .map((kf) => {
                  if (kf.id === d.id) {
                    return { ...kf, time: newTime, intensity: newIntensity };
                  }
                  return kf;
                })
                .sort((a, b) => a.time - b.time)
            );

            // Optionally call immediate callback to do real-time changes
            onImmediateAUChange?.(au, newIntensity);
          })
      );

    // Update existing + newly entered circles
    circleSel
      .merge(enterCircles)
      .attr('cx', (d) => xScale(d.time))
      .attr('cy', (d) => yScale(d.intensity));

    // 6) Optional red time-indicator line
    svg.selectAll('line.time-indicator').remove();
    if (typeof timeIndicator === 'number') {
      const xPos = xScale(Math.min(timeIndicator, finalMax));
      svg
        .append('line')
        .attr('class', 'time-indicator')
        .attr('x1', xPos)
        .attr('x2', xPos)
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom)
        .attr('stroke', 'red')
        .attr('stroke-width', 2);
    }
  }, [keyframes, dynamicMax, selectedId, timeIndicator]);

  // Add a new keyframe near the last one
  function addKeyframe() {
    const largestT = keyframes.length
      ? d3.max(keyframes, (d) => d.time)
      : 0;
    const nextT = (largestT || 0) + 1;

    if (nextT > dynamicMax) {
      setDynamicMax(nextT + 1);
    }

    const newKF = {
      id: crypto.randomUUID(), // stable ID
      time: nextT,
      intensity: 50
    };
    setKeyframes((old) => [...old, newKF]);
    setSelectedId(newKF.id);
  }

  // Remove selected keyframe
  function removeKeyframe() {
    if (!selectedId) {
      toast({
        title: 'No keyframe selected',
        status: 'info',
        duration: 2000
      });
      return;
    }
    setKeyframes((old) => old.filter((kf) => kf.id !== selectedId));
    setSelectedId(null);
  }

  return (
    <Box borderWidth="1px" borderRadius="md" p={2} mb={2}>
      <Box fontWeight="bold">{name || au}</Box>
      {notes && (
        <Box fontStyle="italic" color="gray.600" mb={1}>
          {notes}
        </Box>
      )}

      <svg
        ref={svgRef}
        style={{ width: '100%', height: '180px', display: 'block' }}
      />

      <Box mt={2}>
        <Button size="sm" colorScheme="blue" onClick={addKeyframe} mr={2}>
          Add Keyframe
        </Button>
        <Button size="sm" colorScheme="red" onClick={removeKeyframe}>
          Remove Keyframe
        </Button>
      </Box>
    </Box>
  );
}