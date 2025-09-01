

import { Select, Box } from "@chakra-ui/react";
import { useState } from "react";

type SceneSelectorProps = {
  scenes?: string[];
  onSelect: (scene: string) => void;
};

export default function SceneSelector({ 
  scenes = ["Default Avatar", "Alt Avatar 1", "Alt Avatar 2"], 
  onSelect 
}: SceneSelectorProps) {
  const [selected, setSelected] = useState(scenes[0]);

  return (
    <Box position="absolute" bottom="1rem" left="1rem" zIndex={10}>
      <Select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          onSelect(e.target.value);
        }}
        bg="rgba(0,0,0,0.6)"
        color="white"
        w="200px"
      >
        {scenes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
    </Box>
  );
}