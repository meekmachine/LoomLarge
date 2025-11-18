"""
Blender Script: Fix Shoulder Clipping
This script adds a Solidify modifier to the shirt to prevent shoulders from clipping through.

Instructions:
1. Open your character file in Blender
2. Go to "Scripting" workspace (top tab)
3. Open this script or paste it into a new text block
4. Click "Run Script" button
5. Re-export as GLB
"""

import bpy

def fix_shoulder_clipping():
    """Add Solidify modifier to shirt to prevent shoulder clipping"""

    # Configuration
    SHIRT_MESH_NAME = "Plaid_Punk_Shirt"
    SOLIDIFY_THICKNESS = 0.01  # Adjust if needed (0.005 to 0.02)

    print("=" * 50)
    print("Starting Shoulder Clipping Fix...")
    print("=" * 50)

    # Find the shirt mesh
    shirt_mesh = bpy.data.objects.get(SHIRT_MESH_NAME)

    if not shirt_mesh:
        print(f"❌ ERROR: Could not find shirt mesh '{SHIRT_MESH_NAME}'")
        print("Available objects:", [obj.name for obj in bpy.data.objects if obj.type == 'MESH'])
        return False

    print(f"✓ Found shirt mesh: {SHIRT_MESH_NAME}")

    # Select the shirt mesh
    bpy.ops.object.select_all(action='DESELECT')
    shirt_mesh.select_set(True)
    bpy.context.view_layer.objects.active = shirt_mesh

    # Check if Solidify modifier already exists
    has_solidify = False
    for mod in shirt_mesh.modifiers:
        if mod.type == 'SOLIDIFY':
            has_solidify = True
            print(f"✓ Solidify modifier already exists on {SHIRT_MESH_NAME}")
            mod.thickness = SOLIDIFY_THICKNESS
            mod.offset = 1.0
            print(f"✓ Updated thickness to {SOLIDIFY_THICKNESS}")
            break

    if not has_solidify:
        # Add Solidify modifier
        solidify_mod = shirt_mesh.modifiers.new(name="Solidify", type='SOLIDIFY')
        solidify_mod.thickness = SOLIDIFY_THICKNESS
        solidify_mod.offset = 1.0  # Push outward
        solidify_mod.use_even_offset = True
        solidify_mod.use_quality_normals = True

        print(f"✓ Added Solidify modifier with thickness {SOLIDIFY_THICKNESS}")

        # Move Solidify modifier to be before Armature modifier (if it exists)
        # This ensures proper deformation order
        armature_index = -1
        for i, mod in enumerate(shirt_mesh.modifiers):
            if mod.type == 'ARMATURE':
                armature_index = i
                break

        if armature_index > 0:
            # Move Solidify to before Armature
            solidify_index = len(shirt_mesh.modifiers) - 1
            while solidify_index > armature_index:
                bpy.ops.object.modifier_move_up(modifier="Solidify")
                solidify_index -= 1
            print("✓ Moved Solidify modifier before Armature modifier")

    print("=" * 50)
    print("✅ Shoulder Clipping Fix Complete!")
    print("=" * 50)
    print("\nNext Steps:")
    print("1. Check the shoulders in the viewport - they should no longer clip")
    print("2. If still clipping, increase SOLIDIFY_THICKNESS in the script and run again")
    print("3. Export as GLB when satisfied")
    print(f"\nCurrent thickness: {SOLIDIFY_THICKNESS}")
    print("Suggested range: 0.005 (thin) to 0.02 (thick)")

    return True

# Run the fix
if __name__ == "__main__":
    fix_shoulder_clipping()
