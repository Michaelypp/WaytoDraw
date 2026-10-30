Way to Draw

Open Way to Draw

Way to Draw is a browser drawing app with an animated art gallery background. Draw with markers, place stickers, create your own sticker tools, and export your artwork as a larger PNG.

How to use

Thin marker / Thick marker: Select a marker and drag on the canvas.

Brush color: Choose a color before drawing. Existing strokes keep their saved colors.

Eraser: Drag to cover parts of the drawing with white. Each completed eraser gesture is one undoable action.

Preset stickers: Select a sticker, then click the canvas to place it.

Create sticker: Enter a name and an emoji or short text of up to 12 Unicode code points. Select the new tool from the palette to place it. You can create and reuse multiple sticker tools during one session. Cancelling either prompt or submitting blank input does not add a tool.

Undo / Redo: Step backward or forward through completed drawing actions. Drawing a new mark after Undo removes the abandoned redo branch. Creating or selecting tools does not remove that branch.

Clear: Clears only the displayed pixels. It does not delete the drawing or change history. Click Redraw to restore the saved drawing. Other actions that redraw the document will also restore it.

Redraw: Clears the surface and reconstructs the current drawing from its recorded commands.

Pause background / Resume background: Stop or restart the moving gallery images.

Release the pointer to finish a gesture. Pointer capture lets a release outside the canvas finish the gesture. Press Escape to cancel an unfinished gesture. Pointer cancellation or losing window focus also discards an unfinished gesture.

Artwork, history, and custom sticker tools are stored in memory. Reloading or closing the page loses them. Export your artwork before leaving.

Export your artwork

Click Export PNG to download way-to-draw.png.

The interactive canvas has an 800 × 500 backing resolution. Export creates a separate 1600 × 1000 canvas and replays the current committed drawing commands at twice the scale.

The PNG has a white background. It includes active strokes, eraser marks, and preset or custom stickers in drawing order. Undone content and unfinished gestures are excluded. The animated gallery, wooden frame, and interface controls are not included.

Export does not change the selected tool or drawing history. You can keep drawing, undoing, and redoing afterward
Developer guide: adding a rectangle tool

A rectangle tool is not currently implemented. The following change map explains how to add one without creating separate history or export implementations.

The application code is in src/main.ts. The relevant symbols and responsibilities are listed below.

1. Define and register the tool

Extend the Tool union with a rectangle variant containing its name, identifier, color, and line width.

Add a rectangle definition to the tools array. renderPalette() already generates buttons from that array, so the rectangle can use the existing palette and selection path.

If rectangle color should follow the color picker, extend the pointerdown tool snapshot logic. It currently applies the picker value only to markers.

2. Handle its gesture

Update the canvas pointerdown, pointermove, and pointerup handlers to use the first point as one corner and the current point as the opposite corner.

documentPoint() already converts pointer positions into document coordinates. The current non-sticker movement path collects points; a rectangle only needs its starting and current corners.

Keep the rectangle in gesture while dragging. redraw() can display it as an unfinished preview. Commit it through history.commit() only on pointer release, making the entire rectangle one action.

Keep using cancelGesture() and releaseGesture() so Escape, cancellation, and pointer capture behave consistently with other tools.

3. Record rectangle data

Add a RectangleCommand implementing DrawingCommand.

Store the rectangle geometry, color, and line width in the command itself. Normalize its corners so dragging in any direction produces the intended bounds. Saved rectangles must not depend on later tool selections or color changes.

Extend commandForGesture() to create this command for rectangle gestures. Leave its stroke, eraser, and sticker paths available for their existing tool kinds.

4. Draw through the shared interface

Implement RectangleCommand.draw(target) using the supplied CanvasRenderingContext2D.

Use target.save() and target.restore() around its styles and drawing operations, just as the existing StrokeCommand and StickerCommand do. Do not capture the interactive canvas context.

renderDocument() already calls draw(target) on each active command in order. It can render rectangles without a new rectangle-specific loop.

5. Reuse history and export

DrawingHistory stores DrawingCommand objects without depending on their content kind. A committed rectangle therefore uses the existing Undo, Redo, and abandoned-branch handling.

The PNG export handler creates a separate context, scales it, and calls the same renderDocument() operation. A rectangle implemented through draw(target) automatically participates in export.

Check reverse-direction drags, cancellation, mixed stacking order, multiple undo/redo steps, and export with a rectangle undone. No separate rectangle history or export renderer should be necessary.

## Credits

Tooling adapted from the [CMPM 121 Fall 2026 D1 starter](https://github.com/ucsc-cmpm-121-f26/d1-starter/tree/d949e744b0f9fb7c133a5316f86f2b7fe54529ad), derived from the [S01 starter](https://github.com/ucsc-cmpm-121-f26/s01-starter/tree/8974888efb6537be82e8eb069db139ea885039da). Those repositories have no explicit repository license; no new license is assigned to that material. The D2 scaffold was authored with OpenCode/OpenAI GPT-6.1 Sol assistance. Dependencies retain their respective licenses.
