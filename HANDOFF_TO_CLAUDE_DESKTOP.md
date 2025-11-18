# Handoff Document for Claude Desktop

**Date:** 2025-11-17
**Project:** LoomLarge Character Animation
**Issue:** Shoulder clipping through shirt during animations

---

## Current Problem

The character's shoulders are clipping through the "Plaid_Punk_Shirt" mesh during animations. A Blender script has been created to fix this using a Solidify modifier, but visual verification and iteration is needed.

---

## Project Context

### Repository Location
`/Users/jonathan/Novembre/LoomLarge`

### Character File
- **New character model:** `public/characters/jonathan_new.glb`
- **Shirt mesh name:** `Plaid_Punk_Shirt`

### Technology Stack
- **3D Software:** Blender (for character editing)
- **Runtime:** Three.js (React app)
- **Animation System:** Custom eye/head tracking with Action Units (AUs)
- **Export Format:** GLB

---

## Recent Work Done

### 1. Created Blender Fix Script
**File:** `blender_fix_shoulder_clipping.py` (in project root)

**What it does:**
- Adds a Solidify modifier to the shirt mesh
- Sets thickness to 0.01 (configurable: range 0.005-0.02)
- Positions modifier before Armature modifier for proper deformation order
- Pushes shirt outward to prevent clipping

**Status:** Script created but not yet tested in Blender

### 2. Other Blender Scripts Available
- `blender_fix_shoulders_properly.py` - Alternative approach
- `blender_push_shirt_outward.py` - Another approach
- `blender_hair_physics_setup.py` - Hair physics setup

---

## What Needs to Happen Next

### Step 1: Open Character in Blender
1. Launch Blender
2. Open file: `public/characters/jonathan_new.glb`
3. Verify the "Plaid_Punk_Shirt" mesh exists

### Step 2: Run the Fix Script
1. Go to "Scripting" workspace (top tab in Blender)
2. Click "Open" and select `blender_fix_shoulder_clipping.py`
3. Click "Run Script" button
4. Check console output for success/errors

### Step 3: Visual Verification
**This is where Claude Desktop with screen access is crucial:**

1. **Static Check:**
   - Select the Armature
   - Look at shoulders in viewport
   - Verify shirt isn't clipping through

2. **Animation Check:**
   - Play any animations (especially shoulder/arm movements)
   - Watch for clipping during motion
   - Check multiple angles

3. **Modifier Settings:**
   - Select "Plaid_Punk_Shirt" mesh
   - Go to Modifier Properties panel
   - Verify Solidify modifier exists and is positioned correctly

### Step 4: Iteration (if needed)
If shoulders still clip:
- Adjust `SOLIDIFY_THICKNESS` in the script (line 20)
- Try values: 0.005 (thinner) to 0.02 (thicker)
- Re-run script
- Re-check visually

### Step 5: Export
Once clipping is fixed:
1. File > Export > glTF 2.0 (.glb/.gltf)
2. Export as GLB
3. Save to: `public/characters/jonathan_new.glb` (overwrite existing)
4. Ensure export settings preserve:
   - Armature
   - Animations
   - Modifiers
   - Materials

### Step 6: Test in App
1. Run the React app: `npm run dev`
2. Load the character
3. Test animations
4. Verify no clipping in real-time

---

## Technical Details

### Solidify Modifier Configuration
```python
thickness = 0.01  # Current setting
offset = 1.0      # Pushes outward
use_even_offset = True
use_quality_normals = True
```

### Modifier Order (Important!)
```
Solidify    ← Should be BEFORE Armature
Armature    ← Bone deformations
[Others]
```

This order ensures the shirt is thickened BEFORE bone deformations are applied.

---

## Current Git Status

### Modified Files:
- `src/App.tsx`
- `src/components/au/EyeHeadTrackingSection.tsx`
- `src/context/threeContext.tsx`
- `src/engine/README.md`
- `src/latticework/eyeHeadTracking/ANIMATION_APPROACH.md`
- `src/latticework/eyeHeadTracking/README.md`
- `src/latticework/eyeHeadTracking/types.ts`

### Untracked Files (New):
- `blender_fix_shoulder_clipping.py` ⭐ Main fix script
- `blender_fix_shoulders_properly.py`
- `blender_push_shirt_outward.py`
- `blender_hair_physics_setup.py`
- `public/characters/jonathan_new.glb` ⭐ Character file to edit
- `src/latticework/eyeHeadTracking/eyeHeadTrackingScheduler_v2_ANIMATION_APPROACH.ts`
- Other documentation files

---

## Recent Commits (Context)

```
2e34ce7 - Document position preservation when switching eye/head tracking modes
fe794ca - Implement automatic animation continuity and additive blending
e92981d - Update readme
0999e3c - Add virtual continuum AU proof of concept
d556cd1 - Revert eye/head tracking to working version
```

The project is actively being developed with focus on animation systems and character quality.

---

## Questions to Resolve

1. **Does the Solidify modifier fix the clipping?**
   - If yes: Export and test in app
   - If no: What thickness value works?

2. **Are there other clipping issues visible?**
   - Hair clipping?
   - Other clothing parts?

3. **Do animations play correctly with the modifier?**
   - Check shoulder rotation animations
   - Check head tracking animations

4. **Export settings correct?**
   - Does GLB preserve all modifiers?
   - Do materials export properly?

---

## Success Criteria

✅ Solidify modifier successfully added to shirt
✅ Shoulders don't clip through shirt in rest pose
✅ Shoulders don't clip during animations
✅ Character exports as GLB with all modifiers intact
✅ Character loads and animates correctly in React app
✅ No performance degradation from modifier

---

## Additional Notes

### Why Solidify Modifier?
- Adds thickness to single-sided mesh (shirt)
- More realistic than just scaling
- Works with armature deformations
- Minimal performance impact

### Alternative Approaches (if Solidify doesn't work)
1. **Vertex Weight Painting:** Paint shoulder areas to push vertices outward
2. **Mesh Editing:** Manually edit shirt vertices around shoulders
3. **Collision Modifier:** Add collision detection (heavier performance cost)
4. **Shrinkwrap Modifier:** Make shirt follow body with offset

### Blender Version
Ensure using a recent version of Blender (3.x or 4.x) for best GLB export compatibility.

---

## Contact Points

If the fix works:
- Document the final thickness value used
- Commit the working GLB to git
- Update this document with results

If the fix doesn't work:
- Try alternative scripts in project root
- Document what didn't work
- May need to manually edit mesh in Blender

---

## Quick Start for Claude Desktop

1. Open Blender
2. Load `public/characters/jonathan_new.glb`
3. Run `blender_fix_shoulder_clipping.py`
4. Visually verify in viewport
5. Export GLB
6. Test in app

**Primary Goal:** Fix shoulder clipping so character looks good during animations.

---

*Generated by Claude Code on 2025-11-17*
