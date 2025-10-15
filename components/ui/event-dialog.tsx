"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarEvent } from "@/components/CalendarComponent";
import { Plus, Calendar, Clock, Users, Mail, Phone } from "lucide-react";

interface EventDialogProps {
  children: React.ReactNode;
  onEventCreate: (event: Omit<CalendarEvent, 'id'>) => void;
  selectedDate?: Date;
}

export function EventDialog({ children, onEventCreate, selectedDate }: EventDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "meeting",
    date: selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    startTime: "09:00",
    endTime: "10:00",
    participants: "",
    client: "",
    email: "",
    platform: "zoom",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventDate = new Date(formData.date);
    const participants = formData.participants
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => p.split(' ').map(n => n[0]).join('').toUpperCase());

    const newEvent: Omit<CalendarEvent, 'id'> = {
      title: formData.title,
      date: eventDate,
      time: `${formData.startTime} - ${formData.endTime}`,
      type: formData.type,
      participants: participants.length > 0 ? participants : ['ME'],
      client: formData.client || undefined,
      email: formData.email || undefined,
      platform: formData.platform || undefined,
    };

    onEventCreate(newEvent);
    setOpen(false);
    
    // Reset form
    setFormData({
      title: "",
      type: "meeting",
      date: selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      startTime: "09:00",
      endTime: "10:00",
      participants: "",
      client: "",
      email: "",
      platform: "zoom",
      notes: "",
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-fuchsia-600" />
            Schedule New Event
          </DialogTitle>
          <DialogDescription>
            Create a new event in your calendar. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Event Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Meeting with Acme Corp"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Event Type *</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Meeting
                    </div>
                  </SelectItem>
                  <SelectItem value="call">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Call
                    </div>
                  </SelectItem>
                  <SelectItem value="task">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Task
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Client Information */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="client">Client/Contact Name</Label>
                <Input
                  id="client"
                  placeholder="e.g., John Smith"
                  value={formData.client}
                  onChange={(e) => handleChange('client', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., john@company.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Meeting Platform */}
            <div className="space-y-2">
              <Label htmlFor="platform">Meeting Platform</Label>
              <Select value={formData.platform} onValueChange={(value) => handleChange('platform', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="meet">Google Meet</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="skype">Skype</SelectItem>
                  <SelectItem value="in-person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <Label htmlFor="participants">Participants</Label>
              <Input
                id="participants"
                placeholder="e.g., John Smith, Sarah Johnson (comma-separated)"
                value={formData.participants}
                onChange={(e) => handleChange('participants', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter participant names separated by commas. Initials will be generated automatically.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information about this event..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 