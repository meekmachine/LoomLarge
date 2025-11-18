"""
Blender Script: Fix Shoulder Clipping by Shrinking Body Shoulders
This script actually fixes the shoulder clipping by scaling down the shoulder vertices on the body mesh.

Instructions:
1. Open your character file in Blender
2. Go to "Scripting" workspace (top tab)
3. Open this script or paste it into a new text block
4. Click "Run Script" button
5. Re-export as GLB
"""

import bpy
import math

def fix_shoulders_properly():
    """Shrink the body shoulder vertices to prevent clipping through shirt"""

    # Configuration
    BODY_MESH_NAME = "CC_Base_Body"
    SHOULDER_SCALE = 0.95  # Scale shoulders to 95% (shrink by 5%)

    print("=" * 50)
    print("Starting REAL Shoulder Fix...")
    print("=" * 50)

    # Find the body mesh
    body_mesh = bpy.data.objects.get(BODY_MESH_NAME)

    if not body_mesh:
        print(f"❌ ERROR: Could not find body mesh '{BODY_MESH_NAME}'")
        print("Available objects:", [obj.name for obj in bpy.data.objects if obj.type == 'MESH'])
        return False

    print(f"✓ Found body mesh: {BODY_MESH_NAME}")

    # Select the body mesh
    bpy.ops.object.select_all(action='DESELECT')
    body_mesh.select_set(True)
    bpy.context.view_layer.objects.active = body_mesh

    # Enter edit mode
    bpy.ops.object.mode_set(mode='EDIT')

    # Deselect all
    bpy.ops.mesh.select_all(action='DESELECT')

    # Switch to object mode to access vertex data
    bpy.ops.object.mode_set(mode='OBJECT')

    mesh_data = body_mesh.data
    vertices = mesh_data.vertices

    print(f"✓ Body mesh has {len(vertices)} vertices")

    # Find shoulder vertices (upper torso area, X distance from center)
    # Shoulders are typically Z > 4.5 and |X| > 0.3
    shoulder_verts = []

    for v in vertices:
        x, y, z = v.co
        # Shoulder detection: upper body (high Z), away from center (high |X|)
        if z > 4.5 and abs(x) > 0.3 and abs(x) < 0.8 and y > -0.5:
            shoulder_verts.append(v.index)

    print(f"✓ Found {len(shoulder_verts)} shoulder vertices")

    if len(shoulder_verts) == 0:
        print("⚠️  No shoulder vertices found - check detection criteria")
        return False

    # Enter edit mode to scale
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')

    # Switch back to object mode to select vertices
    bpy.ops.object.mode_set(mode='OBJECT')

    # Select shoulder vertices
    for v_idx in shoulder_verts:
        vertices[v_idx].select = True

    # Enter edit mode for scaling
    bpy.ops.object.mode_set(mode='EDIT')

    # Scale selected vertices inward (toward torso center)
    # Use cursor as pivot for better control
    saved_pivot = bpy.context.scene.tool_settings.transform_pivot_point
    bpy.context.scene.tool_settings.transform_pivot_point = 'MEDIAN_POINT'

    # Scale on X and Y axis (shrink shoulders horizontally)
    bpy.ops.transform.resize(
        value=(SHOULDER_SCALE, 1.0, 1.0),
        orient_type='GLOBAL',
        constraint_axis=(True, False, False)
    )

    print(f"✓ Scaled shoulder vertices to {SHOULDER_SCALE * 100}% on X-axis")

    # Restore pivot point
    bpy.context.scene.tool_settings.transform_pivot_point = saved_pivot

    # Return to object mode
    bpy.ops.object.mode_set(mode='OBJECT')

    print("=" * 50)
    print("✅ Shoulder Fix Complete!")
    print("=" * 50)
    print("\nNext Steps:")
    print("1. Check the shoulders - skin should no longer poke through")
    print("2. If still visible, run script again (will shrink more)")
    print("3. Re-export as GLB")
    print(f"\nCurrent shoulder scale: {SHOULDER_SCALE * 100}%")

    return True

# Run the fix
if __name__ == "__main__":
    fix_shoulders_properly()
