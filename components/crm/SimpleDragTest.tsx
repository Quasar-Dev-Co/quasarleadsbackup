"use client";

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  useDraggable
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";

// Simple draggable item
const DraggableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-4 bg-blue-100 border rounded cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
};

// Simple droppable area
const DroppableArea = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`p-6 border-2 border-dashed rounded min-h-[100px] ${
        isOver ? 'border-green-500 bg-green-50' : 'border-gray-300'
      }`}
    >
      {children}
    </div>
  );
};

const SimpleDragTest = () => {
  const [items, setItems] = useState({
    container1: ['item1', 'item2'],
    container2: ['item3']
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Simple drag test:', { active: active.id, over: over?.id });

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which container has the active item
    let sourceContainer: string | null = null;
    for (const [containerId, itemList] of Object.entries(items)) {
      if (itemList.includes(activeId)) {
        sourceContainer = containerId;
        break;
      }
    }

    if (!sourceContainer) return;

    // Only handle drops on containers
    if (overId === 'container1' || overId === 'container2') {
      if (sourceContainer !== overId) {
        setItems(prev => ({
          ...prev,
          [sourceContainer!]: prev[sourceContainer! as keyof typeof prev].filter(id => id !== activeId),
          [overId]: [...prev[overId as keyof typeof prev], activeId]
        }));
        console.log('Item moved from', sourceContainer, 'to', overId);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">Drag & Drop Test</h2>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 font-semibold">Container 1</h3>
            <DroppableArea id="container1">
              <div className="space-y-2">
                {items.container1.map(item => (
                  <DraggableItem key={item} id={item}>
                    {item}
                  </DraggableItem>
                ))}
                {items.container1.length === 0 && (
                  <p className="text-gray-500">Drop items here</p>
                )}
              </div>
            </DroppableArea>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Container 2</h3>
            <DroppableArea id="container2">
              <div className="space-y-2">
                {items.container2.map(item => (
                  <DraggableItem key={item} id={item}>
                    {item}
                  </DraggableItem>
                ))}
                {items.container2.length === 0 && (
                  <p className="text-gray-500">Drop items here</p>
                )}
              </div>
            </DroppableArea>
          </div>
        </div>
      </DndContext>

      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Try dragging items between containers. Check console for debug info.
        </p>
      </div>
    </div>
  );
};

export default SimpleDragTest; 