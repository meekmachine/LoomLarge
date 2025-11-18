"""
Blender Script: Push Shirt Outward to Fix Shoulder Clipping
This script pushes the shirt mesh outward along vertex normals to create clearance from the body.

Instructions:
1. Import your FBX into Blender
2. Go to "Scripting" workspace
3. Run this script
4. Export as GLB
"""

import bpy

def push_shirt_outward():
    """Push shirt vertices outward along their normals to prevent clipping"""

    # Configuration
    SHIRT_MESH_NAME = "Plaid_Punk_Shirt"
    PUSH_DISTANCE = 0.002  # Push outward by 2mm (adjust if needed: 0.001 to 0.005)

    print("=" * 50)
    print("Pushing Shirt Outward to Fix Clipping...")
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

    # Enter edit mode
    bpy.ops.object.mode_set(mode='EDIT')

    # Select all vertices
    bpy.ops.mesh.select_all(action='SELECT')

    # Push vertices along their normals (outward)
    # This creates uniform clearance from the body
    bpy.ops.transform.shrink_fatten(
        value=PUSH_DISTANCE,
        use_even_offset=True
    )

    print(f"✓ Pushed shirt outward by {PUSH_DISTANCE}m along normals")

    # Return to object mode
    bpy.ops.object.mode_set(mode='OBJECT')

    print("=" * 50)
    print("✅ Shirt Push Complete!")
    print("=" * 50)
    print("\nNext Steps:")
    print("1. Check shoulders - they should no longer clip")
    print("2. If still clipping, increase PUSH_DISTANCE in script and run again")
    print("3. If shirt looks too puffy, decrease PUSH_DISTANCE")
    print("4. Export as GLB when satisfied")
    print(f"\nCurrent push distance: {PUSH_DISTANCE}m")
    print("Suggested range: 0.001 (subtle) to 0.005 (safe)")

    return True

# Run the fix
if __name__ == "__main__":
    push_shirt_outward()
