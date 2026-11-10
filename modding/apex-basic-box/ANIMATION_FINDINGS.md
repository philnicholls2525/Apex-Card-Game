# Opening-animation findings from the supplied Unity game assembly

The actual `Assembly-CSharp.dll` contains the field names `m_OpenCardBoxMesh`, `m_OpenCardBoxInnerMesh`, `m_OpenCardBoxMeshFilter`, `m_OpenCardBoxSpawnCardPackPosList`, and `m_IsOpeningCardBox`. It also contains `OnPressOpenBox`, `CanOpenCardBox`, and `CardBoxToCardPack`.

These are promising **real identifiers** for locating the separate box-opening mesh. Their declaring types and runtime instances have not yet been verified. Do not infer a safe override from string names alone.

The known-working v0.1.0 plugin specifically filters renderers whose parent Item has `m_ItemType == BasicCardBox`, whose shader is `Unlit/UnlitWithShadowcasterTexture2dArray`, whose `_MainTexArray` is named `CardBox`, and whose `_TexIndex` is 0. The animation renderer may not have an Item parent. Its current `RestoreIneligible` logic also restores overrides when the Item parent disappears.

Next safe diagnostic: inspect the runtime components containing `m_OpenCardBoxMesh` / `m_OpenCardBoxInnerMesh`, read their renderer materials and `_TexIndex`, and identify a Basic-box state before applying the existing plain-texture material. Keep original v0.1.0 unchanged until the new path is confirmed.
