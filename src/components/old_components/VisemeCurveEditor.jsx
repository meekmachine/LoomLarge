import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Box, Text } from '@chakra-ui/react';

/**
 * VisemeCurveEditor
 *
 * Props:
 * - viseme: string (e.g. "viseme0" or just "AH")
 * - name: string (descriptive name, e.g. "AH" or "EE" shape)
 * - initialKeyframes: array of { id, time, intensity }
 * - notes: optional string
 * - maxTime: number (the overall max time for the clip)
 * - timeIndicator: number (the current playback time; for a vertical marker)
 * - onChange(newKFs): function called after a keyframe drag ends (sorted array)
 * - onImmediateVisemeChange(visemeId, newIntensity): function called during drag
 * - width, height (optional) to control SVG size (defaults to 600x200)
 */
export default function VisemeCurveEditor({
  viseme,
  name,
  initialKeyframes = [],
  notes,
  maxTime = 5,
  timeIndicator = 0,
  onChange,
  onImmediateVisemeChange,
  width = 600,
  height = 200
}) {
  /* ------------------------------------------------------------------
   * Stretch the x‑axis so it always covers the latest key‑frame.
   * If maxTime prop is too small, extend it to (latestKF + 0.5 s).
   * ------------------------------------------------------------------ */
  const latestKF = initialKeyframes.length
    ? Math.max(...initialKeyframes.map(kf => kf.time ?? 0))
    : 0;
  const effectiveMaxTime = Math.max(maxTime, latestKF + 0.5);
  const svgRef = useRef(null);

  // Our local copy of keyframes, so we can mutate them during drag
  const [keyframes, setKeyframes] = useState(initialKeyframes);

  // Zoom transform state (pan/zoom)
  const [zoomTransform, setZoomTransform] = useState(null);

  // Keep the local keyframes in sync if parent updates them externally
  useEffect(() => {
    setKeyframes(initialKeyframes);
  }, [initialKeyframes]);

  useEffect(() => {
    if (!svgRef.current) return;

    // -- Basic chart dimensions:
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const svgWidth = width;
    const svgHeight = height;

    // -- D3 selection:
    const svg = d3.select(svgRef.current)
      .attr('width', svgWidth)
      .attr('height', svgHeight);

    // Clear previous content on each render
    svg.selectAll('*').remove();

    // -- Define scales:
    const x = d3.scaleLinear()
      .domain([0, effectiveMaxTime])       // time from 0..effectiveMaxTime
      .range([margin.left, svgWidth - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, 100])           // intensity from 0..100
      .range([svgHeight - margin.bottom, margin.top]);

    // If we have a zoom transform, apply it
    let xz = x, yz = y;
    if (zoomTransform) {
      xz = zoomTransform.rescaleX(x);
      yz = zoomTransform.rescaleY(y);
    }

    // -- Axis
    const xAxis = (g) => g
      .attr('transform', `translate(0,${svgHeight - margin.bottom})`)
      .call(d3.axisBottom(xz).ticks(5));

    const yAxis = (g) => g
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yz).ticks(5));

    // Append axes
    svg.append('g').call(xAxis);
    svg.append('g').call(yAxis);

    // Sort a copy for the line (so the path is smooth/time-ordered):
    const sortedForLine = [...keyframes].sort((a, b) => a.time - b.time);

    // Create a line generator
    const lineGenerator = d3.line()
      .x(d => xz(d.time))
      .y(d => yz(d.intensity))
      .curve(d3.curveMonotoneX);

    // Draw the path for the sorted data
    svg.append('path')
      .datum(sortedForLine)
      .attr('fill', 'none')
      .attr('stroke', 'teal')
      .attr('stroke-width', 2)
      .attr('d', lineGenerator);

    // Circles for each keyframe
    const circleSel = svg.selectAll('circle.visemeKeyframe')
      .data(keyframes, d => d.id);

    circleSel.enter()
      .append('circle')
      .attr('class', 'visemeKeyframe')
      .merge(circleSel)
      .attr('r', 5)
      .attr('fill', 'magenta')
      .attr('cx', d => xz(d.time))
      .attr('cy', d => yz(d.intensity))
      .call(d3.drag()
        .on('start', function (event, d) {
          d3.select(this).raise().attr('stroke', 'black');
        })
        .on('drag', (event, d) => {
          // Convert mouse coords back to domain
          const newTime = xz.invert(event.x);
          const newIntensity = yz.invert(event.y);

          // Clamp
          d.time = Math.max(0, Math.min(effectiveMaxTime, newTime));
          d.intensity = Math.max(0, Math.min(100, newIntensity));

          // Update circle position
          d3.select(this)
            .attr('cx', xz(d.time))
            .attr('cy', yz(d.intensity));

          // Redraw path with updated data => pass sorted copy
          const newSorted = [...keyframes].sort((a, b) => a.time - b.time);
          svg.select('path')
            .datum(newSorted)
            .attr('d', lineGenerator);

          // If immediate feedback is desired:
          if (typeof onImmediateVisemeChange === 'function') {
            onImmediateVisemeChange(viseme, d.intensity);
          }
        })
        .on('end', () => {
          d3.select(this).attr('stroke', null);
          // Sort once, then set to state => triggers final re-render
          const newArr = [...keyframes].sort((a, b) => a.time - b.time);
          setKeyframes(newArr);

          // Let the parent know
          if (typeof onChange === 'function') {
            onChange(newArr);
          }
        })
      );

    circleSel.exit().remove();

    // If desired, add a vertical line for the current playback time
    if (timeIndicator >= 0 && timeIndicator <= effectiveMaxTime) {
      svg.append('line')
        .attr('x1', xz(timeIndicator))
        .attr('x2', xz(timeIndicator))
        .attr('y1', margin.top)
        .attr('y2', svgHeight - margin.bottom)
        .attr('stroke', 'red')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    }

    // Zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.5, 10])  // min and max zoom factors
      .translateExtent([[0, 0], [svgWidth, svgHeight]]) // limit panning area
      .on('zoom', (event) => {
        setZoomTransform(event.transform);
      });

    svg.call(zoomBehavior)
      .on('dblclick.zoom', null); // disable double-click to reset if desired

  }, [
    keyframes,
    zoomTransform,
    effectiveMaxTime,
    timeIndicator,
    onChange,
    onImmediateVisemeChange,
    viseme,
    width,
    height
  ]);

  return (
    <Box>
      <Text fontSize="sm" mb={1}>
        {viseme} - {name}
        {notes ? ` (${notes})` : ''}
      </Text>

      <svg
        ref={svgRef}
        style={{ border: '1px solid lightgray', width: '100%', height: 'auto' }}
      />
    </Box>
  );
}