# APEX Basic Box — opening animation experiment

This branch is isolated from `main` and does not change the live APEX Card Game.

## Verified baseline
- `APEX_Basic_Box_Test_0.1.0` renders APEX artwork on shop and held BasicCardBox objects.
- Its plugin replaces the `Unlit/UnlitWithShadowcasterTexture2dArray` material (CardBox array, layer 0) with a normal `Unlit/UnlitWithShadowcaster` material using a 1024×1024 RGBA texture.
- Its `ItemType(renderer) == "BasicCardBox"` guard excludes the separate opening-animation renderer.
- The animation object's exact hierarchy/name and Basic-box discriminator have **not** been verified in the files currently available.
- Blindly applying the material to all CardBox layer-0 renderers would risk changing unrelated products.

## Next implementation
1. Preserve the working renderer override code and the 1024×1024 RGBA artwork.
2. Add **read-only, rate-limited logging** for active renderers with `CardBox` array shader and layer 0 but without a `BasicCardBox` parent, especially when a Basic box opens.
3. Record renderer path, parents, material names, shader, texture properties, and any opening-animation controller fields. Do not allocate/copy GPU texture arrays.
4. Use the runtime evidence to identify the animation mesh and the specific Basic-box condition; only then apply the same material override to that mesh, with a reliable restore path for pooled objects.
5. Compile and test on Highball. Keep v0.1.0 as a rollback.

## Important
The actual DLL and raw artwork are not committed to this public branch. The source bundle supplied in chat is the working baseline. GitHub Actions cannot yet compile the exact plugin until the correct BepInEx and Unity 6000 references are made available to the build in a safe, reproducible way.
