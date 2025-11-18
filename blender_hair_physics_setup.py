"""
Blender Script: Hair Cloth Physics Setup
This script sets up cloth physics on the hair mesh for realistic wind movement.

Instructions:
1. Open your character file in Blender
2. Go to "Scripting" workspace (top tab)
3. Click "Open" and select this script (or paste it into a new text block)
4. Click "Run Script" button
5. Adjust settings in Physics Properties if needed
6. Play animation to see hair movement
"""

import bpy

def setup_hair_physics():
    """Set up cloth physics on hair mesh with wind effect"""

    # Configuration
    HAIR_MESH_NAME = "Hair1_Transparency"  # Your hair mesh name
    PIN_GROUP_NAME = "HairPin"
    WIND_STRENGTH = 2.0  # Adjust for stronger/weaker wind

    print("=" * 50)
    print("Starting Hair Physics Setup...")
    print("=" * 50)

    # Find the hair mesh
    hair_mesh = bpy.data.objects.get(HAIR_MESH_NAME)

    if not hair_mesh:
        print(f"❌ ERROR: Could not find hair mesh '{HAIR_MESH_NAME}'")
        print("Available objects:", [obj.name for obj in bpy.data.objects if obj.type == 'MESH'])
        return False

    print(f"✓ Found hair mesh: {HAIR_MESH_NAME}")

    # Select the hair mesh
    bpy.ops.object.select_all(action='DESELECT')
    hair_mesh.select_set(True)
    bpy.context.view_layer.objects.active = hair_mesh

    # Add Cloth Physics modifier
    if 'CLOTH' not in [mod.type for mod in hair_mesh.modifiers]:
        bpy.ops.object.modifier_add(type='CLOTH')
        print("✓ Added Cloth modifier")
    else:
        print("✓ Cloth modifier already exists")

    # Get the cloth modifier
    cloth_mod = None
    for mod in hair_mesh.modifiers:
        if mod.type == 'CLOTH':
            cloth_mod = mod
            break

    if cloth_mod:
        # Configure cloth settings
        cloth_settings = cloth_mod.settings

        # Physical properties for hair
        cloth_settings.quality = 5  # Simulation steps (higher = more accurate but slower)
        cloth_settings.mass = 0.15  # Light hair
        cloth_settings.air_damping = 1.0  # Air resistance

        # Stiffness settings (makes hair not too floppy)
        cloth_settings.tension_stiffness = 15.0
        cloth_settings.compression_stiffness = 15.0
        cloth_settings.shear_stiffness = 15.0
        cloth_settings.bending_stiffness = 5.0

        # Damping (reduces oscillation)
        cloth_settings.tension_damping = 5.0
        cloth_settings.compression_damping = 5.0
        cloth_settings.shear_damping = 5.0
        cloth_settings.bending_damping = 5.0

        print("✓ Configured cloth settings for hair-like behavior")

        # Create vertex group for pinning hair roots
        # This keeps the hair attached to the head
        if PIN_GROUP_NAME not in hair_mesh.vertex_groups:
            pin_group = hair_mesh.vertex_groups.new(name=PIN_GROUP_NAME)

            # Enter edit mode to select vertices
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='DESELECT')
            bpy.ops.object.mode_set(mode='OBJECT')

            # Pin vertices near the scalp (top 20% of hair by Z position)
            # This is a simple heuristic - adjust if needed
            mesh_data = hair_mesh.data
            vertices = mesh_data.vertices

            if len(vertices) > 0:
                # Find Z range
                z_coords = [v.co.z for v in vertices]
                z_min = min(z_coords)
                z_max = max(z_coords)
                z_range = z_max - z_min
                pin_threshold = z_max - (z_range * 0.2)  # Top 20%

                # Assign weights (1.0 = fully pinned, 0.0 = free to move)
                for v in vertices:
                    if v.co.z > pin_threshold:
                        weight = 1.0
                        pin_group.add([v.index], weight, 'REPLACE')

                print(f"✓ Created pin group '{PIN_GROUP_NAME}' for hair roots")

        # Set the pin group in cloth settings
        cloth_settings.vertex_group_mass = PIN_GROUP_NAME
        print(f"✓ Set pin group to '{PIN_GROUP_NAME}'")

    # Add Wind force field
    wind_name = "Hair_Wind"
    wind = bpy.data.objects.get(wind_name)

    if not wind:
        bpy.ops.object.effector_add(type='WIND', location=(0, 0, 2))
        wind = bpy.context.active_object
        wind.name = wind_name
        print(f"✓ Created wind force field: {wind_name}")
    else:
        print(f"✓ Wind force field already exists: {wind_name}")

    # Configure wind settings
    if wind:
        wind.field.strength = WIND_STRENGTH
        wind.field.flow = 0.5  # Air flow variation
        wind.field.noise = 1.0  # Turbulence
        wind.rotation_euler = (0, 1.5708, 0)  # Point sideways (adjust as needed)
        print(f"✓ Configured wind (strength: {WIND_STRENGTH})")

    # Add Collision modifier to body parts (so hair doesn't pass through them)
    body_parts = ["CC_Base_Body", "Plaid_Punk_Shirt", "Jeans"]
    for part_name in body_parts:
        body_part = bpy.data.objects.get(part_name)
        if body_part:
            if 'COLLISION' not in [mod.type for mod in body_part.modifiers]:
                bpy.ops.object.select_all(action='DESELECT')
                body_part.select_set(True)
                bpy.context.view_layer.objects.active = body_part
                bpy.ops.object.modifier_add(type='COLLISION')
                print(f"✓ Added collision to: {part_name}")

    # Set timeline for simulation (adjust as needed)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 250
    bpy.context.scene.frame_current = 1

    print("=" * 50)
    print("✅ Hair Physics Setup Complete!")
    print("=" * 50)
    print("\nNext Steps:")
    print("1. Press SPACEBAR to play animation and see hair movement")
    print("2. Adjust wind strength in Wind object properties if needed")
    print("3. Fine-tune cloth settings in Physics Properties panel")
    print("4. When satisfied, bake the simulation:")
    print("   - Select hair mesh")
    print("   - Physics Properties > Cloth > Cache > Bake")
    print("5. Export as GLB with animation")
    print("\nTip: Hair roots are pinned - only the hair tips should move!")

    return True

# Run the setup
if __name__ == "__main__":
    setup_hair_physics()
