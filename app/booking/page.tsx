"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Users, 
  Mail, 
  Phone, 
  Building, 
  MapPin,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Video,
  Globe,
  User,
  CalendarDays,
  BarChart3
} from "lucide-react";
import { useBookingTranslations } from "@/hooks/use-booking-translations";
import AvailabilityManager from "@/components/booking/AvailabilityManager";
import toast from "react-hot-toast";
import { auth } from "@/lib/auth";

interface Booking {
  _id: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  clientName: string;
  position: string;
  memberCount: string;
  meetingPlatform: "zoom" | "meet" | "skype" | "teams";
  preferredDate: string;
  preferredTime: string;
  timezone: string;
  additionalNotes?: string;
  status: "pending" | "confirmed" | "rescheduled" | "completed" | "cancelled" | "no_show";
  meetingLink?: string;
  assignedTo?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

interface BookingStats {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  rescheduled: number;
  no_show: number;
}

const BookingManagement = () => {
  const { t } = useBookingTranslations();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    rescheduled: 0,
    no_show: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [confirmingBookings, setConfirmingBookings] = useState<Set<string>>(new Set());

  // Fetch bookings from API
  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Get current user ID
      const userId = await auth.getCurrentUserId();
      if (!userId) {
        toast.error('User authentication required. Please login again.');
        return;
      }
      
      const queryParams = new URLSearchParams();
      if (selectedStatus !== "all") queryParams.set("status", selectedStatus);
      if (searchQuery) queryParams.set("email", searchQuery);
      queryParams.set("userId", userId); // Filter by current user
      
      const response = await fetch(`/api/bookings?${queryParams.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.data.bookings);
        setStats(data.data.summary);
      } else {
        toast.error(t('failedToFetchBookings'));
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error(t('failedToFetchBookings'));
    } finally {
      setLoading(false);
    }
  };

  // Update booking status
  const updateBookingStatus = async (bookingId: string, newStatus: string, meetingLink?: string) => {
    // Add loading state for confirmation and completion
    if (newStatus === 'confirmed' || newStatus === 'completed') {
      setConfirmingBookings(prev => new Set(prev).add(bookingId));
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          meetingLink: meetingLink 
        }),
      });

      let data: any = null;
      try { data = await response.json(); } catch {}

      if (!response.ok) {
        const message = data?.error || t('failedToUpdateBooking');
        toast.error(message);
        return;
      }

      if (data?.success) {
        toast.success(t(`booking${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`));
        fetchBookings(); // Refresh the list
      } else {
        toast.error(data?.error || t('failedToUpdateBooking'));
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error(t('failedToUpdateBooking'));
    } finally {
      // Remove loading state
      if (newStatus === 'confirmed' || newStatus === 'completed') {
        setConfirmingBookings(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookingId);
          return newSet;
        });
      }
    }
  };

  // Delete booking
  const deleteBooking = async (bookingId: string) => {
    if (!confirm(t('confirmDeleteBooking'))) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('bookingDeleted'));
        fetchBookings(); // Refresh the list
      } else {
        toast.error(data.error || t('failedToDeleteBooking'));
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error(t('failedToDeleteBooking'));
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedStatus, searchQuery]);

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle };
      case 'confirmed':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle };
      case 'completed':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle };
      case 'rescheduled':
        return { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Calendar };
      case 'no_show':
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle };
    }
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'zoom':
        return '🔵';
      case 'meet':
        return '🟢';
      case 'skype':
        return '🔵';
      case 'teams':
        return '🟣';
      default:
        return '💻';
    }
  };

  // Filter bookings for upcoming meetings
  const upcomingBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.preferredDate);
    const today = new Date();
    return bookingDate >= today && ['pending', 'confirmed'].includes(booking.status);
  }).sort((a, b) => new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime());

  // Filter bookings for today
  const todaysBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.preferredDate);
    const today = new Date();
    return bookingDate.toDateString() === today.toDateString() && booking.status === 'confirmed';
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const totalBookings = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="animate-in">
      <SectionHeader
        title={t('bookingManagement')}
        description={t('bookingManagementDescription')}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchBookings}>
              <Calendar className="h-4 w-4 mr-2" />
              {t('refresh')}
            </Button>
          </div>
        }
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="bg-card hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalBookings')}</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('allTime')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pending')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('awaitingConfirmation')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('confirmed')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('readyToMeet')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('completed')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('finishedMeetings')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="upcoming">{t('upcoming')} ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="today">{t('today')} ({todaysBookings.length})</TabsTrigger>
          <TabsTrigger value="all">{t('allBookings')}</TabsTrigger>
          <TabsTrigger value="availability">{t('availability')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Upcoming Meetings */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('next5Meetings')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBookings.slice(0, 5).length > 0 ? (
                  <div className="space-y-3">
                    {upcomingBookings.slice(0, 5).map((booking) => {
                      const statusInfo = getStatusInfo(booking.status);
                      return (
                        <div key={booking._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{booking.companyName}</span>
                              <Badge className={`text-xs ${statusInfo.color}`}>
                                {booking.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(booking.preferredDate)} at {formatTime(booking.preferredTime)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getPlatformIcon(booking.meetingPlatform)} {booking.memberCount} attendees
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {booking.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                                disabled={confirmingBookings.has(booking._id)}
                              >
                                {confirmingBookings.has(booking._id) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                                    {t('confirming')}
                                  </>
                                ) : (
                                  t('confirm')
                                )}
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowBookingDetails(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                              {t('view')}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => deleteBooking(booking._id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              {t('delete')}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>{t('noUpcomingMeetings')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Schedule */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {t('todaysSchedule')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todaysBookings.length > 0 ? (
                  <div className="space-y-3">
                    {todaysBookings.map((booking) => (
                      <div key={booking._id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{booking.companyName}</div>
                          <div className="text-xs text-muted-foreground">
                            {booking.clientName} ({booking.position})
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(booking.preferredTime)} • {getPlatformIcon(booking.meetingPlatform)} {booking.meetingPlatform}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {booking.meetingLink && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer">
                                <Video className="h-3 w-3 mr-1" />
                                {t('join')}
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>{t('noMeetingsScheduledForToday')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                                  {t('recentBookings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bookings.slice(0, 5).map((booking) => {
                  const statusInfo = getStatusInfo(booking.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div key={booking._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{booking.companyName}</span>
                            <Badge className={`text-xs ${statusInfo.color}`}>
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {booking.clientName} • {formatDate(booking.preferredDate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-6 w-6"
                          onClick={() => deleteBooking(booking._id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="space-y-4">
            {upcomingBookings.map((booking) => {
              const statusInfo = getStatusInfo(booking.status);
              return (
                <Card key={booking._id} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{booking.companyName}</span>
                          <Badge className={`text-xs ${statusInfo.color}`}>
                            {booking.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {booking.clientName} ({booking.position})
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {booking.companyEmail}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {formatDate(booking.preferredDate)} at {formatTime(booking.preferredTime)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            {booking.memberCount} attendees • {getPlatformIcon(booking.meetingPlatform)} {booking.meetingPlatform}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {booking.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                            disabled={confirmingBookings.has(booking._id)}
                          >
                            {confirmingBookings.has(booking._id) ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Confirming...
                              </>
                            ) : (
                              'Confirm'
                            )}
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowBookingDetails(true);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteBooking(booking._id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="today" className="space-y-4">
          {todaysBookings.length > 0 ? (
            <div className="space-y-4">
              {todaysBookings.map((booking) => (
                <Card key={booking._id} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold">{booking.companyName}</span>
                          <span className="text-sm text-muted-foreground">
                            at {formatTime(booking.preferredTime)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {booking.clientName} ({booking.position})
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            {booking.memberCount} attendees
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {booking.meetingLink && (
                          <Button size="sm" asChild>
                            <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer">
                              <Video className="h-3 w-3 mr-1" />
                              Join Meeting
                            </a>
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateBookingStatus(booking._id, 'completed')}
                          disabled={confirmingBookings.has(booking._id)}
                        >
                          {confirmingBookings.has(booking._id) ? (
                                                          <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                                {t('updating')}
                              </>
                          ) : (
                            t('markComplete')
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteBooking(booking._id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No meetings today</h3>
                <p className="text-muted-foreground">You have a clear schedule for today!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search by email</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search bookings by email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Label htmlFor="status">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bookings List */}
          {loading ? (
            <Card className="bg-card">
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading bookings...</p>
              </CardContent>
            </Card>
          ) : bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <Card key={booking._id} className="bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <StatusIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{booking.companyName}</span>
                            <Badge className={`text-xs ${statusInfo.color}`}>
                              {booking.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-3 w-3" />
                                {booking.clientName}
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                {booking.companyEmail}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(booking.preferredDate)}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {formatTime(booking.preferredTime)}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="h-3 w-3" />
                                {booking.memberCount} attendees
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{getPlatformIcon(booking.meetingPlatform)}</span>
                                {booking.meetingPlatform}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowBookingDetails(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteBooking(booking._id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-card">
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <AvailabilityManager />
        </TabsContent>
      </Tabs>

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-semibold">Booking Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowBookingDetails(false)}>
                ×
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Company Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Company:</strong> {selectedBooking.companyName}</div>
                    <div><strong>Email:</strong> {selectedBooking.companyEmail}</div>
                    {selectedBooking.companyPhone && (
                      <div><strong>Phone:</strong> {selectedBooking.companyPhone}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Contact Person</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedBooking.clientName}</div>
                    <div><strong>Position:</strong> {selectedBooking.position}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Meeting Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Date:</strong> {formatDate(selectedBooking.preferredDate)}</div>
                    <div><strong>Time:</strong> {formatTime(selectedBooking.preferredTime)}</div>
                    <div><strong>Timezone:</strong> {selectedBooking.timezone}</div>
                    <div><strong>Platform:</strong> {getPlatformIcon(selectedBooking.meetingPlatform)} {selectedBooking.meetingPlatform}</div>
                    <div><strong>Attendees:</strong> {selectedBooking.memberCount}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Status & Tracking</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Status:</strong> 
                      <Badge className={`ml-2 text-xs ${getStatusInfo(selectedBooking.status).color}`}>
                        {selectedBooking.status}
                      </Badge>
                    </div>
                    <div><strong>Created:</strong> {new Date(selectedBooking.createdAt).toLocaleString()}</div>
                    <div><strong>Source:</strong> {selectedBooking.source}</div>
                  </div>
                </div>
              </div>
              
              {selectedBooking.additionalNotes && (
                <div>
                  <h3 className="font-semibold mb-3">Additional Notes</h3>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {selectedBooking.additionalNotes}
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                {selectedBooking.status === 'pending' && (
                  <Button 
                    onClick={() => {
                      updateBookingStatus(selectedBooking._id, 'confirmed');
                      setShowBookingDetails(false);
                    }}
                    disabled={confirmingBookings.has(selectedBooking._id)}
                  >
                    {confirmingBookings.has(selectedBooking._id) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Confirming...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                )}
                {selectedBooking.status === 'confirmed' && (
                  <Button 
                    onClick={() => {
                      updateBookingStatus(selectedBooking._id, 'completed');
                      setShowBookingDetails(false);
                    }}
                    disabled={confirmingBookings.has(selectedBooking._id)}
                  >
                    {confirmingBookings.has(selectedBooking._id) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      'Mark Complete'
                    )}
                  </Button>
                )}
                <Button variant="outline" onClick={() => {
                  updateBookingStatus(selectedBooking._id, 'cancelled');
                  setShowBookingDetails(false);
                }}>
                  Cancel Booking
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    deleteBooking(selectedBooking._id);
                    setShowBookingDetails(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;
