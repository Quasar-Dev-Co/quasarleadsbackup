import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Settings, Plus, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { auth } from "@/lib/auth";

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  day: string;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

interface AvailabilityData {
  _id?: string;
  userId: string;
  workingDays: DayAvailability[];
  timezone: string;
  slotDuration: number;
  bufferTime: number;
  isActive: boolean;
}

const AvailabilityManager: React.FC = () => {
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dayNames = [
    'monday', 'tuesday', 'wednesday', 'thursday', 
    'friday', 'saturday', 'sunday'
  ];

  const dayDisplayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  // Load availability data
  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      // Load for current user
      const userId = await auth.getCurrentUserId?.();
      const url = userId ? `/api/availability?adminId=${userId}` : '/api/availability';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setAvailability(data.data);
      } else {
        toast.error('Failed to load availability settings');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayName: string) => {
    if (!availability) return;
    
    const updatedWorkingDays = availability.workingDays.map(day => 
      day.day === dayName 
        ? { ...day, isAvailable: !day.isAvailable }
        : day
    );
    
    setAvailability({
      ...availability,
      workingDays: updatedWorkingDays
    });
  };

  const handleTimeSlotChange = (dayName: string, slotIndex: number, field: 'start' | 'end', value: string) => {
    if (!availability) return;
    
    const updatedWorkingDays = availability.workingDays.map(day => 
      day.day === dayName 
        ? {
            ...day,
            timeSlots: day.timeSlots.map((slot, index) => 
              index === slotIndex 
                ? { ...slot, [field]: value }
                : slot
            )
          }
        : day
    );
    
    setAvailability({
      ...availability,
      workingDays: updatedWorkingDays
    });
  };

  const addTimeSlot = (dayName: string) => {
    if (!availability) return;
    
    const updatedWorkingDays = availability.workingDays.map(day => 
      day.day === dayName 
        ? {
            ...day,
            timeSlots: [...day.timeSlots, { start: '09:00', end: '17:00' }]
          }
        : day
    );
    
    setAvailability({
      ...availability,
      workingDays: updatedWorkingDays
    });
  };

  const removeTimeSlot = (dayName: string, slotIndex: number) => {
    if (!availability) return;
    
    const updatedWorkingDays = availability.workingDays.map(day => 
      day.day === dayName 
        ? {
            ...day,
            timeSlots: day.timeSlots.filter((_, index) => index !== slotIndex)
          }
        : day
    );
    
    setAvailability({
      ...availability,
      workingDays: updatedWorkingDays
    });
  };

  const handleSlotDurationChange = (value: string) => {
    if (!availability) return;
    
    const duration = parseInt(value);
    if (duration >= 15 && duration <= 120) {
      setAvailability({
        ...availability,
        slotDuration: duration
      });
    }
  };

  const handleBufferTimeChange = (value: string) => {
    if (!availability) return;
    
    const buffer = parseInt(value);
    if (buffer >= 0 && buffer <= 60) {
      setAvailability({
        ...availability,
        bufferTime: buffer
      });
    }
  };

  const saveAvailability = async () => {
    if (!availability) return;
    
    try {
      setSaving(true);
      const userId = await auth.getCurrentUserId?.();
      const body = userId ? { ...availability, adminId: userId } : availability;
      const response = await fetch('/api/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Availability settings saved successfully');
        setAvailability(data.data);
      } else {
        toast.error(data.error || 'Failed to save availability settings');
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Availability Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!availability) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Availability Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load availability settings</p>
            <Button onClick={fetchAvailability} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Availability Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure your working days and hours (Netherlands timezone)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* General Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
            <Input
              id="slotDuration"
              type="number"
              min="15"
              max="120"
              value={availability.slotDuration}
              onChange={(e) => handleSlotDurationChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bufferTime">Buffer Time (minutes)</Label>
            <Input
              id="bufferTime"
              type="number"
              min="0"
              max="60"
              value={availability.bufferTime}
              onChange={(e) => handleBufferTimeChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <Separator />

        {/* Working Days */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Working Days</h3>
          
          {dayNames.map((dayName) => {
            const dayData = availability.workingDays.find(d => d.day === dayName);
            if (!dayData) return null;
            
            return (
              <div key={dayName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={dayData.isAvailable}
                      onCheckedChange={() => handleDayToggle(dayName)}
                    />
                    <Label className="text-base font-medium">
                      {dayDisplayNames[dayName as keyof typeof dayDisplayNames]}
                    </Label>
                    {dayData.isAvailable && (
                      <Badge variant="secondary" className="ml-2">
                        {dayData.timeSlots.length} slot{dayData.timeSlots.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  
                  {dayData.isAvailable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeSlot(dayName)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Slot
                    </Button>
                  )}
                </div>
                
                {dayData.isAvailable && (
                  <div className="space-y-3">
                    {dayData.timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-3 bg-muted/50 p-3 rounded">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={slot.start}
                            onChange={(e) => handleTimeSlotChange(dayName, index, 'start', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={slot.end}
                            onChange={(e) => handleTimeSlotChange(dayName, index, 'end', e.target.value)}
                            className="w-32"
                          />
                        </div>
                        {dayData.timeSlots.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTimeSlot(dayName, index)}
                            className="ml-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {dayData.timeSlots.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No time slots configured for this day
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={saveAvailability} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailabilityManager; 