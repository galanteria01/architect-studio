/** MIME key used when dragging a component from the library onto the canvas. */
export const DRAG_MIME = "application/architect-component";

export function setDragComponent(event: React.DragEvent, componentType: string) {
  event.dataTransfer.setData(DRAG_MIME, componentType);
  event.dataTransfer.effectAllowed = "move";
}
