import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Globe, AlertCircle, CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";

interface AvailableSlot {
  time: string;
  nlTime: string;
  isAvailable: boolean;
}

interface AvailabilityResponse {
  success: boolean;
  data: {
    date: string;
    dayName: string;
    isAvailable: boolean;
    slots: string[];
    slotDuration: number;
    bufferTime: number;
    adminTimezone: string;
    clientTimezone: string;
    totalSlots: number;
    bookedSlots: number;
    message?: string;
  };
}

interface AvailableSlotsProps {
  selectedDate: string;
  clientTimezone: string;
  onSlotSelect: (slot: string, nlTime: string) => void;
  selectedSlot: string | null;
  adminId?: string;
}

const AvailableSlots: React.FC<AvailableSlotsProps> = ({
  selectedDate,
  clientTimezone,
  onSlotSelect,
  selectedSlot,
  adminId
}) => {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityResponse['data'] | null>(null);

  useEffect(() => {
    if (selectedDate && clientTimezone) {
      fetchAvailableSlots();
    }
  }, [selectedDate, clientTimezone, adminId]);

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({ date: selectedDate, timezone: clientTimezone });
      if (adminId) params.set('userId', adminId);
      const response = await fetch(`/api/availability/slots?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setAvailabilityData(data.data);
        setSlots(data.data.slots);
      } else {
        const fallback = {
          date: selectedDate,
          dayName: '',
          isAvailable: false,
          slots: [],
          slotDuration: 0,
          bufferTime: 0,
          adminTimezone: '',
          clientTimezone,
          totalSlots: 0,
          bookedSlots: 0,
          message: data?.error || 'No availability configured for this user',
        } as AvailabilityResponse['data'];
        setAvailabilityData(fallback);
        setSlots([]);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      const fallback = {
        date: selectedDate,
        dayName: '',
        isAvailable: false,
        slots: [],
        slotDuration: 0,
        bufferTime: 0,
        adminTimezone: '',
        clientTimezone,
        totalSlots: 0,
        bookedSlots: 0,
        message: 'Failed to fetch available slots',
      } as AvailabilityResponse['data'];
      setAvailabilityData(fallback);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const parseSlotTime = (slotString: string) => {
    // Parse format like "10:00 (09:00 NL time)"
    const match = slotString.match(/^(\d{2}:\d{2})\s+\((\d{2}:\d{2})\s+NL time\)$/);
    if (match) {
      return {
        clientTime: match[1],
        nlTime: match[2]
      };
    }
    return {
      clientTime: slotString,
      nlTime: slotString
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTimezoneDisplay = (timezone: string) => {
    if (timezone.startsWith('UTC')) {
      return timezone;
    }
    return timezone.replace('_', ' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Available Time Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!availabilityData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Available Time Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Please select a date to view available slots</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Available Time Slots
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(selectedDate)}
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Your timezone: {getTimezoneDisplay(clientTimezone)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!availabilityData.isAvailable ? (
          <div className="text-center py-12">
            <X className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No availability</h3>
            <p className="text-muted-foreground">
              {availabilityData.message || (
                availabilityData.dayName
                  ? `Admin is not available on ${availabilityData.dayName}. Please select a different date.`
                  : 'No availability configured for this user.'
              )}
            </p>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No available slots</h3>
            <p className="text-muted-foreground">
              All time slots are booked for this date. Please select a different date.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Slot Duration Info */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <div className="font-medium">Meeting Duration: {availabilityData.slotDuration} minutes</div>
                <div className="text-muted-foreground">
                  {availabilityData.totalSlots} slots available • {availabilityData.bookedSlots} already booked
                </div>
              </div>
              <Badge variant="secondary">
                {slots.length} available
              </Badge>
            </div>

            {/* Available Slots Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slots.map((slot, index) => {
                const { clientTime, nlTime } = parseSlotTime(slot);
                const isSelected = selectedSlot === slot;
                
                return (
                  <Button
                    type="button"
                    key={index}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-auto p-3 flex flex-col items-center justify-center space-y-1 ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => onSlotSelect(slot, nlTime)}
                  >
                    <div className="font-medium">{clientTime}</div>
                    <div className="text-xs opacity-75">
                      {nlTime} NL
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 mt-1" />
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Timezone Notice */}
            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    Timezone Information
                  </div>
                  <div className="text-blue-700 dark:text-blue-300 mt-1">
                    Times shown in your timezone ({getTimezoneDisplay(clientTimezone)}).
                    Admin works in Netherlands timezone ({availabilityData.adminTimezone}).
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailableSlots; 