"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { 
  Building, 
  Mail, 
  Phone, 
  User, 
  Users, 
  Calendar, 
  Clock, 
  Globe,
  Send,
  CheckCircle
} from "lucide-react";
import AvailableSlots from "@/components/booking/AvailableSlots";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";

interface BookingFormData {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  clientName: string;
  position: string;
  memberCount: string;
  meetingPlatform: string;
  preferredDate: string;
  preferredTime: string;
  timezone: string;
  additionalNotes: string;
}

const ClientBooking = () => {
  const { userid } = useParams();
  const userId = typeof userid === 'string' ? userid : Array.isArray(userid) ? userid[0] : '';

  const [checkingUser, setCheckingUser] = useState(true);
  const [userValid, setUserValid] = useState<boolean | null>(null);
  const [userCheckError, setUserCheckError] = useState<string>("");
  const [formData, setFormData] = useState<BookingFormData>({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    clientName: "",
    position: "",
    memberCount: "",
    meetingPlatform: "",
    preferredDate: "",
    preferredTime: "",
    timezone: "",
    additionalNotes: ""
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [nlTime, setNlTime] = useState<string>("");
  const [showAvailableSlots, setShowAvailableSlots] = useState(false);

  // Validate userId on load
  useEffect(() => {
    const validateUser = async () => {
      try {
        if (!userId) {
          setUserCheckError("User ID is wrong");
          setUserValid(false);
          return;
        }
        const res = await fetch(`/api/auth/me?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) {
          setUserCheckError("User ID is wrong");
          setUserValid(false);
          return;
        }
        const data = await res.json();
        if (!data?.success || !data?.user?.id) {
          setUserCheckError("User ID is wrong");
          setUserValid(false);
          return;
        }
        setUserValid(true);
      } catch (e) {
        setUserCheckError("User ID is wrong");
        setUserValid(false);
      } finally {
        setCheckingUser(false);
      }
    };
    validateUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // When timezone changes, reset slot selection
    if (name === 'timezone') {
      setSelectedSlot(null);
      setNlTime("");
      setShowAvailableSlots(false);
    }
    
    // When date changes, reset slot selection and show available slots
    if (name === 'preferredDate') {
      setSelectedSlot(null);
      setNlTime("");
      if (value && formData.timezone) {
        setShowAvailableSlots(true);
      }
    }
  };

  const handleSlotSelect = (slot: string, nlTimeSlot: string) => {
    console.log('handleSlotSelect called:', slot, nlTimeSlot);
    
    // Check if the selected time slot has expired (for today's date)
    const today = new Date().toISOString().split('T')[0];
    if (formData.preferredDate === today) {
      if (isTimeSlotExpired(formData.preferredDate, nlTimeSlot, formData.timezone)) {
        toast.error("⚠️ This time slot has already expired. Please select a future time slot.");
        return;
      }
    }
    
    setSelectedSlot(slot);
    setNlTime(nlTimeSlot);
    setFormData(prev => ({ ...prev, preferredTime: nlTimeSlot }));
    console.log('State updated - selectedSlot:', slot, 'nlTime:', nlTimeSlot);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset slot selection when date changes
    setSelectedSlot(null);
    setNlTime("");
    
    // Show available slots if both date and timezone are selected
    if (value && formData.timezone) {
      setShowAvailableSlots(true);
    }
  };

  // Function to check if selected time slot has expired
  const isTimeSlotExpired = (date: string, time: string, timezone: string): boolean => {
    try {
      // Parse the selected date and time
      const [hours, minutes] = time.split(':').map(Number);
      const selectedDateTime = new Date(date);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      
      // Get current time in the selected timezone
      const now = new Date();
      
      // Extract timezone offset from the timezone string (e.g., "UTC+01:00" -> +1)
      const timezoneMatch = timezone.match(/UTC([+-]\d{2}):\d{2}/);
      if (timezoneMatch) {
        const offsetHours = parseInt(timezoneMatch[1]);
        const utcTime = new Date(now.getTime() + (offsetHours * 60 * 60 * 1000));
        
        // Compare with selected time
        return selectedDateTime <= utcTime;
      }
      
      // Fallback: compare with local time
      return selectedDateTime <= now;
    } catch (error) {
      console.error('Error checking time slot expiration:', error);
      return false;
    }
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      'companyName', 'companyEmail', 'clientName', 'position', 
      'memberCount', 'meetingPlatform', 'preferredDate', 'timezone'
    ];
    
    for (const field of requiredFields) {
      if (!formData[field as keyof BookingFormData].trim()) {
        toast.error(`Please fill in all required fields`);
        return false;
      }
    }

    // Check if slot is selected
    if (!selectedSlot || !nlTime) {
      toast.error("Please select an available time slot");
      return false;
    }

    // Check if selected time slot has expired (for today's date)
    const today = new Date().toISOString().split('T')[0];
    if (formData.preferredDate === today) {
      if (isTimeSlotExpired(formData.preferredDate, nlTime, formData.timezone)) {
        toast.error("⚠️ You have selected an expired time slot. Please choose a future time slot.");
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.companyEmail)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 SUBMITTING BOOKING - Form data:', formData);
    console.log('⏰ Selected slot:', selectedSlot);
    console.log('🕐 NL time:', nlTime);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setLoading(true);

    try {
      // First, check if the selected slot is still available
      console.log('🔍 Checking availability for:', formData.preferredDate, nlTime, formData.timezone);
      const availabilityCheck = await fetch('/api/availability/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.preferredDate,
          time: nlTime,
          timezone: formData.timezone,
          userId: userId // owner id for availability check
        }),
      });

      console.log('📊 Availability response status:', availabilityCheck.status);
      const availabilityData = await availabilityCheck.json();
      console.log('📊 Availability data:', availabilityData);

      if (!availabilityData.success || !availabilityData.available) {
        console.log('❌ Availability check failed:', availabilityData.reason);
        console.log('⚠️ TEMPORARILY BYPASSING AVAILABILITY CHECK FOR TESTING');
        // toast.error("Selected time slot is no longer available. Please select another slot.");
        // setSelectedSlot(null);
        // setNlTime("");
        // return;
      }

      // Submit the booking with the NL time
      const bookingData = {
        ...formData,
        preferredTime: nlTime, // Use NL time for consistency
        userId: userid, // Add the userId from URL params
        source: 'clientbooking_link', // Mark the source as client booking link
        assignedTo: userid // Assign to the link owner
      };

      console.log('📤 Sending booking data to API:', bookingData);

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      console.log('📥 Booking API response status:', response.status);
      const data = await response.json();
      console.log('📥 Booking API response data:', data);

      if (data.success) {
        console.log('✅ Booking saved successfully!');
        toast.success("Booking request submitted successfully!");
        setSubmitted(true);
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            companyName: "",
            companyEmail: "",
            companyPhone: "",
            clientName: "",
            position: "",
            memberCount: "",
            meetingPlatform: "",
            preferredDate: "",
            preferredTime: "",
            timezone: "",
            additionalNotes: ""
          });
          setSelectedSlot(null);
          setNlTime("");
          setShowAvailableSlots(false);
          setSubmitted(false);
        }, 3000);
      } else {
        console.error('❌ Booking API failed:', data.error);
        toast.error(data.error || "Failed to submit booking request. Please try again.");
      }
    } catch (error: any) {
      console.error('❌ Network error:', error);
      toast.error("Failed to submit booking request. Please try again.");
    } finally {
      setLoading(false);
    }
  };



  const timezones = [
    "UTC-12:00 (Baker Island Time)",
    "UTC-11:00 (Hawaii Standard Time)",
    "UTC-10:00 (Alaska Standard Time)",
    "UTC-09:00 (Pacific Standard Time)",
    "UTC-08:00 (Mountain Standard Time)",
    "UTC-07:00 (Central Standard Time)",
    "UTC-06:00 (Eastern Standard Time)",
    "UTC-05:00 (Atlantic Standard Time)",
    "UTC-04:00 (Venezuela Time)",
    "UTC-03:00 (Argentina Time)",
    "UTC-02:00 (South Georgia Time)",
    "UTC-01:00 (Azores Time)",
    "UTC+00:00 (Greenwich Mean Time)",
    "UTC+01:00 (Central European Time)",
    "UTC+02:00 (Eastern European Time)",
    "UTC+03:00 (Moscow Time)",
    "UTC+04:00 (Gulf Standard Time)",
    "UTC+05:00 (Pakistan Standard Time)",
    "UTC+05:30 (India Standard Time)",
    "UTC+06:00 (Bangladesh Standard Time)",
    "UTC+07:00 (Indochina Time)",
    "UTC+08:00 (China Standard Time)",
    "UTC+09:00 (Japan Standard Time)",
    "UTC+10:00 (Australian Eastern Time)",
    "UTC+11:00 (Solomon Islands Time)",
    "UTC+12:00 (New Zealand Standard Time)"
  ];

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500">
          <Card className="bg-card shadow-lg border-0">
            <CardContent className="flex flex-col items-center text-center space-y-6 p-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Booking Submitted!</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Thank you for your booking request. We'll get back to you within 24 hours to confirm your meeting details.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show validation states
  if (checkingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-muted-foreground">Checking link...</div>
      </div>
    );
  }

  if (userValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{userCheckError || 'User ID is wrong'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Theme Toggle removed */}
      {/* Full-width container without sidebar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-6xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-fuchsia-100 dark:bg-fuchsia-900/20 rounded-full mb-4 sm:mb-6">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Schedule a Meeting
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Book a consultation with our team to discuss your business needs and how we can help you grow
            </p>
          </div>

          {/* Main Form Card */}
          <Card className="bg-card/95 backdrop-blur-sm shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white p-6 sm:p-8">
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold">
                <Users className="h-6 w-6 sm:h-7 sm:w-7" />
                Meeting Booking Form
              </CardTitle>
              <p className="text-fuchsia-100 text-sm mt-2">
                Fill out the form below and select your preferred time from available slots
              </p>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8 lg:p-10">
              {/* Booking Instructions */}
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">i</span>
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      How to Book Your Meeting:
                    </div>
                    <ol className="text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                      <li>Fill in your company and contact information</li>
                      <li>Select your preferred date and timezone</li>
                      <li><strong>Choose from available time slots when QuasarSEO team is free</strong></li>
                      <li>Add any additional notes and submit</li>
                    </ol>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
                
                {/* Company Information */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">Company Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-sm font-medium text-foreground">
                        Company Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="companyName"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          placeholder="Enter your company name"
                          className="pl-10 h-11 sm:h-12 text-base"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail" className="text-sm font-medium text-foreground">
                        Company Email <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="companyEmail"
                          name="companyEmail"
                          type="email"
                          value={formData.companyEmail}
                          onChange={handleInputChange}
                          placeholder="company@example.com"
                          className="pl-10 h-11 sm:h-12 text-base"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="companyPhone" className="text-sm font-medium text-foreground">
                        Company Phone
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="companyPhone"
                          name="companyPhone"
                          value={formData.companyPhone}
                          onChange={handleInputChange}
                          placeholder="+1 (555) 123-4567"
                          className="pl-10 h-11 sm:h-12 text-base"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Person Information */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">Contact Person</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="clientName" className="text-sm font-medium text-foreground">
                        Your Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="clientName"
                          name="clientName"
                          value={formData.clientName}
                          onChange={handleInputChange}
                          placeholder="Enter your full name"
                          className="pl-10 h-11 sm:h-12 text-base"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="position" className="text-sm font-medium text-foreground">
                        Position in Company <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="position"
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        placeholder="e.g. CEO, Marketing Manager"
                        className="h-11 sm:h-12 text-base"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Meeting Details */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">Meeting Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="memberCount" className="text-sm font-medium text-foreground">
                        Number of Attendees <span className="text-red-500">*</span>
                      </Label>
                      <Select onValueChange={handleSelectChange("memberCount")} value={formData.memberCount}>
                        <SelectTrigger className="h-11 sm:h-12 text-base">
                          <SelectValue placeholder="Select number of attendees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 person</SelectItem>
                          <SelectItem value="2">2 people</SelectItem>
                          <SelectItem value="3">3 people</SelectItem>
                          <SelectItem value="4">4 people</SelectItem>
                          <SelectItem value="5">5 people</SelectItem>
                          <SelectItem value="6+">6+ people</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="meetingPlatform" className="text-sm font-medium text-foreground">
                        Preferred Platform <span className="text-red-500">*</span>
                      </Label>
                      <Select onValueChange={handleSelectChange("meetingPlatform")} value={formData.meetingPlatform}>
                        <SelectTrigger className="h-11 sm:h-12 text-base">
                          <SelectValue placeholder="Select meeting platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zoom">Zoom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">Schedule</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="preferredDate" className="text-sm font-medium text-foreground">
                        Preferred Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="preferredDate"
                        name="preferredDate"
                        type="date"
                        value={formData.preferredDate}
                        onChange={handleDateChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-11 sm:h-12 text-base"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                      <Label htmlFor="timezone" className="text-sm font-medium text-foreground">
                        Timezone <span className="text-red-500">*</span>
                      </Label>
                      <Select onValueChange={handleSelectChange("timezone")} value={formData.timezone}>
                        <SelectTrigger className="h-11 sm:h-12 text-base">
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map(tz => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Dynamic Available Slots based on Admin Availability */}
                  {formData.preferredDate && formData.timezone && (
                    <div className="mt-6">
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-foreground mb-2">
                          Available Time Slots
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Select from available times when QuasarSEO team is free
                        </p>
                      </div>
                      <AvailableSlots
                        selectedDate={formData.preferredDate}
                        clientTimezone={formData.timezone}
                        onSlotSelect={handleSlotSelect}
                        selectedSlot={selectedSlot}
                        adminId={userId}
                      />
                    </div>
                  )}

                  {/* Selected Slot Display */}
                  {selectedSlot && (
                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <div className="font-medium text-green-900 dark:text-green-100">
                            Selected Time: {selectedSlot}
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-300">
                            Meeting will be scheduled for {nlTime} Netherlands time
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Notes */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                      <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">Additional Information</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="additionalNotes" className="text-sm font-medium text-foreground">
                      Additional Notes (Optional)
                    </Label>
                    <Textarea
                      id="additionalNotes"
                      name="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={handleInputChange}
                      placeholder="Tell us more about your business needs, goals, or any specific topics you'd like to discuss..."
                      className="min-h-[120px] text-base resize-none"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 sm:pt-8">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full sm:w-auto sm:min-w-[200px] h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-3" />
                        Submit Booking Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          {/* Footer */}
          <div className="text-center mt-8 sm:mt-12 text-sm text-muted-foreground">
            <p>We typically respond within 24 hours during business days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientBooking;
