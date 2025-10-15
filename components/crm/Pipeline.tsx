'use client';

import { useState } from "react";
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
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Mail, Phone, Tag, Star } from "lucide-react";

// --- Types ---
export type PipelineStage = 
  | "new_leads" 
  | "called_once" 
  | "called_twice" 
  | "called_three_times" 
  | "called_four_times"
  | "called_five_times"
  | "called_six_times"
  | "called_seven_times"
  | "meeting" 
  | "deal";

export interface Activity {
  id: string;
  type: string;
  date: string;
  notes: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  source: string;
  stage: PipelineStage;
  tags: string[];
  activities: Activity[];
  notes: string;
  created_at: string;
  updated_at: string;
  googleAds?: boolean;
  organicRanking?: number;
}

interface PipelineProps {
  leads: Lead[];
  onLeadSelect: (lead: Lead) => void;
  onStageChange: (leadId: string, newStage: PipelineStage) => void;
}

// --- Helpers ---
const getLatestActivity = (lead: Lead): string => {
  if (!lead.activities.length) return "No activities";
  const latestActivity = lead.activities.reduce((latest, current) =>
    new Date(current.date) > new Date(latest.date) ? current : latest
  );
  return new Date(latestActivity.date).toLocaleDateString();
};

const getSourceBadgeColor = (source: string): string => {
  switch (source) {
    case "linkedin": return "bg-blue-100 text-blue-800 border-blue-200";
    case "website": return "bg-green-100 text-green-800 border-green-200";
    case "referral": return "bg-purple-100 text-purple-800 border-purple-200";
    case "cold_email": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "event": return "bg-orange-100 text-orange-800 border-orange-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// --- Pipeline stages ---
const PIPELINE_STAGES: { id: PipelineStage; title: string }[] = [
  { id: "new_leads", title: "New Leads" },
  { id: "called_once", title: "Called Once" },
  { id: "called_twice", title: "Called Twice" },
  { id: "called_three_times", title: "Called Three Times" },
  { id: "called_four_times", title: "Called Four Times" },
  { id: "called_five_times", title: "Called Five Times" },
  { id: "called_six_times", title: "Called Six Times" },
  { id: "called_seven_times", title: "Called Seven Times" },
  { id: "meeting", title: "Meeting" },
  { id: "deal", title: "Deal" }
];

// --- DraggableItem (simplified) ---
interface DraggableItemProps {
  id: string;
  lead: Lead;
  onLeadSelect: (lead: Lead) => void;
}

const DraggableItem = ({ id, lead, onLeadSelect }: DraggableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1
  };

  // High-Value Badge Component
  const HighValueBadge = () => {
    if (!lead.googleAds) return null;
    
    const isHighValue = !lead.organicRanking || lead.organicRanking > 10;
    
    if (!isHighValue) return null;
    
    return (
      <div className="inline-flex items-center gap-1 px-1 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-medium rounded-full">
        <Star className="w-2 h-2 fill-current" />
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border rounded-md p-3 bg-background hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      onClick={(e) => {
        e.stopPropagation();
        onLeadSelect(lead);
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{lead.name}</h4>
            <HighValueBadge />
          </div>
          <p className="text-sm text-muted-foreground">{lead.company}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs", getSourceBadgeColor(lead.source))}>
          {lead.source.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div className="flex items-center">
          <Mail className="h-3 w-3 mr-1" /><span className="truncate">{lead.email}</span>
        </div>
        <div className="flex items-center">
          <Phone className="h-3 w-3 mr-1" /><span>{lead.phone}</span>
        </div>
        <div className="flex items-center">
          <Calendar className="h-3 w-3 mr-1" /><span>{getLatestActivity(lead)}</span>
        </div>
        <div className="flex items-center">
          <Tag className="h-3 w-3 mr-1" />
          <span className="truncate">{lead.tags.slice(0, 2).join(', ')}{lead.tags.length > 2 && '...'}</span>
        </div>
      </div>
    </div>
  );
};

// --- DroppableStage ---
interface DroppableStageProps {
  id: PipelineStage;
  title: string;
  leads: Lead[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLeadSelect: (lead: Lead) => void;
}

const DroppableStage = ({
  id,
  title,
  leads,
  isExpanded,
  onToggleExpand,
  onLeadSelect
}: DroppableStageProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card key={id} className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            {title}
            <Badge variant="secondary" className="ml-2 bg-secondary/60">
              {leads.length || 0}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggleExpand}>
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div 
            ref={setNodeRef}
            className={cn(
              "space-y-2 min-h-[150px] p-2 border-2 border-dashed rounded-md transition-colors",
              isOver ? "border-blue-500 bg-blue-50" : "border-gray-200"
            )}
          >
            {leads.length > 0 ? (
              <div className="space-y-2">
                {leads.map(lead => (
                  <DraggableItem key={lead.id} id={lead.id} lead={lead} onLeadSelect={onLeadSelect} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px]">
                <p className="text-sm text-muted-foreground">
                  Drop leads here or click "Expand" to see leads
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// --- Main Pipeline ---
const Pipeline = ({ leads, onLeadSelect, onStageChange }: PipelineProps) => {
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    PIPELINE_STAGES.reduce((acc, stage) => ({ ...acc, [stage.id]: true }), {})
  );

  console.log('Pipeline rendered with', leads.length, 'leads');
  console.log('Expanded stages:', expandedStages);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const leadsByStage = PIPELINE_STAGES.reduce<Record<PipelineStage, Lead[]>>((acc, stage) => {
    acc[stage.id] = leads.filter(lead => lead.stage === stage.id);
    return acc;
  }, {} as Record<PipelineStage, Lead[]>);

  console.log('Leads by stage:', leadsByStage);

  const toggleStageExpansion = (stageId: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag ended:', { active: active?.id, over: over?.id });
    
    if (!over) {
      console.log('No drop target');
      return;
    }
  
    const activeId = active.id.toString();
    const overId = over.id.toString();
    
    console.log('Active ID:', activeId, 'Over ID:', overId);
  
    // If dragged over a stage directly
    const isStageDrop = PIPELINE_STAGES.find(stage => stage.id === overId);
  
    if (isStageDrop) {
      console.log('Stage drop detected:', overId);
      onStageChange(activeId, overId as PipelineStage);
      return;
    }
  
    // Else, try to find the stage where the over lead belongs
    for (const stage of PIPELINE_STAGES) {
      const leadsInStage = leads.filter(lead => lead.stage === stage.id);
      if (leadsInStage.some(lead => lead.id === overId)) {
        console.log('Lead drop detected in stage:', stage.id);
        onStageChange(activeId, stage.id);
        return;
      }
    }
  
    console.log('No valid drop target found');
    // fallback: do nothing
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="grid grid-cols-1 gap-6">
        {PIPELINE_STAGES.map(stage => (
          <DroppableStage
            key={stage.id}
            id={stage.id}
            title={stage.title}
            leads={leadsByStage[stage.id] || []}
            isExpanded={expandedStages[stage.id]}
            onToggleExpand={() => toggleStageExpansion(stage.id)}
            onLeadSelect={onLeadSelect}
          />
        ))}
      </div>
    </DndContext>
  );
};

export default Pipeline;
